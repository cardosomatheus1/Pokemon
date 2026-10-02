/* Q1/Q3 · O COMEÇO DO TREINADOR: O KIT, AS BARRAS QUE SE MEXEM, A STAMINA QUE VOLTA (ST-2.12)
 *
 * Três perguntas do dono, pelo telefone, na aba das Rotas:
 *
 *   "onde vejo meus itens? devia começar com pokébolas, não?"
 *        -> a bolsa nascia VAZIA; a bola da run é a única decisão que pede bola
 *   "onde tem barra de XP do pokémon?" e "a stamina reduz quando? tá funcionando?"
 *        -> a run só cobra a stamina e só paga o XP na colheita; durante a luta
 *           as duas ficavam paradas. Agora a tela mostra o que a colheita grava.
 *   "cuidado pra não ser muito lenta essa regeneração"
 *        -> 8/h virou 20/h (DEC-24)
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { escolherInicial, garantirKitInicial, FONTE_DO_KIT, lancarPendente } from '../server/idle.mjs';
import { creditarBolsa } from '../server/inventario.mjs';
import { chanceDe } from '../engine/captura.mjs';
import { colecaoDe } from '../server/colecao-rotas.mjs';
import { VAZIO, escolherInicial as escolherNoAparelho } from '../app/modules/idle-dados.mjs';
import { staminaNaRun, xpNaRun, textoDoXp } from '../app/modules/avanco-barras.mjs';
import { REGEN_POR_HORA, staminaAgora } from '../engine/expedicao.mjs';
import { staminaAteWave, STAMINA_DO_AVANCO } from '../engine/avanco.mjs';
import { xpParaNivel } from '../engine/nivel-criatura.mjs';
import { resumoDaBolsa } from '../app/modules/bolsa-resumo.mjs';

const AGORA = Date.UTC(2026, 9, 1, 12);
const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
let n = 0;
function conta() {
  const db = abrirBanco(':memory:'); migrar(db);
  n += 1;
  const uid = cadastrar(db, { username: 'Kit' + n, email: `kit${n}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA }).id;
  return { db, uid };
}
const lotes = (k, item) => k.db.prepare(`SELECT quantidade, classe, fonte FROM bolsa_lotes WHERE user_id = ? AND item_id = ?`).all(k.uid, item);

export async function suite() {
  const s = criarSuite('comeco-treinador');

  s.teste('o kit é conteúdo: bolas e poção que o pack conhece', () => {
    const kit = PACK.kitInicial ?? {};
    ok((kit.poke ?? 0) >= 6, 'o kit não cobre as seis espécies de uma run');
    ok((kit.pocao ?? 0) >= 1, 'o kit veio sem poção');
    ok((PACK.bolas ?? []).some(b => b.id === 'poke'), 'a bola do kit não existe no pack');
    ok((PACK.catalogo ?? []).some(i => i.id === 'pocao' && i.cura > 0), 'a poção do kit não cura');
  });

  s.teste('servidor: escolher a inicial dá o kit, uma vez, como presente que não troca', () => {
    const k = conta();
    escolherInicial(k.db, { userId: k.uid, pack: PACK, dex: 4 });
    /* direto no banco, ANTES da leitura: a leitura também garante o kit (para as
       contas antigas), e lendo por ela o teste não saberia quem deu */
    igual(lotes(k, 'poke').length, 1, 'escolher a inicial não deu o kit — só a leitura deu');
    const bolsa = colecaoDe(k.db, { userId: k.uid, agora: AGORA }).bolsa;
    igual(bolsa.poke, PACK.kitInicial.poke, 'as bolas do kit não chegaram');
    igual(bolsa.pocao, PACK.kitInicial.pocao, 'as poções do kit não chegaram');
    const l = lotes(k, 'poke');
    igual(l.length, 1, 'o kit entrou em mais de um lote');
    igual(`${l[0].classe}|${l[0].fonte}`, `promotional_bound|${FONTE_DO_KIT}`, 'o kit não é presente marcado');
    /* a leitura de novo, e a garantia de novo: nada dobra */
    colecaoDe(k.db, { userId: k.uid, agora: AGORA + 1000 });
    igual(garantirKitInicial(k.db, { userId: k.uid, pack: PACK, agora: AGORA }), false, 'o kit saiu duas vezes');
    igual(colecaoDe(k.db, { userId: k.uid, agora: AGORA }).bolsa.poke, PACK.kitInicial.poke, 'o kit dobrou na leitura');
  });

  s.teste('servidor: a conta que já tinha inicial recebe o kit na leitura; a sem inicial, não', () => {
    const velha = conta();
    gerar(velha.db, { userId: velha.uid, pack: PACK, dex: 1, origem: 'inicial' });   // como antes do kit
    igual(lotes(velha, 'poke').length, 0, 'a conta antiga já tinha o kit');
    igual(colecaoDe(velha.db, { userId: velha.uid, agora: AGORA }).bolsa.poke, PACK.kitInicial.poke, 'a conta antiga ficou sem o kit');
    const nova = conta();
    igual(garantirKitInicial(nova.db, { userId: nova.uid, pack: PACK }), false, 'quem ainda não escolheu a inicial ganhou o kit');
    igual(lotes(nova, 'poke').length, 0, 'o kit saiu antes da inicial');
  });

  s.teste('no aparelho sem conta, a inicial também traz o kit', () => {
    const e = VAZIO();
    escolherNoAparelho(e, PACK, 7, AGORA, 'kit-aparelho');
    igual(e.bolsa.poke, PACK.kitInicial.poke, 'o aparelho ficou sem as bolas do kit');
    igual(e.bolsa.pocao, PACK.kitInicial.pocao, 'o aparelho ficou sem as poções do kit');
  });

  s.teste('a stamina da run: a de agora menos o que as waves já custaram — o mesmo que a colheita cobra', () => {
    igual(staminaNaRun(100, staminaAteWave(1)), 100 - staminaAteWave(1), 'a wave 1 não desconta');
    igual(staminaNaRun(100, staminaAteWave(3)), 100 - staminaAteWave(3), 'a wave 3 não desconta');
    igual(staminaNaRun(10, STAMINA_DO_AVANCO), 0, 'a stamina ficou negativa');
    igual(staminaNaRun(99.6, 0), 100, 'o arredondamento mudou');
    const painel = fonte('../app/modules/avanco-painel.mjs'), dir = fonte('../app/modules/avanco-direita.mjs');
    ok(/const s = staminaNaRun\(staminaAgora\(c, agora\), custo\);/.test(painel), 'o painel da stamina voltou a ficar parado em 100 na run');
    ok(/const s = staminaNaRun\(staminaAgora\(c, agora\), staminaAteWave\(run\.wave\)\);/.test(dir), 'a vaga da equipe voltou a ficar parada em 100 na run');
  });

  s.teste('o XP da run: o da criatura mais o que a run já rendeu, com a linha que diz quanto falta', () => {
    const p = xpNaRun(0, 14);
    igual(`${p.nivel}|${p.ganho}|${p.subiu}`, '1|14|0', 'o XP da run não somou');
    igual(textoDoXp(p), `+14 XP nesta run · faltam ${xpParaNivel(2) - 14} para o nv 2`, 'a linha do XP mudou');
    const sobe = xpNaRun(xpParaNivel(2) - 1, 5);
    igual(`${sobe.nivel}|${sobe.subiu}`, '2|1', 'subir de nível na run não aparece');
    ok(/▲ nv 2/.test(textoDoXp(sobe)), 'a linha não diz que subiu');
    igual(textoDoXp(xpNaRun(0, 0)).startsWith('sem XP ainda nesta run'), true, 'a run sem XP mente');
    const dir = fonte('../app/modules/avanco-direita.mjs');
    ok(/const px = xpNaRun\(c\.xp, ganho\);/.test(dir), 'a vaga não usa o XP da run');
    ok(/const ganho = ganhoDaRun\(\{ abates, encontros: \(run\.apareceram \?\? \[\]\)\.length, perfil: PERFIL_DO_AVANCO \}\)\.xp;/.test(dir), 'o XP da vaga não é o mesmo do "XP até aqui"');
    ok(/class="avBarra avXpBarra"/.test(dir), 'a barra de XP sumiu da vaga');
  });

  /* DEC-29 (o dono, 02/10): "ainda não sei se tá bom, suba um pouco mais essa
     stamina, bote 30/h". Era 20 (DEC-24). */
  s.teste('a regeneração é 30/h (DEC-29), e a tela diz o número que o motor usa', () => {
    igual(REGEN_POR_HORA, 30, 'a regeneração mudou sem decisão');
    igual(staminaAgora({ stamina: 67, staminaEm: AGORA }, AGORA + 3600_000), 97, 'uma hora não devolveu 30');
    igual(staminaAgora({ stamina: 77, staminaEm: AGORA }, AGORA + 3600_000), 100, 'a regeneração passou do teto');
    const pag = fonte('../app/index.html');
    ok(pag.includes(`<h3>Stamina da equipe <span class="tiny">regenera ${REGEN_POR_HORA}/h</span></h3>`), 'o rótulo da tela diz outro ritmo');
  });


  s.teste('a linha da bolsa embaixo da cena: bolas e curas primeiro, e leva ao cartão', () => {
    const rot = id => ({ poke: 'Poké Ball', pocao: 'Poção', fogo: 'Pedra do Fogo', moeda: 'moeda' })[id] ?? id;
    const r = resumoDaBolsa([{ id: 'fogo', quantidade: 1 }, { id: 'pocao', quantidade: 3 }, { id: 'poke', quantidade: 10 }, { id: 'moeda', quantidade: 50 }],
      { rotulo: rot, primeiro: ['poke', 'pocao'] });
    igual(r.texto, '🎒 na bolsa: 10 Poké Ball · 3 Poção · 1 Pedra do Fogo · +1 outro item — ver tudo ↓', 'a ordem ou o texto da linha mudou');
    igual(resumoDaBolsa([], {}).vazia, true, 'a bolsa vazia não diz que está vazia');
    ok(/Loja/.test(resumoDaBolsa([{ id: 'x', quantidade: 0 }]).texto), 'a bolsa vazia não aponta a loja');
    const pag = fonte('../app/index.html'), tela = fonte('../app/modules/avanco-tela.mjs'), pain = fonte('../app/modules/idle-paineis.mjs');
    ok(/<button type="button" class="idleBolsaAtalho" id="idleBolsaAtalho" hidden><\/button>/.test(pag), 'a linha da bolsa sumiu de baixo da cena');
    ok(/atalho\.textContent = r\.texto;/.test(pain), 'a linha da bolsa não é pintada');
    ok(/if \(ev\.target\.closest\('#idleBolsaAtalho'\)\) \{\n      \$\('#idleBolsa'\)\?\.closest\('\.card'\)\?\.scrollIntoView/.test(tela), 'a linha não leva ao cartão da bolsa');
  });


  /* O dono: "todos os pokémons estão sendo capturados de primeira, pode checar
     se a porcentagem de captura tá funcionando?". Medido pelo CAMINHO INTEIRO
     do servidor — o encontro pendente, a bola debitada, o sorteio, a criatura
     criada —, com raízes FIXAS (sem acaso no teste): 300 lances por par
     raridade × bola, e a taxa tem de cair perto da chance que a tela mostra. */
  s.teste('a captura pelo servidor acerta a chance — não pega tudo, não nega tudo', () => {
    const k = conta();
    escolherInicial(k.db, { userId: k.uid, pack: PACK, dex: 4 });
    creditarBolsa(k.db, k.uid, 'poke', 700, { agora: AGORA });
    creditarBolsa(k.db, k.uid, 'great', 400, { agora: AGORA });
    let n = 0;
    for (const [raridade, bola] of [['comum', 'poke'], ['incomum', 'poke'], ['comum', 'great']]) {
      const N = 300; let pegou = 0;
      for (let i = 0; i < N; i++, n++) {
        k.db.prepare(`INSERT INTO encontros_pendentes (chave, user_id, origem, dex, raridade, bioma, em) VALUES (?, ?, 'avanco', 16, ?, 'floresta', ?)`)
          .run('cap' + n, k.uid, raridade, AGORA);
        if (lancarPendente(k.db, { userId: k.uid, pack: PACK, chave: 'cap' + n, bola, agora: AGORA + n, raiz: 'teste-captura-' + n }).capturou) pegou++;
      }
      const chance = chanceDe(PACK, { raridade, bola }), taxa = pegou / N;
      ok(chance > 0 && chance < 1, `a chance de ${raridade} com ${bola} saiu dos limites: ${chance}`);
      ok(Math.abs(taxa - chance) < 0.09, `${raridade} com ${bola}: capturou ${pegou} de ${N} (${(taxa * 100).toFixed(1)}%) para uma chance de ${(chance * 100).toFixed(1)}%`);
    }
  });

  return s;
}
