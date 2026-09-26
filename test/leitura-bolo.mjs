/* Q1/Q3 · A LEITURA NO BOLO (ST-12.9 · F2.7 · Spec §6.9)
 *
 * "Onde o jogador discordou do modelo e quem estava certo" — e, com o bolo,
 * também da multidão. A regra de honestidade é o que se testa aqui: os três
 * desfechos de cada discordância com o mesmo peso, e o n sempre.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { lerLeitura } from '../engine/leitura-bolo.mjs';
import { textoDaLeitura } from '../app/modules/bolo-dados.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { ESTADOS } from '../server/scheduler.mjs';
import { cadastrar } from '../server/auth.mjs';
import { creditar } from '../server/carteira.mjs';
import { entrarNoMercado, leituraNoBolo } from '../server/mercado.mjs';

const linha = (minha, totais, modelo, vencedoras) => ({ minha, totais, modelo, vencedoras });

export async function suite() {
  const s = criarSuite('leitura-bolo');

  s.teste('contra o bolo e contra o modelo, com os três desfechos', () => {
    const l = lerLeitura([
      linha(0, [0, 500, 10], [50, 900, 50], [0]),     // contra os dois, e EU acertei
      linha(2, [0, 500, 10], [50, 900, 50], [1]),     // contra os dois, e eles acertaram
      linha(2, [0, 500, 10], [50, 900, 50], [0]),     // contra os dois, e ninguém
      linha(1, [0, 500, 10], [50, 900, 50], [1]),     // COM os dois: não é discordância
    ]);
    igual(l.n, 4, 'n');
    igual(l.acertos, 2, 'acertos');
    igual(JSON.stringify(l.contraBolo), JSON.stringify({ n: 3, eu: 1, outro: 1, ninguem: 1 }), 'contra o bolo');
    igual(JSON.stringify(l.contraModelo), JSON.stringify({ n: 3, eu: 1, outro: 1, ninguem: 1 }), 'contra o modelo');
  });

  s.teste('empate no favorito não é discordância; empate no topo de abates acerta os dois lados', () => {
    const l = lerLeitura([
      linha(0, [0, 300, 300], [10, 500, 500], [1]),   // bolo e modelo empatados: nada conta
      linha(0, [0, 300, 10], [10, 20, 500], [0, 1]),  // empate no topo: eu E o bolo acertamos
    ]);
    igual(l.contraBolo.n, 1, 'empate do bolo contou como discordância');
    igual(l.contraBolo.eu + l.contraBolo.outro, 2, 'no empate do topo, os dois lados acertaram');
    igual(l.contraBolo.ninguem, 0, 'ninguém');
    igual(lerLeitura([linha(0, [0, 0, 0], null, [0])]).contraBolo.n, 0, 'bolo sem outros contou como favorito');
    igual(lerLeitura([linha(0, [0, 50], null, [1])]).contraModelo.n, 0, 'sem preço do modelo, inventou favorito');
  });

  s.teste('o texto dá os três desfechos com o mesmo peso, e o n', () => {
    const t = textoDaLeitura({ n: 7, acertos: 2, contraBolo: { n: 5, eu: 1, outro: 3, ninguem: 1 },
                               contraModelo: { n: 0, eu: 0, outro: 0, ninguem: 0 } }).join(' ');
    ok(/Em 7 bolos pagos, você acertou 2/.test(t), t);
    ok(/Contra o bolo: 5 vezes — você acertou 1 · o bolo acertou 3 · ninguém 1/.test(t), t);
    ok(/ainda não foi contra o modelo/.test(t), t);
    ok(/Amostra pequena/.test(t), 'n = 7 sem aviso de amostra pequena');
    ok(!/Amostra pequena/.test(textoDaLeitura({ n: 12, acertos: 4, contraBolo: { n: 0 }, contraModelo: { n: 0 } }).join(' ')),
      'n = 12 ainda diz amostra pequena');
    ok(/ainda não tem bolo pago/.test(textoDaLeitura({ n: 0 })[0]), 'sem bolo, texto vazio');
  });

  s.teste('no servidor: só bolos pagos, o bolo dos OUTROS, o modelo carimbado', async () => {
    let t = Date.UTC(2026, 8, 1, 15);
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40,
                                laco: false, relogio: () => t });
    try {
      const us = Array.from({ length: 4 }, (_, i) => {
        const id = cadastrar(srv.db, { username: `l${i}`, email: `l${i}@x.test`, senha: 'senha-longa-o-bastante-1',
                                       nascimento: '1990-01-01', agora: t }).id;
        creditar(srv.db, { userId: id, tipo: 'WELCOME_GRANT', bucket: 'transferivel', valor: 100000, idem: `w${id}`, agora: t });
        return id;
      });
      const [eu, ...outros] = us;
      for (let k = 0; k < 6; k++) {
        srv.sched.abrirRodada();
        entrarNoMercado(srv.db, { sched: srv.sched, userId: eu, selecao: 0, valor: 5000, agora: t });
        outros.forEach((u, i) => entrarNoMercado(srv.db, { sched: srv.sched, userId: u, selecao: 1 + (i % 2), valor: 100, agora: t }));
        if (k < 5) {
          for (let i = 0; i < 200 && srv.sched.rodadaAtual().status !== ESTADOS.ENCERRADA; i++) { t += 1000; srv.sched.tick(); }
          srv.laco.passo();
        }
      }
      const l = leituraNoBolo(srv.db, { userId: eu });
      igual(l.n, 5, 'o bolo em curso entrou na leitura');
      /* Eu pus 5.000 no slot 0; os outros, 200 no slot 1 e 100 no 2. Sem a
         minha entrada, a multidão está no 1 — e eu estou CONTRA ela nas cinco.
         Se a minha entrada contasse, o slot 0 seria o "favorito" e eu nunca
         estaria contra ele. */
      igual(l.contraBolo.n, 5, 'o favorito do bolo usou a minha própria entrada');
      ok(l.contraModelo.n >= 0 && l.contraModelo.eu + l.contraModelo.outro + l.contraModelo.ninguem >= l.contraModelo.n,
        'desfechos do modelo não fecham com o n');
      const deles = leituraNoBolo(srv.db, { userId: outros[0] });
      igual(deles.n, 5, 'a leitura de outro jogador');
      igual(deles.contraBolo.n, 5, 'contra o bolo (os 5.000 no slot 0) não contou para quem estava no slot 1');
    } finally { await srv.fechar(); }
  });

  return s;
}
