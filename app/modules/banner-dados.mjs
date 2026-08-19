/* Cosméticos do banner de batalha — catálogo puro, sem DOM.
 *
 * São dez cenários e oito efeitos de nome, e nenhum deles baixa um byte: os
 * cenários são gradiente e `::after`, os efeitos são sombra e animação. Quatro
 * cenários e três efeitos chegaram com a identidade do V1.13; os demais vêm da
 * base da v1.0 do porte.
 *
 * A LISTA E O CSS PRECISAM FECHAR NOS DOIS SENTIDOS, e é o que `test/banner.mjs`
 * afirma. Entrada sem classe deixa o jogador escolher um cenário que não
 * desenha — ele salva, volta amanhã e o banner está vazio, sem erro nenhum no
 * console. Classe sem entrada é CSS inalcançável, que fica lá para sempre
 * porque não quebra nada.
 *
 * OS SEIS ANTIGOS CONTINUAM NA LISTA de propósito: quem já tinha um escolhido
 * não perde o visual do banner numa atualização.
 */
export const BN_CENAS = [
  { id:'cidade',    nm:'Cidade Neon' },
  { id:'portal',    nm:'Portal da Arena' },
  { id:'nucleo',    nm:'Núcleo' },
  { id:'grade',     nm:'Grade Synth' },
  { id:'campo',     nm:'Campo Aberto' },
  { id:'deserto',   nm:'Deserto' },
  { id:'cachoeira', nm:'Cachoeira' },
  { id:'caverna',   nm:'Caverna' },
  { id:'noturna',   nm:'Floresta Noturna' },
  { id:'poente',    nm:'Pôr do Sol' },
];

export const BN_EFEITOS = [
  { id:'neon',     nm:'Neon',      ico:'💠' },
  { id:'glitch',   nm:'Glitch',    ico:'📺' },
  { id:'holo',     nm:'Holograma', ico:'🛸' },
  { id:'chama',    nm:'Chama',     ico:'🔥' },
  { id:'gelo',     nm:'Gelo',      ico:'❄️' },
  { id:'veneno',   nm:'Veneno',    ico:'☠️' },
  { id:'trovao',   nm:'Trovão',    ico:'⚡' },
  { id:'fantasma', nm:'Fantasma',  ico:'👻' },
];

/* Mesma guarda do tema (defeito S70): valor guardado que não existe mais cai no
   padrão em vez de deixar a tela sem pele. Chega aqui perfil de versão antiga,
   `localStorage` adulterado, e cosmético retirado da lista. */
export function cosmeticoValido(tipo, id) {
  const lista = tipo === 'cena' ? BN_CENAS : BN_EFEITOS;
  return lista.some(x => x.id === id) ? id : lista[0].id;
}

export const PADRAO_BANNER = { cena: BN_CENAS[0].id, efeito: BN_EFEITOS[0].id };
