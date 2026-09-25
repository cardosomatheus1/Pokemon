/* 1.33 · QUAL CONDIÇÃO VALE PARA ESTA RUN (camada 0).
 *
 * O motor recebe preferências por tipo e não sabe o que é noite. Este arquivo
 * testa quem traduz: a HORA da run (no relógio do mundo — Brasília, DEC-10) e o
 * CLIMA dela (a mesma tabela `climaIdle` que já decide quem RENDE mais — a L-178
 * pedia uma tabela só para as duas perguntas).
 *
 * Três regras do cartão (`docs/PROXIMO_BLOCO_1.33.md`) que moram aqui:
 *
 *   · a hora é a do INÍCIO da run — o relógio andando não rerrola ninguém;
 *   · run antiga, sem `regraElenco`, fica no elenco-base até acabar;
 *   · a PRÉVIA só conhece o período: o clima é oculto até a run começar (L-177).
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { preferenciasDaRun, preferenciasDaPrevia, eventosDoElenco } from '../app/modules/elenco-condicao.mjs';
import { climaDaRun } from '../app/modules/avanco-clima.mjs';
import { REGRA_DO_ELENCO } from '../engine/elenco-estagio.mjs';
import { resumoDaRota } from '../app/modules/idle-escolha.mjs';
import { elencoDaRun } from '../app/modules/avanco-estado.mjs';
import { novaRun } from '../engine/run-avanco.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';

/* Instantes em horas de BRASÍLIA: 22h lá são 01h UTC do dia seguinte. */
const brasilia = h => Date.UTC(2026, 8, 16, 0, 0, 0) + (h + 3) * 3600_000;
const run = (h, extra = {}) => ({ bioma: 'floresta', estagio: 1, raiz: '42',
  iniciadaEm: brasilia(h), regraElenco: REGRA_DO_ELENCO, ...extra });
const temNoite = prefs => prefs.some(p => p.fonte === 'noite');

export function suite() {
  const s = criarSuite('elenco-condicao');

  s.teste('a run começada à noite em Brasília leva a preferência da noite', () => {
    ok(temNoite(preferenciasDaRun(kanto, run(23))),
      'uma run começada às 23h de Brasília não leva a noite. O cenário está escuro ' +
      'e o elenco é o de dia — a luz e o monstro discordando, que a DEC-10 existe ' +
      'para impedir.');
    ok(!temNoite(preferenciasDaRun(kanto, run(12))),
      'uma run começada ao meio-dia leva a preferência da noite');
  });

  s.teste('o relógio que decide é o do MUNDO, e não o UTC cru', () => {
    /* Instantes em que os DOIS relógios discordam — senão o teste passa com a
       conversão apagada (passou: a primeira versão usava 01h UTC, que é noite
       nos dois). 07h UTC = 04h em Brasília: noite lá, dia em UTC. 21h UTC = 18h
       em Brasília: tarde lá, noite em UTC. */
    const r1 = { ...run(0), iniciadaEm: Date.UTC(2026, 8, 16, 7, 0, 0) };
    const r2 = { ...run(0), iniciadaEm: Date.UTC(2026, 8, 16, 21, 0, 0) };
    ok(temNoite(preferenciasDaRun(kanto, r1)), '07h UTC (04h em Brasília) não é noite');
    ok(!temNoite(preferenciasDaRun(kanto, r2)), '21h UTC (18h em Brasília) é noite');
  });

  s.teste('a hora é a do INÍCIO: a run não rerrola quando o relógio anda', () => {
    const r = run(23);
    const antes = JSON.stringify(preferenciasDaRun(kanto, r));
    /* Nada no argumento fala de "agora" — por construção a resposta só depende
       da run. Conferir que não há um segundo parâmetro de relógio escondido. */
    igual(preferenciasDaRun.length, 2, 'preferenciasDaRun passou a aceitar outro argumento');
    igual(JSON.stringify(preferenciasDaRun(kanto, r)), antes, 'a mesma run deu outra condição');
  });

  s.teste('o clima da run entra com os tipos da MESMA tabela que decide o bônus', () => {
    for (const raiz of ['1', '2', '3', '7', '42', '99', '123', '2024']) {
      const r = run(12, { raiz });
      const c = climaDaRun(kanto, r);
      const p = preferenciasDaRun(kanto, r).find(x => x.fonte === c?.key);
      if (c?.tipos?.length) {
        ok(p, `o clima ${c.key} (raiz ${raiz}) não virou preferência de elenco`);
        igual(JSON.stringify(p.favorece), JSON.stringify(c.tipos),
          `o clima ${c.key} favorece no elenco tipos diferentes dos que favorece no ` +
          'bônus. A L-178 pedia UMA tabela para as duas perguntas.');
      } else ok(!p, `o tempo firme (raiz ${raiz}) virou preferência — ele não favorece ninguém`);
    }
  });

  s.teste('run antiga, sem versão de regra, fica no elenco-base', () => {
    const antiga = run(23); delete antiga.regraElenco;
    igual(preferenciasDaRun(kanto, antiga).length, 0,
      'uma run começada antes do 1.33 passou a ter condição — o elenco dela mudaria ' +
      'no meio, e o cartão proíbe reprocessar em silêncio');
  });

  s.teste('a PRÉVIA só conhece o período — o clima continua oculto', () => {
    const p = preferenciasDaPrevia(kanto, brasilia(23));
    ok(temNoite(p), 'a prévia das 23h não mostra a noite');
    const fontes = new Set((kanto.climaIdle ?? []).map(c => c.key));
    ok(!p.some(x => fontes.has(x.fonte)),
      'a prévia leva uma preferência de CLIMA. O clima é revelado só depois de a run ' +
      'começar (L-177) — uma prévia que muda com ele é o clima vazando pelo elenco.');
    igual(preferenciasDaPrevia(kanto, brasilia(12)).length, 0, 'a prévia do meio-dia tem condição');
  });

  /* ── A LIGAÇÃO: as três pontas que o jogador vê ─────────────────────── */

  s.teste('a run NOVA nasce com a versão da regra do elenco', () => {
    const r = novaRun({ bioma: 'floresta', estagio: 1, equipe: [], raiz: '42', agora: brasilia(23) });
    igual(r.regraElenco, REGRA_DO_ELENCO,
      'a novaRun não grava `regraElenco`. Sem ela, toda run nova é tratada como antiga ' +
      'e fica no elenco-base — o 1.33 inteiro vira código morto sem nenhum vermelho.');
  });

  s.teste('o elenco da run usa a condição dela, e a run antiga fica na base', () => {
    const nova = novaRun({ bioma: 'floresta', estagio: 1, equipe: [], raiz: '42', agora: brasilia(23) });
    const trocasNoite = e => (e.trocas ?? []).filter(t => t.fonte === 'noite');
    ok(trocasNoite(elencoDaRun(kanto, nova)).length > 0,
      'a run começada às 23h na floresta não troca ninguém pela noite. O motor sabe ' +
      'trocar (suíte elenco-estagio); quem perdeu a ligação foi o `elencoDaRun`.');
    const antiga = { ...nova }; delete antiga.regraElenco;
    igual((elencoDaRun(kanto, antiga).trocas ?? []).length, 0,
      'a run antiga ganhou trocas — o elenco dela mudaria no meio da wave');
  });

  s.teste('a sala de rotas marca quem só mora ali de noite', () => {
    const bicho = { id: 'c5', dex: 1, nivel: 5 };
    const noite = preferenciasDaPrevia(kanto, brasilia(23));
    let marcados = 0;
    for (const b of kanto.biomas ?? []) {
      const r = resumoDaRota(kanto, b.id, [bicho], { ate: 99, preferencias: noite });
      for (const d of r.noturnos)
        ok(r.moradores.includes(d), `${b.id}: o noturno ${d} não está entre os moradores`);
      marcados += r.noturnos.length;
      igual(resumoDaRota(kanto, b.id, [bicho]).noturnos.length, 0,
        `${b.id}: sem preferência, a rota marca alguém como noturno`);
    }
    ok(marcados > 0,
      'nenhuma rota marca noturno às 23h. O dono pediu a noite VISÍVEL na porta; ' +
      'sem a marca, a lista muda e o jogador lê isso como defeito.');
  });

  /* A SALA pinta o que o motor devolveu — o texto dela só precisa PEDIR com o
     período e LER os noturnos. Estrutural de propósito: a decisão está toda em
     camada 0, e este teste é o que converte o mutante da ligação de navegador
     (~30 s) em Node (~0,1 s). */
  s.teste('a sala de rotas pede com o período e pinta a lua', () => {
    const src = readFileSync(new URL('../app/modules/idle-biomas.mjs', import.meta.url), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ');
    ok(/preferenciasDaPrevia\(PACK,\s*Date\.now\(\)\)/.test(src),
      'a sala não pergunta o período de agora — a prévia volta a ser sempre a de dia');
    igual((src.match(/resumoDaRota\(PACK,[^\n]*\{\s*preferencias\s*\}\)/g) ?? []).length, 2,
      'a régua e os cartões não pedem os dois com as mesmas preferências — ' +
      'a frase e os cartões discordariam sobre a noite');
    ok(/r\.noturnos\.includes\(dex\)/.test(src) && /rotaNoite/.test(src),
      'o cartão não marca os noturnos com a lua');
    /* A REGRA do anel tem de EXISTIR fora de comentário. Um fecho de comentário sobrando na
       primeira versão engoliu a `.rotaNoite{}` inteira: o CSS não dá erro, a
       página não dá erro, e o anel simplesmente não aparecia. */
    const css = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ');
    /* Entre o `}` anterior e a regra, só espaço: texto solto ali vira parte
       do SELETOR, e o navegador descarta a regra inteira. Procurar só a linha
       deixou o defeito passar na sabotagem. */
    ok(/\}\s*\.rotaNoite\{[^}]*z-index:1[^}]*box-shadow:/.test(css),
      'a regra `.rotaNoite{}` sumiu do CSS — o anel e a subida sobre o vizinho não existem');
  });

  /* ══ 1.32b / ST-2.2 · A RUN DIZ QUEM A CONDIÇÃO TROUXE ══════════════════
   *
   * O clima é revelado no início (o cartão e a linha do log, desde o 1.32), e
   * o 1.33 fez ele mudar QUEM aparece. Faltava ligar as duas coisas: sem a
   * linha, o rosto novo parece sorte, e o jogador não aprende a regra que a
   * legenda da sala ensinou. Semente medida: a `raiz: 'r9'` de dia na Floresta
   * cai em Pólen, que troca um rosto no estágio 1. */
  const DIA = brasilia(12);
  s.teste('1.32b: a run diz quem a condição trouxe, e o elenco é o do motor', () => {
    const r = run(12, { raiz: 'r9' });
    igual(climaDaRun(kanto, r)?.key, 'polen', 'a semente medida mudou de clima — o teste perdeu o que medir');
    const ev = eventosDoElenco(kanto, r, DIA);
    igual(ev.length, 1, `o Pólen troca um rosto na Floresta e a run disse ${ev.length}`);
    const e0 = ev[0];
    igual(e0.tipo, 'elenco');
    igual(e0.fonte, 'polen');
    ok(e0.fonteNome === 'Pólen' && e0.emoji, `a linha não diz de onde veio a troca: ${JSON.stringify(e0)}`);
    const efetivo = elencoDaRun(kanto, r);
    ok((efetivo.comuns ?? []).some(x => x.dex === e0.entrou),
      'a linha anuncia um rosto que o elenco efetivo da run não tem');
    ok(!(efetivo.comuns ?? []).some(x => x.dex === e0.saiu), 'quem saiu continua no elenco');
  });

  s.teste('1.32b: sem troca, sem linha — tempo firme de dia não inventa novidade', () => {
    for (let i = 0; i < 40; i++) {
      const r = run(12, { raiz: 'r' + i });
      const trocou = (elencoDaRun(kanto, r).trocas ?? []).length;
      igual(eventosDoElenco(kanto, r, DIA).length, trocou,
        `semente r${i}: ${trocou} troca(s) no motor e outra contagem no log`);
    }
  });

  s.teste('1.32b: a noite também se anuncia, com o nome da noite', () => {
    const r = run(23);
    const ev = eventosDoElenco(kanto, r, brasilia(23));
    ok(ev.some(x => x.fonte === 'noite' && /noite/i.test(x.fonteNome)),
      `a troca da noite não foi anunciada: ${JSON.stringify(ev)}`);
  });

  s.teste('1.32b: run antiga não anuncia troca — ela não troca', () => {
    const antiga = run(23); delete antiga.regraElenco;
    igual(eventosDoElenco(kanto, antiga, brasilia(23)).length, 0,
      'a run de antes do 1.33 ganhou linha de troca que ela não teve');
  });

  return s;
}
