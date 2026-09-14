/* O RESUMO DA EXPEDIÇÃO — o que a confirmação precisa saber (1.24, camada 0).
 *
 * Puro: entra estado e escolha, sai o que a tela vai desenhar. Sem DOM.
 *
 * ── POR QUE ELE SAIU DA TELA, E A RAZÃO É UM NaN ─────────────────────────
 *
 * A primeira versão morava em `idle-confirma.mjs`, que importa `dialogo.mjs` —
 * e aquele importa `dom.mjs`, que toca `document` na carga. **O módulo inteiro
 * não abria em Node**, então o resumo não tinha teste possível.
 *
 * E ele estava errado. `custoDe(perfil, tamanho)` multiplica pelo tamanho da
 * equipe; eu chamei `custoDe(perfil)`, e o cartão desenhou **"89 → NaN"**.
 *
 *   > O número existia, estava errado, e nenhum teste falava sobre ele —
 *   > porque o arquivo onde ele morava não podia ser aberto sem navegador.
 *
 * É a MESMA divisão da captura no 1.23 e da evolução no 1.21: a decisão é pura,
 * o traço é fino. Aqui ela custou um NaN na tela para ser lembrada.
 */
import { PACK, nomeExibido } from './motor.mjs';
import { PERFIS, staminaAgora } from '../../engine/expedicao.mjs';

const esp = dex => (PACK.especies ?? []).find(e => e.dex === dex) ?? { n: '?', dex };

/* "3 h" e não "180 min": quem olha uma duração quer saber se dá tempo de fazer
   outra coisa, e minuto acumulado não responde isso. Mesma regra do `faltando`
   no `idle-campo.mjs` — duas telas que falam de tempo têm de falar igual. */
export function duracaoEmPalavras(minutos) {
  const m = Math.max(0, Math.round(Number(minutos) || 0));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h}h ${r}min` : `${h} h`;
}

/* ── O QUE A CONFIRMAÇÃO PRECISA SABER ───────────────────────────────────
 *
 * Puro: entra estado e escolha, sai o que a tela vai desenhar. Separado do
 * desenho porque é ele que decide o AVISO — e um aviso é regra, não enfeite. */
/* ── A TABELA DE PERFIS ENTRA POR ARGUMENTO ──────────────────────────────
 *
 * `perfis = PERFIS` parece formalidade e não é: sem essa costura, **nenhum
 * teste consegue provar que o piso do aviso VEM do motor**. Comparar
 * `r.piso === 20` com o `20` que a Batida custa hoje é comparar o resultado com
 * a constante que o produziu — e uma sabotagem que escreve `const piso = 20`
 * passa verde por baixo dela.
 *
 *   > Uma costura de injeção que existe só para o teste é suspeita. Esta existe
 *   > porque a afirmação "este número segue o motor" é IMPOSSÍVEL de escrever
 *   > sem ela — e é justamente essa afirmação que o defeito ataca.
 */
export function resumoDa(E, { bioma, perfil, equipe, agora }, perfis = PERFIS) {
  const p = perfis[perfil] ?? {};
  const b = (PACK.biomas ?? []).find(x => x.id === bioma);
  /* ── O CUSTO É POR CRIATURA, E `custoDe` É DA EQUIPE INTEIRA ───────────
     `custoDe(perfil, tamanho)` multiplica pelo tamanho da equipe — é o que o
     motor cobra ao enviar. Aqui a barra é de UMA criatura, e cada uma paga o
     custo do perfil.

     Chamar `custoDe(perfil)` sem o tamanho devolvia **NaN**, e o cartão dizia
     "89 → NaN". Foi a captura que mostrou: o número existia, estava errado, e
     nenhum teste falava sobre ele porque nenhum teste desenhava o cartão. */
  const custo = perfis[perfil]?.custo ?? 0;
  const membros = (equipe ?? []).map(id => {
    const c = (E?.criaturas ?? []).find(x => x.id === id);
    if (!c) return null;
    const antes = Math.round(staminaAgora(c, agora));
    return {
      id, dex: c.dex, nome: nomeExibido(esp(c.dex).n),
      nivel: Math.floor(c.nivel ?? 1),
      antes, depois: Math.max(0, antes - custo),
    };
  }).filter(Boolean);

  /* ── O AVISO É SOBRE O DIA SEGUINTE, E NÃO SOBRE ESTA EXPEDIÇÃO ───────
     Quem fica abaixo de um custo de Batida não consegue sair de novo hoje. É a
     única coisa que a confirmação sabe e o jogador não vê: a stamina volta com
     o tempo, e "vai ficar em 12" não diz nada sozinho.

     O piso é o custo do perfil MAIS BARATO, tirado do próprio motor — escrever
     20 aqui seria o número envelhecendo em silêncio no dia em que a Batida
     mudasse de preço. */
  const piso = Math.min(...Object.values(perfis).map(x => x.custo));
  const travados = membros.filter(m => m.depois < piso);

  /* ── QUANDO TODOS FICAM PRESOS, O AVISO É DA EXPEDIÇÃO ─────────────────
     A Vigília custa 90 de um máximo de 100: depois dela **ninguém** sai de
     novo, sempre. Um aviso que lista os mesmos nomes em toda Vigília vira
     papel de parede, e papel de parede não é lido.

     Quando é a expedição que consome o dia, quem tem de aparecer é ela — e a
     frase muda de sujeito. O teste pegou isto: eu tinha montado um caso com
     uma criatura presa e uma livre, e as duas saíram presas. */
  const todos = membros.length > 0 && travados.length === membros.length;

  return {
    perfil: p.rotulo ?? perfil,
    bioma: b?.rotulo ?? bioma,
    corBioma: b?.paleta?.acento ?? 'var(--gold)',
    duracao: duracaoEmPalavras(p.minutos),
    custo, membros, piso, travados, todos,
  };
}
