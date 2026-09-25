/* A POSSE QUE A TELA LÊ — camada 0 (E4 · metade B).
 *
 * Com conta real a posse de cosmético é do SERVIDOR (`server/cosmeticos.mjs`,
 * metade A); sem conta, continua sendo do navegador, como sempre. A tela não
 * escolhe entre as duas: ela pergunta aqui.
 *
 * ── AS DECISÕES MORAM AQUI, E A TELA SÓ PINTA ───────────────────────────
 *
 * O equipar da customização morava inteiro num `onclick`: gravava a peça no
 * perfil sem perguntar se ela era do jogador — dava para vestir de graça tudo
 * o que a boutique vende. A regra (o que exige posse, qual peça cada clique é,
 * o que o servidor equipou) saiu para funções puras, testáveis em Node, pelo
 * motivo de custo do `CLAUDE.md`: decisão colada ao DOM é mutante de 30 s. */
import { catalogo, carregarPosse } from './cosmeticos.mjs';
import { usarPosseExterna } from './outfit-acervo.mjs';
import { AVATARES as AVATARES_GALERIA } from './artes-dados.mjs';

let doServidor = null;   // { posse: [chave], equipados: { familia: id } } | null

/* De onde vem a posse agora. `deposito` é o do modo local. */
export const posseAtual = (deposito = globalThis.localStorage) =>
  doServidor ? [...doServidor.posse] : carregarPosse(deposito);

export const equipadosDoServidor = () => (doServidor ? { ...doServidor.equipados } : null);

/* Adota o que o servidor disse — ou volta ao modo local com `null`. O traje
   segue junto: o acervo passa a perguntar à mesma lista (ST-4.4, L-157), e o
   `MODO_VITRINE` deixa de valer com conta real (ST-4.3). */
export function adotarDoServidor(x) {
  doServidor = x ? { posse: [...(x.posse ?? [])], equipados: { ...(x.equipados ?? {}) } } : null;
  const outfits = doServidor ? new Set(doServidor.posse) : null;
  usarPosseExterna(outfits ? id => outfits.has(`outfit:${id}`) : null);
}

/* No login com conta real. Sem resposta, NADA muda: a tela continua com o que
   tinha, em vez de ficar sem posse nenhuma. */
export async function hidratarPosse(api) {
  const r = await api?.get?.('/api/cosmeticos').catch?.(() => null) ?? null;
  if (r?.ok) adotarDoServidor(r.corpo);
  return r ?? { ok: false };
}

/* ── O QUE PODE SER EQUIPADO ─────────────────────────────────────────────
 * A peça do catálogo exige posse; a roupa de NPC nunca; o que não é do
 * catálogo (a criatura como retrato, a arte livre) é escolha livre. */
export function podeEquipar(cat, posse, familia, id) {
  if (!familia || id === null || id === undefined) return true;
  const peca = (cat ?? []).find(p => p.familia === familia && p.id === id);
  if (!peca) return true;
  if (peca.procedencia === 'npc') return false;
  return (posse ?? []).includes(`${familia}:${id}`);
}

/* ── QUAL PEÇA CADA CLIQUE É ─────────────────────────────────────────────
 * O `data-*` da grade da customização vira (família, id). O retrato de
 * criatura e a arte livre são do avatar, mas fora do catálogo: id nulo, que o
 * servidor lê como "limpe o slot". O Pokémon do banner não é cosmético. */
export function escolhaDoCosmetico(d = {}) {
  if (d.av) return { familia: 'avatar', id: d.av === 'galeria' || d.av === 'trainer' ? d.id : null };
  if (d.bcena) return { familia: 'cena', id: d.bcena };
  if (d.befeito) return { familia: 'efeito', id: d.befeito };
  if (d.bmoldura) return { familia: 'moldura', id: d.bmoldura };
  return null;
}

/* ── O QUE O SERVIDOR EQUIPOU VOLTA PARA O PERFIL ────────────────────────
 * No login, em qualquer aparelho. Só os slots que o servidor tem: sem avatar
 * lá, o retrato local (fora do catálogo) fica. */
export function aplicarEquipados(perfil, equipados = {}) {
  const p = { ...perfil, battle: { ...(perfil?.battle ?? {}) } };
  if (equipados.avatar) {
    const daGaleria = AVATARES_GALERIA.some(a => a.id === equipados.avatar);
    p.avatar = { kind: daGaleria ? 'galeria' : 'trainer', id: equipados.avatar };
  }
  for (const f of ['cena', 'efeito', 'moldura'])
    if (equipados[f]) p.battle[f] = equipados[f];
  return p;
}

/* O catálogo, por aqui, para a tela não precisar de dois imports para uma pergunta. */
export const catalogoCosmetico = () => catalogo();
