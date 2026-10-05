/* A CONTA DA COLHEITA (ST-13.2a · E13 · Spec §7.14, §P2, §P3).
 *
 * Puro: entra a expedição, as criaturas do jogador, a raiz sorteada na colheita
 * e o bônus da Arena; sai TUDO que a colheita paga — encontros, itens, moeda,
 * batalhas de treinador, XP e vínculo de quem foi, o treino de quem ficou, os
 * fragmentos e os encontros pendentes. Não escreve em lugar nenhum.
 *
 * ── POR QUE ELA SAIU DO CLIENTE ──────────────────────────────────────────
 *
 * O servidor do idle foi escrito no 1.2d e parou ali: sorteava os encontros
 * SEM a equipe, sem o estágio e sem o foco, e não pagava moeda, XP, vínculo,
 * treino nem batalha. O cliente ganhou tudo isso em quinze blocos. Levar a
 * colheita para o servidor copiando o código daria duas colheitas que
 * discordam no primeiro bloco de economia seguinte — e o jogador com conta
 * receberia uma, o sem conta outra.
 *
 * A regra do E13 é UM CAMINHO SÓ: esta função é a colheita. O cliente
 * (`app/modules/idle-colheita.mjs`) a chama e escreve no save; o servidor
 * (`server/idle.mjs`) a chama e escreve no banco. `test/colheita.mjs` afirma
 * que os dois recebem o mesmo resultado da mesma raiz.
 *
 * ── A ORDEM É PARTE DO CONTRATO ──────────────────────────────────────────
 *
 * `bolsa` sai na ordem em que o cliente sempre creditou (itens, moeda,
 * material da batalha), porque a ordem das chaves de um objeto aparece no
 * save e nas fixtures. E o nível da equipe para a batalha é o de ANTES do
 * XP desta colheita: a luta aconteceu durante a expedição, e não depois dela.
 */
import { derivar } from './seed.mjs';
import { semente } from './instancia.mjs';
import { efeitosDa } from './foco.mjs';
import { PERFIS, sortearEncontros, pesoDaRaridade } from './expedicao.mjs';
import { sortearItens, agrupar } from './drops.mjs';
import { moedasDa, idDaMoeda, idDoMaterial } from './economia-idle.mjs';
import { viesFinal, cabeNoEstagio, nivelDoTopo } from './estagios.mjs';
import { batalhasDa } from './npc.mjs';
import { xpDaExpedicao, vinculoDaExpedicao, creditar, nivelDe } from './nivel-criatura.mjs';
import { treinoDaJanela } from './ausente.mjs';
import { xpPorHoraTreino, xpTetoDoBanco } from './treino-offline.mjs';
import { FRAGMENTOS_POR_ENCONTRO } from './captura.mjs';

export function contaDaColheita({ pack, expedicao: x, criaturas = [], raiz, bonus = null, agora, treinoOffline = null }) {
  const estagio = x.estagio ?? 1;
  const acha = id => criaturas.find(c => c.id === id);
  const equipe = (x.equipe ?? []).map(acha).filter(Boolean);

  /* O foco, UMA vez, para os três sorteios (1.16). */
  const efeitos = efeitosDa(equipe, x.perfil);
  const encontros = sortearEncontros(semente(derivar(raiz, 'encontro')),
    { pack, bioma: x.bioma, perfil: x.perfil, estagio, efeitos,
      membros: (x.equipe ?? []).length || 1, bonus, agora });
  const itens = agrupar(sortearItens(semente(derivar(raiz, 'saque')), {
    pack, bioma: x.bioma, perfil: x.perfil, estagio,
    vies: viesFinal(PERFIS[x.perfil]?.vies ?? 0, estagio),
    cabe: cabeNoEstagio, peso: pesoDaRaridade,
    focoItemRaro: efeitos.itemRaro, focoMaterial: efeitos.material,
  }));

  const bolsa = {};
  const somar = (chave, n) => { bolsa[chave] = (bolsa[chave] ?? 0) + n; };
  for (const it of itens) somar(it.classe === 'essencia' ? idDoMaterial(pack) : it.id, it.quantidade);
  const moedas = moedasDa(semente(derivar(raiz, 'moeda')), { perfil: x.perfil, encontros: encontros.length });
  if (moedas > 0) somar(idDaMoeda(pack), moedas);

  /* Alguns encontros eram treinadores (1.7b): saem do FIM da fila. */
  const xpUnitario = xpDaExpedicao({ perfil: x.perfil, encontros: 1, estagio });
  const npc = batalhasDa(semente(derivar(raiz, 'treinador')), {
    encontros: encontros.length, estagio,
    nivelEquipe: nivelDoTopo(equipe.map(c => ({ nivel: nivelDe(c.xp) }))), xpBase: xpUnitario,
  });
  const selvagens = npc.quantas ? encontros.slice(0, encontros.length - npc.quantas) : encontros;
  if (npc.material > 0) somar(idDoMaterial(pack), npc.material);

  /* Quem foi ganha XP e vínculo; quem ficou treinou (A7) — nunca os dois.
     A marca do treino é da CRIATURA (`treinadoAte`), e não da expedição: com
     duas vagas em campo as janelas se cruzam, e quem não pode receber a mesma
     hora duas vezes é ela. A janela acaba em `terminaEm`, e não no `agora`:
     pagar pelo tempo parado esperando a colheita premiaria demorar a voltar. */
  const xp = xpDaExpedicao({ perfil: x.perfil, encontros: selvagens.length, estagio }) + npc.xpExtra;
  const vinculo = vinculoDaExpedicao({ minutos: PERFIS[x.perfil]?.minutos ?? 0 });
  const credito = [], subiram = [];
  for (const id of x.equipe ?? []) {
    const c = acha(id);
    if (!c) continue;
    const r = creditar(c, { xp, vinculo });
    credito.push({ id, xp: r.xp, nivel: r.nivel, vinculo: r.vinculo });
    if (r.subiu > 0) subiram.push({ id, para: r.nivel, quantos: r.subiu });
  }
  const treinados = treinoDaJanela({ criaturas, equipe: x.equipe ?? [], de: x.iniciadaEm, ate: x.terminaEm, xpPorHora: xpPorHoraTreino(treinoOffline?.estagio??estagio), xpTeto: xpTetoDoBanco(criaturas) });
  for (const t of treinados) {
    const c = acha(t.id);
    if (!c) continue;
    const r = creditar(c, { xp: t.xp, vinculo: t.vinculo });
    credito.push({ id: t.id, xp: r.xp, nivel: r.nivel, vinculo: r.vinculo, treinadoAte: t.ate });
    if (r.subiu > 0) subiram.push({ id: t.id, para: r.nivel, quantos: r.subiu, treino: true });
  }

  return {
    /* O TOTAL sorteado é o que o teto conta — o NPC ocupa o encontro (1.7b). */
    total: encontros.length,
    selvagens,
    fragmentos: selvagens.map(en => ({ dex: en.dex, n: FRAGMENTOS_POR_ENCONTRO })),
    pendentes: selvagens.map((en, i) => ({
      chave: `${x.id}:${i}`, expedicao: x.id, dex: en.dex, raridade: en.raridade, bioma: x.bioma, em: agora,
    })),
    itens, moedas, bolsa, npc, xp, vinculo, credito, subiram,
    treino: treinados.map(t => ({ id: t.id, xp: t.xp, vinculo: t.vinculo })),
  };
}
