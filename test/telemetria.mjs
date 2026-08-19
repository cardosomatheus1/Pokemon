/* Q9 · TELEMETRIA — os 14 eventos do §4.7, e os campos que os fazem valer.
 *
 * O §P7 da Spec só considera uma versão entregue quando *"funcionalidade
 * existe; telemetria existe"*. Deixar a telemetria para o backend fecharia a
 * v0.9 sem ela — e descobriríamos em F1.11 que metade dos eventos não tinha
 * onde nascer.
 *
 * O que estes testes cobram não é "o evento foi emitido": é que ele saia
 * COMPLETO. Evento sem `rodada` ou sem versão de motor não responde nenhuma
 * pergunta três meses depois, e ninguém percebe até precisar da resposta.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { CAMPOS_COMUNS, EVENTOS as DECLARADOS, emitir, eventos, limpar } from '../app/modules/telemetria.mjs';

const MODULOS = new URL('../app/modules/', import.meta.url);
const APP = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');

/* Lidos da fonte, não redigitados: uma lista copiada aqui envelheceria em
   silêncio no dia em que a de lá mudasse. */
const fonte = readFileSync(new URL('telemetria.mjs', MODULOS), 'utf8');
const EVENTOS = (fonte.match(/export const EVENTOS = \[([\s\S]*?)\];/)[1]
  .match(/'([\w_]+)'/g) || []).map(x => x.slice(1, -1));
const CAMPOS = (fonte.match(/export const CAMPOS_COMUNS = \[([\s\S]*?)\];/)[1]
  .match(/'([\w]+)'/g) || []).map(x => x.slice(1, -1));

/* A LISTA DO §4.7 TAMBÉM VEM DA FONTE, e isso é conserto de uma incoerência
   deste próprio arquivo: o comentário acima diz "lidos da fonte, não
   redigitados", e logo abaixo havia uma cópia da lista da Spec, redigitada.
   Ela envelheceu na primeira vez que a Spec mudou — o V1.15 acrescentou
   `bet_cancelled` ao §4.7 e este teste reprovou apontando para o lugar errado,
   como se o código estivesse errado em vez da cópia. */
const SPEC = readFileSync(
  new URL('../docs/POKEARENA_SPEC_MASTER_V1-V5_v1.5_COMPLETE.md', import.meta.url), 'utf8');
const DO_SPEC = (SPEC.match(/## 4\.7 Telemetria mínima[\s\S]*?```text\n([\s\S]*?)```/)?.[1] ?? '')
  .split('\n').map(l => l.trim()).filter(Boolean);

export function suite() {
  const s = criarSuite('telemetria');

  s.teste('os eventos declarados são exatamente os do §4.7 da Spec', () => {
    ok(DO_SPEC.length >= 14, `só ${DO_SPEC.length} eventos lidos do §4.7 — a varredura perdeu o bloco`);
    igual(EVENTOS.join(','), DO_SPEC.join(','),
      'a lista de eventos divergiu do §4.7. Vocabulário livre de telemetria ' +
      'vira lixo em três meses.');
  });

  s.teste('os campos comuns do §4.7 estão todos cobertos', () => {
    /* O §4.7 pede: user/session id, round id, engine version, timestamp,
       device class, experiment flags. Mais o nome do evento e a versão do
       pack, que a auditoria de preço do §4.4.5 já exigiu em outro lugar. */
    for (const c of ['evento', 'sessao', 'rodada', 'versaoMotor', 'ts', 'dispositivo', 'experimentos'])
      ok(CAMPOS.includes(c), `o campo comum obrigatório ${c} não está declarado`);
  });

  /* Cada um dos 14 precisa ser EMITIDO em algum lugar do app. Declarar a lista
     e não emitir metade é o modo de falha silencioso deste bloco. */
  s.teste('todo evento declarado é emitido em algum lugar', () => {
    const codigo = [...readdirSync(MODULOS).filter(f => f.endsWith('.mjs') && f !== 'telemetria.mjs')
      .map(f => readFileSync(new URL(f, MODULOS), 'utf8')), APP].join('\n');
    const orfaos = EVENTOS.filter(e => !codigo.includes(`'${e}'`));
    ok(orfaos.length === 0,
      `${orfaos.length} evento(s) declarados e nunca emitidos: ${orfaos.join(', ')}. ` +
      `O §P7 só dá a versão por entregue quando a telemetria EXISTE — lista não é telemetria.`);
  });

  /* O TESTE DA PEÇA. Os de cima leem a fonte e conferem a LISTA declarada — e
     lista declarada não é evento emitido. O defeito S65 removeu o campo
     `rodada` de dentro de `emitir` e passou por todos eles: a constante
     continuava correta, e ninguém olhava para o objeto que sai.

     É a terceira vez que este padrão aparece — S30 no F0.5, S53 no F0.9 e agora
     S65. **Testar a peça não testa o encaixe**, e testar a declaração não testa
     a peça. */
  s.teste('todo evento emitido sai com os campos comuns preenchidos', () => {
    limpar();
    for (const nome of DECLARADOS) emitir(nome, { extra: 1 });
    const saidos = eventos();
    igual(saidos.length, DECLARADOS.length, 'nem todo evento chegou ao buffer');
    for (const ev of saidos) {
      for (const campo of CAMPOS_COMUNS)
        ok(campo in ev,
          `o evento ${ev.evento} saiu sem o campo comum "${campo}". A lista de ` +
          `campos continua declarada; o evento é que não a cumpre.`);
      ok(typeof ev.sessao === 'string' && ev.sessao.length >= 8, 'sessão ausente ou curta');
      ok(Number.isFinite(ev.ts) && ev.ts > 0, 'timestamp ausente');
      ok(typeof ev.versaoMotor === 'string' && ev.versaoMotor.length > 0, 'versão do motor ausente');
      ok(Array.isArray(ev.experimentos), 'experimentos não é lista');
      ok('rodada' in ev, 'o campo rodada sumiu — sem ele o evento não se liga a nada');
    }
    /* mesma sessão para todos: id efêmero por aba, não por evento */
    igual(new Set(saidos.map(e => e.sessao)).size, 1, 'o id de sessão muda entre eventos');
    limpar();
  });

  s.teste('o anel descarta o mais velho, não o mais novo', () => {
    limpar();
    for (let i = 0; i < 600; i++) emitir('round_viewed', { i });
    const saidos = eventos();
    ok(saidos.length <= 500, `o buffer chegou a ${saidos.length}`);
    igual(saidos[saidos.length - 1].i, 599, 'o evento mais novo foi descartado');
    limpar();
  });

  s.teste('emitir nome fora da lista é erro, não silêncio', () => {
    ok(/throw new Error\(`evento fora do §4\.7/.test(fonte),
      'emitir um nome desconhecido precisa falhar alto; telemetria com nome errado ' +
      'só aparece quando alguém procura o dado e ele não está lá');
  });

  s.teste('a telemetria não identifica pessoa', () => {
    /* Proteção do jogador é requisito, não conformidade a posteriori (cap. 28).
       `sessao` é efêmero por aba; user-agent é impressão digital e fica fora. */
    for (const proibido of ['userAgent', 'navigator.platform', 'localStorage.getItem(\'ar_perfil']) 
      ok(!fonte.includes(proibido),
        `telemetria.mjs usa ${proibido} — isso é identificação, não classe de dispositivo`);
    ok(/classeDispositivo[\s\S]*innerWidth/.test(fonte),
      'a classe de dispositivo precisa sair da largura, não do user-agent');
  });

  s.teste('o anel tem teto — telemetria não pode virar vazamento de memória', () => {
    ok(/buffer\.length > LIMITE/.test(fonte) && /buffer\.shift\(\)/.test(fonte),
      'o buffer de eventos cresce sem limite');
  });

  return s;
}
