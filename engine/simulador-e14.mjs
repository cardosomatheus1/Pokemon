/* O SIMULADOR DA ECONOMIA ENTRE JOGADORES (ST-14.15 · E14 · spec E14 §§12–15) — camada 0.
 *
 * Puro e com semente: a mesma (cenário, semente) devolve o MESMO relatório,
 * byte a byte. Não lê banco nem relógio; quem cronometra e escreve o
 * relatório é o `tools/simular-e14.mjs`.
 *
 * O QUE ELE É: sensibilidade. Dado um conjunto de hipóteses (encontros por
 * dia, captura, taxa shiny, emissão da bola garantida, PC-T por dia, usuários,
 * taxas, demanda), o que acontece com a queima, a concentração, a liquidez e
 * o estoque? O QUE ELE NÃO É: previsão. Um preço que sai daqui é consequência
 * das hipóteses, e não um preço sustentável — a spec proíbe declarar isso.
 *
 * As taxas são as do `engine/taxas-mercado.mjs`, a mesma função que o
 * servidor cobra: a simulação não tem uma tabela de taxas própria para
 * divergir da real.
 *
 * A conservação é conferida DENTRO de cada execução: emitido − queimado −
 * gasto = circulante, e a moeda que passa entre jogadores soma zero. Um
 * cenário que furasse isso seria um simulador errado, não uma economia.
 */
import { rng } from './primitivas.mjs';
import { previewAnuncio, POLITICA_PILOTO } from './taxas-mercado.mjs';
import { concentracao } from './kpis-e14.mjs';

const BASE = Object.freeze({
  dias: 30, usuarios: 300, especies: 150,
  encontrosDia: 30, captura: 0.4, shiny: 1 / 2000,
  mestraDia: 0.02, mestraUso: 0.5,         // chance/dia de ganhar uma; chance de usar a que tem
  pctDia: 100, gastoDia: 0.3,              // PC-T de fonte aprovada por dia; fração gasta em sinks do jogo
  precoRef: 2000, listar: 0.5, demanda: 0.2,
  prazoDias: 7,
  especuladores: 0, capitalEspeculador: 20, // fração dos usuários; múltiplo do PC-T/dia inicial × dias
  sybils: 0, deteccaoLigadas: 0,           // contas novas ligadas a uma principal; chance de a política pegar
  congelaAoDetectar: false,                // pega e CONGELA a conta (ST-14.14), ou só recusa a tentativa
  politica: POLITICA_PILOTO,
});

export const CENARIOS = Object.freeze({
  baixa_liquidez: { usuarios: 60, demanda: 0.04, listar: 0.6 },
  equilibrio: {},
  alta_concentracao: { especuladores: 0.05, capitalEspeculador: 40, demanda: 0.3 },
  abuso_contas_novas: { sybils: 80, deteccaoLigadas: 0.5 },
});

const mediana = xs => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); };

export function simularE14(cenario, { semente = 1, ...sobre } = {}) {
  const p = { ...BASE, ...(CENARIOS[cenario] ?? (() => { throw new Error(`cenário desconhecido: ${cenario}`); })()), ...sobre };
  const r = rng(semente);
  const N = p.usuarios, S = p.sybils, PRINCIPAL = 0;
  const contas = Array.from({ length: N + S }, (_, i) => ({
    pct: 0, shinies: [], mestras: 0,
    esp: i < N && i > 0 && r() < p.especuladores, sybil: i >= N,
  }));
  for (const c of contas) if (c.esp) c.pct = p.pctDia * p.capitalEspeculador;
  const t = { emitido: contas.reduce((a, c) => a + c.pct, 0), queimado: 0, gasto: 0, entrou: 0, saiu: 0,
              anuncios: 0, vendas: 0, precos: [], shinyNascidos: 0, mestraEmitidas: 0, mestraUsadas: 0,
              funilTentado: 0, funilPassou: 0, funilBloqueado: 0, funilVolume: 0, taxaAnuncio: 0, taxaVenda: 0 };
  let ativos = [];   // { vendedor, especie, preco, taxaVenda, vence, revenda }
  const passar = (de, para, valor, taxa) => { contas[de].pct -= valor + taxa; contas[para].pct += valor; t.saiu += valor; t.entrou += valor; t.queimado += taxa; };
  const anunciar = (i, especie, preco, dia, revenda = false) => {
    const a = previewAnuncio({ preco, politica: p.politica });
    if (!a.ok || contas[i].pct < a.taxaAnuncio) return false;
    contas[i].pct -= a.taxaAnuncio; t.queimado += a.taxaAnuncio; t.taxaAnuncio += a.taxaAnuncio; t.anuncios++;
    ativos.push({ vendedor: i, especie, preco, taxaVenda: a.taxaVenda, vence: dia + p.prazoDias, revenda });
    return true;
  };
  const vender = (k, comprador, funil = false) => {
    const a = ativos[k];
    /* o comprador paga o preço; o vendedor recebe o preço menos a taxa, que queima */
    passar(comprador, a.vendedor, a.preco - a.taxaVenda, a.taxaVenda);
    t.taxaVenda += a.taxaVenda;                     // o que a tabela de taxas cobrou; a queima tem de bater
    /* a venda do funil não entra na estatística do mercado: misturá-la
       derrubaria a mediana com preços que não são de ninguém comprando nada */
    if (funil) t.funilVolume += a.preco; else { t.vendas++; t.precos.push(a.preco); }
    if (a.especie != null) contas[comprador].shinies.push(a.especie);
    ativos.splice(k, 1);
  };

  for (let dia = 0; dia < p.dias; dia++) {
    ativos = ativos.filter(a => { if (a.vence > dia) return true;
      if (a.especie != null) contas[a.vendedor].shinies.push(a.especie); return false; });
    for (let i = 0; i < contas.length; i++) {
      const c = contas[i];
      c.pct += p.pctDia; t.emitido += p.pctDia;
      const g = Math.floor(p.pctDia * p.gastoDia); c.pct -= g; t.gasto += g;
      if (c.sybil) continue;
      for (let e = 0; e < p.encontrosDia; e++) {
        const usaMestra = c.mestras > 0 && r() < p.mestraUso / p.encontrosDia;
        if (usaMestra) { c.mestras--; t.mestraUsadas++; }
        const brilha = r() < p.shiny, pega = usaMestra || r() < p.captura;
        if (brilha && pega) { c.shinies.push(Math.floor(r() * p.especies)); t.shinyNascidos++; }
      }
      if (r() < p.mestraDia) { c.mestras++; t.mestraEmitidas++; }
      if (!c.esp && c.shinies.length && r() < p.listar / p.prazoDias)
        anunciar(i, c.shinies.pop(), Math.max(p.politica.brutoMinimoAnuncio, Math.round(p.precoRef * (0.7 + 0.6 * r()))), dia);
    }
    /* A demanda: o comprador olha o mais barato e compra se cabe no que ele
       aceita pagar e no PC-T que tem. */
    for (let i = 0; i < N; i++) {
      const c = contas[i];
      if (!ativos.length) break;
      const quer = c.esp ? true : r() < p.demanda;
      if (!quer) continue;
      let k = 0; for (let j = 1; j < ativos.length; j++) if (ativos[j].preco < ativos[k].preco) k = j;
      const a = ativos[k];
      if (a.vendedor === i || c.pct < a.preco) continue;
      const aceita = c.esp ? p.precoRef * 0.9 : p.precoRef * (0.6 + 0.8 * r());
      if (a.preco > aceita) continue;
      const especie = a.especie;
      vender(k, i);
      if (c.esp) { c.shinies.pop(); anunciar(i, especie, Math.round(a.preco * 1.3), dia, true); }
    }
    /* O FUNIL das contas novas: cada sybil compra um "anúncio" da principal
       pelo PC-T que juntou. A política pega a conta ligada com a chance dada. */
    for (let i = N; i < N + S; i++) {
      const c = contas[i];
      if (c.congelada || c.pct < p.politica.brutoMinimoAnuncio * 2) continue;
      const preco = Math.floor(c.pct / 1.01);
      t.funilTentado++;
      if (r() < p.deteccaoLigadas) { t.funilBloqueado++; if (p.congelaAoDetectar) c.congelada = true; continue; }
      if (!anunciar(PRINCIPAL, null, preco, dia)) continue;
      t.anuncios--;
      vender(ativos.length - 1, i, true);
      t.funilPassou++;
    }
  }
  for (const a of ativos) if (a.especie != null) contas[a.vendedor].shinies.push(a.especie);

  const circulante = contas.reduce((a, c) => a + c.pct, 0);
  const saldos = contas.map(c => c.pct);
  const shinyEstoque = contas.reduce((a, c) => a + c.shinies.length, 0);
  return {
    cenario, semente, parametros: { ...p, politica: p.politica.versao },
    emissao: t.emitido, queima: t.queimado, taxas: { anuncio: t.taxaAnuncio, venda: t.taxaVenda }, gasto: t.gasto, circulante,
    furoDeConservacao: t.emitido - t.queimado - t.gasto - circulante,
    mintP2P: t.entrou - t.saiu,
    concentracao: concentracao(saldos),
    principal: { pct: contas[PRINCIPAL].pct, fatia: circulante ? contas[PRINCIPAL].pct / circulante : 0 },
    mercado: { anuncios: t.anuncios, vendas: t.vendas, vendaPorAnuncio: t.anuncios ? t.vendas / t.anuncios : 0,
               medianaPreco: mediana(t.precos) },
    shiny: { nascidos: t.shinyNascidos, estoque: shinyEstoque },
    mestra: { emitidas: t.mestraEmitidas, usadas: t.mestraUsadas, estoque: contas.reduce((a, c) => a + c.mestras, 0) },
    funil: { tentado: t.funilTentado, passou: t.funilPassou, bloqueado: t.funilBloqueado, volume: t.funilVolume },
  };
}
