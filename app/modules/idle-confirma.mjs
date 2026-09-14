/* A CONFIRMAÇÃO DA EXPEDIÇÃO (bloco 1.24, camada 4).
 *
 * ── POR QUE ELA EXISTE, E NÃO É SÓ PROTEÇÃO CONTRA CLIQUE ERRADO ─────────
 *
 * Pedido do dono, e ele veio junto de uma crítica que um amigo fez ao projeto:
 *
 *   > "muito linear, site de velho, anos 2000"
 *
 * O dono concordou, e eu também. Hoje quase tudo acontece **em linha**: clica,
 * muda, e a página segue. Não há instante em que o jogo PARE.
 *
 *   > **Uma interface sem momentos é uma lista de formulários.**
 *
 * A confirmação é o primeiro momento do caminho da expedição — ela diz *isto
 * aqui importa*. É a mesma família da tela do foco (1.16), da transição de
 * evolução (1.21) e da cena da captura (1.23).
 *
 * ── E ELA MOSTRA, EM VEZ DE PERGUNTAR ────────────────────────────────────
 *
 * A forma que o dono pediu — *"Você confirma x Pokémon para x rota x tempo?"* —
 * cabe numa frase. Mas uma frase obriga a IMAGINAR o que se está mandando, e a
 * decisão real é sobre stamina: mandar um bicho cansado numa Vigília o deixa
 * fora do resto do dia.
 *
 * Então o cartão mostra **quem vai, com quanta stamina antes e depois**. Ver a
 * barra cair é o que transforma "confirmar?" numa decisão de verdade.
 *
 * ── O NÓ É MONTADO AQUI, E O DIÁLOGO SÓ O ANEXA ──────────────────────────
 *
 * `dialogo.mjs` tem uma garantia que não pode cair — o texto vira nós de TEXTO,
 * nunca marcação —, porque ele recebe nome de treinador, que o jogador escolhe.
 * Por isso ele aceita um `HTMLElement` já montado, e não uma string.
 *
 * O que este arquivo interpola é PACK e número, e nada digitado por ninguém.
 */
import { PACK } from './motor.mjs';
import { confirmar } from './dialogo.mjs';
import { estiloIcone } from './icones.mjs';
import { dexImg } from './sprites.mjs';
import { STAMINA_MAX } from '../../engine/expedicao.mjs';
/* A DECISAO E PURA e mora em `expedicao-resumo.mjs`; aqui so se desenha. */
import { resumoDa } from './expedicao-resumo.mjs';

/* ── O CARTÃO ────────────────────────────────────────────────────────── */
function montarCartao(r) {
  const el = document.createElement('div');
  el.className = 'confExp';
  el.style.setProperty('--corBioma', r.corBioma);

  const linha = m => `
    <div class="confCria">
      ${estiloIcone(PACK, m.dex, 40)
        ? `<i class="confArte" style="${estiloIcone(PACK, m.dex, 40)}"></i>`
        : dexImg(m.dex, m.nome, 'class="confArte"')}
      <span class="confNome">${m.nome}<em>NV ${m.nivel}</em></span>
      <span class="confStam">
        <i class="confBarra"><b style="width:${(m.antes / STAMINA_MAX) * 100}%"></b>
           <s style="width:${(m.depois / STAMINA_MAX) * 100}%"></s></i>
        <u>${m.antes} <b>&rarr;</b> ${m.depois}</u>
      </span>
    </div>`;

  el.innerHTML = `
    <div class="confTopo">
      <b class="confPerfil">${r.perfil}</b>
      <span class="confOnde">em <b>${r.bioma}</b></span>
      <span class="confTempo">${r.duracao}</span>
    </div>
    <div class="confLista">${r.membros.map(linha).join('')}</div>
    <p class="confCusto tiny">&minus;${r.custo} de stamina por criatura</p>
    ${aviso(r)}`;
  return el;
}

/* ── A PERGUNTA ──────────────────────────────────────────────────────────
 *
 * Devolve `Promise<boolean>`, como o `confirmar` que ela veste. O texto é curto
 * de propósito: o cartão abaixo dele já diz tudo, e uma frase que repete o
 * cartão só empurra os botões para baixo. */
export function confirmarExpedicao(E, escolha) {
  const r = resumoDa(E, escolha);
  if (!r.membros.length) return Promise.resolve(false);
  const quantos = r.membros.length === 1
    ? '1 criatura' : `${r.membros.length} criaturas`;
  return confirmar(`${quantos} para a ${r.bioma}.`, {
    titulo: 'Mandar a expedição?',
    corpo: montarCartao(r),
    ok: 'Mandar', cancelar: 'Voltar', tom: 'vx',
  });
}

/* ── O AVISO MUDA DE SUJEITO QUANDO TODOS FICAM PRESOS ────────────────────
 *
 * A Vigília custa 90 de um máximo de 100: depois dela ninguém sai de novo,
 * sempre. Listar os mesmos nomes em toda Vigília faria o aviso virar papel de
 * parede — e papel de parede não é lido.
 *
 * Quando é a EXPEDIÇÃO que consome o dia, quem aparece é ela. Quando é UMA
 * criatura que já estava cansada, aparece o nome dela, porque aí a informação é
 * "troque esta" e não "esta expedição é longa".
 *
 *   > Um aviso que dispara sempre não avisa nada. O que muda não é a cor: é o
 *   > SUJEITO da frase.
 */
function aviso(r) {
  if (!r.travados.length) return '';
  const corpo = r.todos
    ? `Depois desta, ninguém sai de novo hoje — a ${r.perfil} consome o dia.`
    : `${r.travados.map(m => m.nome).join(', ')} ` +
      `${r.travados.length > 1 ? 'ficam' : 'fica'} abaixo de ${r.piso} e ` +
      `não ${r.travados.length > 1 ? 'saem' : 'sai'} de novo até descansar.`;
  return `<p class="confAviso tiny">${corpo}</p>`;
}
