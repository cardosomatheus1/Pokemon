/* Q1/Q3 · O LAÇO DE RETORNO NA INÍCIO (ST-9.17 · Spec §7.16, §13)
 *
 * "Desde a sua última visita": as expedições prontas, quem subiu de nível, os
 * doces ganhos, a ficha a um passo de mudar, e o próximo passo. Na primeira
 * visita não há cartão; sem novidade não há cartão; o ganho de uma visita não
 * é contado de novo na seguinte; e o relógio de uma visita passada não decide
 * se uma expedição está pronta agora — quem decide é a mesma regra da colheita.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import pack from '../content/pokemon_kanto_v1.mjs';
import { cartaoDeRetorno, fotoDaVisita, PERTO_DE_DOMINAR, haQuanto } from '../app/modules/retorno-dados.mjs';
import { VAZIO, pronta } from '../app/modules/idle-dados.mjs';
import { registroDaLinha, marcasVazias } from '../app/modules/pokedex-estado.mjs';
import { colher } from '../app/modules/idle-colheita.mjs';

const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const semComentario = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const H = 3600e3, T = Date.UTC(2026, 8, 1, 15);
const cria = (id, dex, nivel = 5) => ({ id, dex, nivel, xp: 0, vinculo: 0, foco: null, iv: [1, 1, 1, 1, 1, 1], natureza: 'Bold',
                                       origem: 'captura', stamina: 100, staminaEm: T, criadaEm: T });
const exp = (id, terminaEm, colhidaEm = null) => ({ id, bioma: 'floresta', perfil: 'trilha', equipe: ['a'], estagio: 1,
                                                    iniciadaEm: terminaEm - H, terminaEm, colhidaEm });
const nomeDe = n => n;
const cartao = (e, anterior, agora, marcas = marcasVazias()) => cartaoDeRetorno({ pack, estado: e, marcas, anterior, agora, nomeDe });

export function suite() {
  const s = criarSuite('retorno');

  s.teste('primeira visita: não há cartão; e sem novidade também não', () => {
    const e = VAZIO();
    e.criaturas = [cria('a', 4)];
    e.expedicoes = [exp('x', T + H)];
    igual(cartao(e, null, T + 2 * H), null, 'a primeira visita desenhou cartão');
    e.doces = { 4: 2 };                         // com novidade, para a foto sem data não se esconder atrás do filtro
    igual(cartao(e, {}, T + 2 * H), null, 'uma foto sem data valeu como visita');
    igual(cartao(e, { em: 'ontem', doces: {} }, T + 2 * H), null, 'uma data que não é número valeu como visita');
    e.doces = {};
    /* Visitou de novo, nada mudou e nada ficou pronto: cartão vazio é ruído. */
    const f = fotoDaVisita(e, T);
    igual(cartao(e, f, T + 1), null, 'desenhou um cartão vazio');
  });

  s.teste('o que mudou desde a última visita — e o próximo passo', () => {
    const e = VAZIO();
    e.criaturas = [cria('a', 4, 10), cria('b', 7, 3)];
    e.doces = { 4: 2 };
    e.expedicoes = [exp('x', T + H), exp('y', T + 9 * H), exp('z', T + H, T + H)];
    const f = fotoDaVisita(e, T);
    e.criaturas[0].nivel = 12;
    e.criaturas.push(cria('c', 1, 5));           // nova: não "subiu de nível"
    e.doces = { 4: 5, 7: 1 };
    const c = cartao(e, f, T + 2 * H);
    ok(c, 'não houve cartão com tudo isso mudado');
    igual(c.desde, T, 'desde quando');
    igual(c.prontas, 1, 'as prontas: só a que terminou e não foi colhida');
    igual(JSON.stringify(c.subiram), JSON.stringify([{ id: 'a', dex: 4, de: 10, para: 12 }]), 'quem subiu');
    igual(JSON.stringify(c.doces), JSON.stringify([{ linha: 4, ganhos: 3 }, { linha: 7, ganhos: 1 }]), 'os doces, maior primeiro');
    igual(c.proximo.goto, 'viewIdle', 'com expedição pronta, o próximo passo é colher');
    ok(c.linhas.length >= 3 && c.linhas.every(l => typeof l === 'string' && l.length > 0), `as linhas: ${JSON.stringify(c.linhas)}`);
    ok(c.linhas.some(l => /charmander subiu do nível 10 para o 12/i.test(l)), `a linha de quem subiu: ${JSON.stringify(c.linhas)}`);
    ok(c.linhas.some(l => /\+3 doces da linha do charmander/i.test(l)), 'a linha do doce');
  });

  s.teste('a expedição que JÁ esperava na visita passada não abre o cartão de novo', () => {
    const e = VAZIO();
    e.criaturas = [cria('a', 4)];
    e.expedicoes = [exp('x', T + H)];
    /* Ficou pronta DEPOIS da visita passada: é novidade. */
    const c = cartao(e, fotoDaVisita(e, T), T + 2 * H);
    ok(c && c.prontas === 1 && c.novasProntas === 1, `a pronta nova: ${JSON.stringify(c)}`);
    /* Na visita seguinte ela continua lá, sem colher: estado, e não novidade. */
    igual(cartao(e, fotoDaVisita(e, T + 2 * H), T + 3 * H), null, 'a mesma colheita abriu o cartão em duas visitas');
    /* Com outra novidade, ela aparece como contexto. */
    e.doces = { 4: 1 };
    igual(cartao(e, fotoDaVisita({ ...e, doces: {} }, T + 2 * H), T + 3 * H).prontas, 1, 'a pronta sumiu do contexto');
  });

  s.teste('o ganho de uma visita não é contado de novo na seguinte', () => {
    const e = VAZIO();
    e.criaturas = [cria('a', 4, 10)];
    e.doces = { 4: 2 };
    const f1 = fotoDaVisita(e, T);
    e.criaturas[0].nivel = 11; e.doces = { 4: 4 };
    ok(cartao(e, f1, T + H), 'a primeira volta não viu o ganho');
    /* A tela grava a foto DESTA visita; a próxima não repete o ganho. */
    const f2 = fotoDaVisita(e, T + H);
    igual(cartao(e, f2, T + 2 * H), null, 'a mesma subida e os mesmos doces foram contados duas vezes');
    /* E soltar/gastar doce não vira "ganho negativo". */
    e.doces = { 4: 1 };
    igual(cartao(e, f2, T + 3 * H), null, 'gastar doce desenhou cartão');
  });

  s.teste('o relógio: a expedição está pronta pela regra da colheita, nunca pela hora de uma visita passada', () => {
    const e = VAZIO();
    e.criaturas = [cria('a', 4)];
    e.expedicoes = [exp('x', T + 5 * H)];
    /* A visita passada foi gravada com o relógio ADIANTADO (T + 10 h); agora o
       relógio voltou ao certo (T + 1 h). A expedição não terminou. */
    const adiantada = fotoDaVisita(e, T + 10 * H);
    igual(cartao(e, adiantada, T + H), null, 'o relógio de uma visita passada inventou uma colheita');
    /* E com outra novidade abrindo o cartão, a expedição não entra nem como contexto. */
    const comDoce = { ...e, doces: { 4: 1 } };
    igual(cartao(comDoce, adiantada, T + H).prontas, 0, 'o relógio de uma visita passada pôs uma colheita no cartão');
    /* E em qualquer instante, o cartão e a colheita concordam. */
    for (const agora of [T, T + 5 * H - 1, T + 5 * H, T + 50 * H]) {
      const c = cartao(e, fotoDaVisita(VAZIO(), T - H), agora);
      let aceita = true;
      try { colher(structuredClone(e), { pack, id: 'x', agora, raiz: 7, bonus: null }); } catch { aceita = false; }
      igual((c?.prontas ?? 0) > 0, aceita, `em ${(agora - T) / H} h o cartão e a colheita discordam`);
      igual(aceita, pronta(e.expedicoes[0], agora), 'a colheita não usa `pronta`');
    }
    /* Desde quando: nunca depois de agora — e a frase não fica negativa. */
    e.doces = { 4: 1 };
    igual(cartao(e, adiantada, T + H).desde, T + H, 'o "desde" ficou no futuro');
    igual([haQuanto(-5 * H), haQuanto(59 * 60e3), haQuanto(3 * H), haQuanto(47 * H), haQuanto(49 * H)].join('|'),
      'há pouco|há pouco|há 3 h|há 47 h|há 2 dias', 'a frase do tempo');
  });

  s.teste('a ficha a um passo de mudar: a linha capturada mais perto de dominar', () => {
    const e = VAZIO();
    e.criaturas = [cria('a', 4), cria('b', 7)];
    const alvo = registroDaLinha(pack, e, 4).alvo;
    ok(alvo > PERTO_DE_DOMINAR, `o alvo do Charmander (${alvo}) é pequeno demais para o teste`);
    e.registro = { 4: alvo - 2, 7: alvo - PERTO_DE_DOMINAR - 1 };
    const f = fotoDaVisita(e, T);
    e.doces = { 7: 1 };                          // alguma novidade, para haver cartão
    const c = cartao(e, f, T + H);
    igual(c.perto?.linha, 4, `a linha mais perto: ${JSON.stringify(c.perto)}`);
    igual(c.perto.faltam, 2, 'quantas faltam');
    ok(c.linhas.some(l => /Faltam 2 fichas para dominar a linha do charmander/i.test(l)), `a linha da ficha: ${JSON.stringify(c.linhas)}`);
    /* Longe demais não é "a um passo"; completa não é "a um passo". */
    e.registro = { 4: alvo + 5, 7: alvo - PERTO_DE_DOMINAR - 1 };
    igual(cartao(e, f, T + H).perto, null, 'prometeu mudar uma ficha longe ou já dominada');
    /* Com a ficha perto e sem expedição, o próximo passo é mandar uma. */
    e.registro = { 4: alvo - 1 };
    const s1 = cartao(e, f, T + H);
    ok(s1 && s1.proximo.goto === 'viewIdle' && /expedição/.test(s1.proximo.texto), `a ficha perto sem próximo passo: ${JSON.stringify(s1?.proximo)}`);
    /* Mas SOZINHA ela é estado, e não novidade: não abre cartão. */
    e.doces = {};
    igual(cartao(e, f, T + H), null, 'a ficha perto abriu o cartão sozinha — ele apareceria em toda abertura');
  });

  s.teste('a tela: cartão na Início, foto gravada depois de ler, e quem volta com novidade abre nela', () => {
    const tela = semComentario(fonte('../app/modules/retorno-tela.mjs'));
    ok(/cartaoDeRetorno\(/.test(tela) && /fotoDaVisita\(/.test(tela), 'a tela não usa a regra');
    /* A ordem importa: gravar a foto ANTES de ler apagaria a novidade. */
    ok(tela.indexOf('cartaoDeRetorno(') < tela.indexOf('fotoDaVisita('), 'a foto é gravada antes de o cartão ser lido');
    ok(!/toFixed|\.nivel\s*>|\.doces\?\.\[|pronta\(/.test(tela), 'a tela decide o que é novidade');
    ok(/id="retorno"/.test(fonte('../app/index.html')), 'o cartão não tem lugar na Início');
    ok(/sessaoAtiva\(\) \? \(temRetorno\(\) \? 'viewHome' : 'viewArena'\) : 'viewHome'/.test(fonte('../app/index.html')),
      'quem volta com novidade não abre na Início');
    /* §13: in-app, e não a cada rodada. */
    ok(!/Notification|setInterval/.test(tela), 'o retorno virou notificação ou relógio');
  });

  return s;
}
