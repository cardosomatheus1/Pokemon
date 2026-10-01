/* Q1/Q3 · MINHA COLEÇÃO, O PAINEL (ST-9.16a · F3.12 · Spec §7.15)
 *
 * As contagens batem com o save; o que o lutador faz na Arena só aparece de
 * ENCONTRADA para cima (a nota da ST-9.4) — nenhuma camada trancada vaza; e o
 * painel não recalcula nada do dossiê nem conhece o clima.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import pack from '../content/pokemon_kanto_v1.mjs';
import DOSSIE from '../content/dossie_pokemon_kanto_v1.mjs';
import * as E from './motor.mjs';
import { painelDaColecao, textoDaLinha, dicaDaRodada } from '../app/modules/minha-colecao.mjs';
import { marcasVazias, marcarVistas, marcarEncontrada, DEGRAUS } from '../app/modules/pokedex-estado.mjs';
import { VAZIO } from '../app/modules/idle-dados.mjs';
import { sementes } from '../engine/seed.mjs';
import { baseDe } from '../engine/evolucao.mjs';

const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const semComentario = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const T = Date.UTC(2026, 8, 1, 15);
const cria = (id, dex, naCaixa = false) => ({ id, dex, nivel: 5, xp: 0, vinculo: 0, foco: null, iv: [1, 1, 1, 1, 1, 1], natureza: 'Bold',
                                              origem: 'captura', stamina: 100, staminaEm: T, criadaEm: T, naCaixa });

export function suite() {
  const s = criarSuite('minha-colecao');
  const pool = E.sortearPool(sementes('minha-colecao').elenco);

  s.teste('as contagens batem com o save', () => {
    const e = VAZIO();
    e.criaturas = [cria('a', 4), cria('b', 7), cria('c', 4, true)];
    e.jaPossuiu = [1];
    e.doces = { 4: 5, 7: 2 };
    e.expedicoes = [{ id: 'x', colhidaEm: null, terminaEm: T - 1 }, { id: 'y', colhidaEm: null, terminaEm: T + 3600e3 }, { id: 'z', colhidaEm: T }];
    const { resumo } = painelDaColecao({ pack, estado: e, marcas: marcasVazias(), dossie: DOSSIE, agora: T });
    igual(JSON.stringify(resumo), JSON.stringify({ criaturas: 3, naEquipe: 2, naCaixa: 1, especies: 3, totalPokedex: pack.especies.length,
      doces: 7, expedicoesEmCampo: 2, prontas: 1 }), 'o resumo não bate com o save');
  });

  s.teste('a pool da rodada cruzada com o que o jogador sabe — e nada trancado vaza', () => {
    const e = VAZIO(), m = marcasVazias();
    marcarVistas(m, pool.map(f => f.dex));
    marcarEncontrada(m, pool[3].dex);
    e.criaturas = [cria('a', baseDe(pack, pool[5].dex))];
    e.doces = { [baseDe(pack, pool[5].dex)]: 4 };
    const odds = { lutadores: pool.map((f, idx) => ({ idx, odd: 2 + idx, prob: 1 / (2 + idx) })) };
    const { rodada } = painelDaColecao({ pack, estado: e, marcas: m, dossie: DOSSIE, pool, odds, agora: T });
    igual(rodada.length, 12, 'a rodada não tem os 12');
    igual(rodada.map(r => r.idx).join(), pool.map((_, i) => i).join(), 'a ordem não é a da odd');
    for (const r of rodada) {
      const deveTerNota = DEGRAUS.indexOf(r.degrau) >= DEGRAUS.indexOf('encontrada');
      igual(!!r.nota, deveTerNota, `${r.dex} (${r.degrau}): a nota ${r.nota ? 'apareceu' : 'sumiu'}`);
    }
    igual(rodada.find(r => r.idx === 3).degrau, 'encontrada', 'a apostada não está encontrada');
    const minha = rodada.find(r => r.idx === 5);
    ok(minha.minhasDaLinha === 1 && minha.docesDaLinha === 4, 'a linha do jogador não aparece na rodada');
    /* Nenhum campo de camada trancada, em lugar nenhum do painel. */
    ok(!/porClima|posicoes|abates|caiCedo|rival/.test(JSON.stringify(rodada)), 'o painel carrega uma camada do dossiê');
  });

  s.teste('nada recalculado fora do dossiê, e nada do clima', () => {
    const src = semComentario(fonte('../app/modules/minha-colecao.mjs'));
    ok(!/\.taxa\b|\.vitoria\b|\.especies\[|clima|weather/.test(src), 'o painel lê o dossiê ou o clima por conta própria');
    ok(/notaDaAposta\(\{ dossie, degrau: escada\.degrau, dex: f\.dex \}\)/.test(src), 'o painel não usa a nota da ST-9.4');
  });

  s.teste('ST-9.16b · o texto da linha: a nota em destaque, e zero não é informação', () => {
    const base = { odd: 3.456, chance: 0.2351, nota: null, falta: 'aposte nela', minhasDaLinha: 0, docesDaLinha: 0 };
    const t = textoDaLinha(base);
    igual(t.odd, 'x3.46', 'a odd'); igual(t.chance, '23.5% de vencer', 'a chance');
    igual(t.nota, null, 'nota inventada');
    igual(t.sobre.join('|'), 'sem histórico ainda', 'sem nota, a linha não diz que não há histórico');
    ok(!t.sobre.join().includes('aposte nela'), 'o que falta voltou para a linha — doze vezes a mesma frase');
    const c = textoDaLinha({ ...base, nota: { texto: 'venceu 3 de 10' }, minhasDaLinha: 2, docesDaLinha: 1 });
    igual(c.nota, 'venceu 3 de 10', 'a nota sumiu');
    igual(c.sobre.join('|'), 'você tem 2 da linha|1 doce da linha', 'com nota, o sem-histórico não aparece; o doce no singular');
    igual(textoDaLinha({ ...base, docesDaLinha: 4 }).sobre.at(-1), '4 doces da linha', 'o plural');
    igual(JSON.stringify(textoDaLinha({ odd: null, chance: null })), JSON.stringify({ odd: '—', chance: '', nota: null, sobre: ['sem histórico ainda'] }), 'sem odd');
    /* O que falta vai UMA vez, no cabeçalho, e é o de quem está sem nota. */
    igual(dicaDaRodada([{ nota: { texto: 'x' }, falta: 'errado' }, { nota: null, falta: 'aposte nela' }]), 'aposte nela', 'a dica');
    igual(dicaDaRodada([{ nota: { texto: 'x' }, falta: 'domine' }]), null, 'dica com todos já com nota');
    igual(dicaDaRodada(null), null, 'sem rodada');
  });

  s.teste('ST-9.16b · a aba na Pokédex: lembrada, só pinta a rodada aberta, e o atalho escolhe o lutador', () => {
    const html = fonte('../app/index.html');
    ok(/data-pdx-aba="pokedex"/.test(html) && /data-pdx-aba="colecao"/.test(html), 'as duas abas');
    ok(/<div id="pdxAbaColecao" hidden>\s*<div id="pdxMinha"><\/div>[\s\S]{0,80}<div id="pdxColecao"><\/div>/.test(html),
      'a aba da coleção não nasce escondida com o painel e as medalhas');
    const tela = semComentario(fonte('../app/modules/colecao-tela.mjs'));
    ok(/const apostando = S\.state === 'betting' && S\.odds;/.test(tela)
       && /pool: apostando \? S\.fighters : null, odds: apostando \? S\.odds : null/.test(tela),
      'o painel mostra a rodada fora da janela de apostas');
    ok(/\$\{S\.myBet \? '' : `<button class="btn gold" data-goto="viewArena" data-escolher="\$\{r\.idx\}">Apostar<\/button>`\}/.test(tela),
      'o atalho não leva à Arena com o lutador, ou aparece depois de apostar');
    ok(/document\.querySelector\(`\.pick\[data-i="\$\{i\}"\]`\)\?\.click\(\)/.test(tela), 'o atalho não escolhe o lutador na Arena');
    ok(/if \(caixa && !caixa\.hidden\) caixa\.scrollIntoView\(\{ block: 'center'/.test(tela), 'o atalho não leva o olho até a confirmação');
    ok(/if \(aba === 'colecao'\) \{ pintarMinha\(\); pintarColecao\(\); \}/.test(tela) && /localStorage\.setItem\(CHAVE_ABA, aba\)/.test(tela),
      'a aba não pinta ao abrir, ou não é lembrada');
    ok(/textoDaLinha\(r\)/.test(tela) && /dicaDaRodada\(rodada\)/.test(tela) && !/toFixed|sem histórico|doce\(s\) da linha|\.falta/.test(tela), 'a tela decide o texto da linha');
    /* O clique do atalho chega à escolha: a linha da Arena é quem escolhe. */
    ok(/const row = ev\.target\.closest\('\.pick'\); if \(!row\) return;\s*selecionarLutador\(\+row\.dataset\.i, row\);/.test(fonte('../app/modules/fases.mjs')),
      'a linha da Arena não escolhe no clique');
  });

  s.teste('D-123 · AFIRMA O DEFEITO: escolher o lutador não muda o "Escolha um lutador" da caixa de aposta', () => {
    /* Achado no Q5 da ST-9.16b: com o lutador marcado e a confirmação à mostra,
       a caixa "Sua aposta" continua mandando escolher um. Fica VERMELHO quando
       a UX-01 fizer a escolha reescrever a frase — aí este teste inverte. */
    const src = fonte('../app/modules/aposta.mjs');
    const sel = src.slice(src.indexOf('function selecionarLutador'), src.indexOf('function limparEscolha'));
    ok(sel.length > 0 && !/betInfo/.test(sel), 'D-123 foi corrigido: inverta este teste e feche o defeito');
  });

  return s;
}
