/* A COLUNA DA DIREITA DA RUN — a equipe e a bolsa (camada 4).
 *
 * Saiu do `avanco-tela.mjs` quando ele passou de 600 linhas, e a divisão é a
 * MESMA que já existia do outro lado — `avanco-painel.mjs` levou a coluna da
 * esquerda pelo mesmo motivo, no A4g:
 *
 *     avanco-painel    a esquerda: o que está ACONTECENDO — stamina, foco, log
 *     avanco-direita   a direita:  QUEM FOI e o que ele carrega
 *     avanco-tela      o meio e a MÃO — a poção, recuar, colher, os cliques
 *
 * A prova de que a linha é de responsabilidade e não de tamanho: este arquivo
 * não tem um único ouvinte de evento, e nada aqui decide nada. Ele LÊ.
 *
 * ── E ELE É A COLUNA QUE RESPONDE "QUEM FOI" ────────────────────────────
 *
 * Enquanto a esquerda responde ao segundo — quanto de vida, que golpe agora —,
 * esta responde de vez em quando: quem está nesta run, quanta stamina sobrou
 * neles, e o que dá para usar. São dois tempos, e por isso duas colunas; foi o
 * arranjo que o dono aprovou em 08/09.
 */
import { $ } from './dom.mjs';
import { PACK, nomeExibido } from './motor.mjs';
import { criaturasDe, vagasDe, proximaVagaDe, bolsaEmLista } from './idle-dados.mjs';
import { falaDoClima } from './avanco-clima.mjs';
import { retratoAnimado } from './sprites.mjs';
import { estiloItem } from './itens-icone.mjs';
import { nomesDe } from './itens-nome.mjs';
import { FALA as FALA_DO_FOCO } from './foco-fala.mjs';
import { NIVEL_PARA_ESCOLHER as NIVEL_DO_FOCO,
         descansando as descansandoFoco } from '../../engine/foco.mjs';
import { staminaAgora } from '../../engine/expedicao.mjs';
/* O anúncio do chefe é LEITURA, e leitura mora deste lado — ver a L-170. */
import { leituraDoChefe } from './avanco-boss.mjs';

const esp = dex => (PACK.especies ?? []).find(e => e.dex === dex) ?? { n: '?', dex };
const nome = dex => nomeExibido(esp(dex).n);

const focoCurto = (c, agora) => {
  const fala = c.foco ? FALA_DO_FOCO[c.foco] : null;
  if (fala) return `<em style="color:${fala.cor}">${fala.nome}</em>`;
  if (descansandoFoco(c, agora)) return 'reaprendendo o foco';
  const nivel = Math.floor(Number(c.nivel) || 1);
  return nivel >= NIVEL_DO_FOCO
    ? '<em>escolher foco</em>'
    : `foco no lv ${NIVEL_DO_FOCO}`;
};

/* ── O CLIMA DA RUN (1.32) ────────────────────────────────────────────────
 *
 * O que este arquivo faz é PINTAR. Quem decide o que está escrito é o
 * `avanco-clima.mjs`, camada 0 — e a divisão não é estética.
 *
 *   > Conta que só pode ser verificada com navegador acaba verificada por
 *   > ninguém.
 *
 * Seis defeitos plantados escaparam do portão Q2 no bloco 1.27 por terem a
 * lógica dentro de uma `innerHTML`. A frase do clima é dado, e um teste sem
 * Chromium afirma cada um dos três estados dela.
 */
export function pintarClima(leitura) {
  const cartao = $('#avClimaCard');
  const alvo = $('#avClima');
  if (!cartao || !alvo) return null;
  const f = falaDoClima(leitura);
  /* Sem clima NENHUM (um pack sem a lista) o cartão some — aí não há o que
     ensinar. É diferente do neutro, que fica: o neutro É o clima de hoje. */
  if (!f) { cartao.hidden = true; return null; }
  cartao.hidden = false;

  const sub = $('#avClimaSub');
  if (sub) sub.textContent = f.estado === 'ativo' ? 'está rendendo' : 'nesta run';

  alvo.dataset.estado = f.estado;
  alvo.innerHTML =
    `<span class="avClimaEmoji">${f.emoji}</span>` +
    `<span class="avClimaTxt"><span class="avClimaNome">${f.titulo}</span>` +
    `<span class="avClimaFrase">${f.frase}</span></span>` +
    (f.pct > 0 ? `<span class="avClimaPct">+${f.pct}%</span>` : '');
  return f;
}

export function pintarEquipe(E, run, agora) {
  const alvo = $('#avEquipe');
  const sub = $('#avEquipeSub');
  if (!alvo) return;
  const vivas = criaturasDe(E);
  const vagas = vagasDe(E);
  if (sub) sub.textContent = `${run.equipe.length} de ${vagas} vaga(s)`;

  const linhas = run.equipe.map(id => {
    const c = vivas.find(x => x.id === id);
    if (!c) return '';
    const s = Math.round(staminaAgora(c, agora));
    /* `dexImg` e `retratoAnimado` devolvem a TAG inteira, e não a URL —
       envolvê-la num `<img src="...">` fecha o atributo no meio e derrama o
       resto como texto. Foi o que o passo OLHAR pegou: a vaga aparecia com um
       `">` antes do nome. */
    /* ── ANIMADO, COMO A COLUNA DA STAMINA ────────────────────────────
       Pedido do dono: *"na aba equipe está uma imagem estática, quero gif
       animado igual ao da stamina da equipe"*.

       Ele não está falando de gosto. São duas colunas da MESMA tela mostrando
       a MESMA criatura, uma parada e a outra andando — e o jogador pergunta o
       que a diferença significa. Ela não significa nada, e uma diferença que
       não significa nada é ruído que custa atenção.

       `retratoAnimado` cai no estático sozinho quando a animação não responde:
       perder o movimento é detalhe, perder o bicho não é. */
    return `<div class="avVaga">` +
      retratoAnimado(esp(c.dex), 'class="avRetrato"', !!c.shiny) +
      `<div class="avQuem"><div class="avNome">${nome(c.dex)} ` +
      `<span>lv ${c.nivel}</span></div>` +
      `<div class="avBarra"><i style="width:${s}%"></i></div>` +
      /* ── SEM O VÍNCULO AQUI TAMBÉM ────────────────────────────────
         Ele foi INTEIRO para a Gen 2, e a coluna do meio já parou de mostrá-lo.
         Deixá-lo nesta é o pior dos dois mundos: um número que não decide nada
         aparecendo num lugar só, e o jogador tentando entender por que ele
         importa aqui e não ali.

         No lugar dele, o FOCO — que é o que decide o baú desta run. A mesma
         resposta da coluna do meio, na forma curta que cabe numa vaga. */
      `<div class="avSub">stamina ${s} · ${focoCurto(c, agora)}</div></div></div>`;
  }).join('');

  /* A VAGA QUE FALTA MOSTRA O CAMINHO, e não só o cadeado — mesma correção do
     D-067: uma parede sem placa é lida como o fim do jogo. */
  const prox = proximaVagaDe(E);
  const travada = prox
    ? `<div class="avVaga travada"><div class="avCadeado">🔒</div>` +
      `<div class="avQuem"><div class="avNome">${prox.vaga}ª vaga</div>` +
      `<div class="avComoAbre">abre com ${prox.em} espécies no registro — ` +
      `faltam ${prox.faltam}</div></div></div>`
    : '';
  alvo.innerHTML = linhas + travada;
}

/* ── O ANÚNCIO DO CHEFE (L-170) ───────────────────────────────────────────
 *
 * Pedido do dono: *"aparece com hp em destaque e nome no meio da tela"*.
 *
 * Quem decide O QUE se lê é o `avanco-boss.mjs`, puro e com teste próprio;
 * aqui só se veste. É a mesma divisão que a leitura do foco fez, e pelo mesmo
 * motivo — o portão Q2 provou quatro vezes que frase dentro de `innerHTML` não
 * tem como ser afirmada.
 *
 * O NOME vem do PACK, e não do motor: o motor entrega um dex, e quem ele é é
 * tema (§0.3). */
export function pintarChefe(cn, run) {
  const alvo = $('#avChefe');
  if (!alvo) return;
  /* O INSTANTE É O DA RUN, e não o do relógio: reabrir a aba tem de cair no
     mesmo caminho de quem nunca fechou (§7.22.16). Um anúncio ancorado em
     `Date.now()` apareceria de novo a cada recarregamento — ou nunca. */
  const l = cn ? leituraDoChefe(cn, cn.t ?? run?.t ?? 0) : null;
  alvo.hidden = !l || l.caiu;
  if (alvo.hidden) return;

  alvo.classList.toggle('beira', !!l.naBeira);
  const nome = alvo.querySelector('.avChefeNome');
  const b = nome?.firstElementChild;
  if (b && l.dex != null) {
    const texto = nomeExibido(esp(l.dex).n);
    /* SÓ QUANDO MUDA: reescrever o texto reinicia a animação de entrada, e o
       nome ficaria pulsando os três segundos inteiros a 60 quadros. */
    if (b.textContent !== texto) b.textContent = texto;
  }
  /* O NOME SAI SOZINHO, e a barra fica — as duas perguntas têm tempos
     diferentes. Ver o cabeçalho do `avanco-boss.mjs`. */
  if (nome) nome.hidden = !l.anunciando;

  const barra = alvo.querySelector('.avChefeBarra i');
  if (barra) barra.style.width = (l.vida * 100) + '%';
  const hp = alvo.querySelector('.avChefeHp');
  const rotulo = l.hp + ' / ' + l.hpMax;
  if (hp && hp.textContent !== rotulo) hp.textContent = rotulo;
}

/* ── A BOLSA ──────────────────────────────────────────────────────────────
 *
 * Só o que dá para usar AGORA. A mochila inteira mora na tela de escolha; aqui
 * ela responde uma pergunta menor e mais urgente — *tenho poção? tenho bola?*
 * Mostrar tudo faria o jogador procurar, e procurar durante a wave é o mesmo
 * que não ter. */
export function pintarBolsaDaRun(E) {
  const alvo = $('#avBolsa');
  if (!alvo) return;
  const rotulo = nomesDe(PACK);
  const itens = bolsaEmLista(E).filter(x => x.quantidade > 0);
  /* ITEM SEM ÍCONE NÃO SOME: ele cai num rótulo curto. A bolsa recebe o que o
     pack manda, e o pack pode mandar coisa nova antes de a arte chegar — é a
     mesma regra que o `idle-paineis` já aplica na mochila. */
  alvo.innerHTML = itens.length
    ? itens.map(x => {
        const est = estiloItem(x.id, 26);
        return `<span class="avSlot" title="${rotulo(x.id)}">` +
          (est ? `<i style="${est}"></i>` : `<u>${rotulo(x.id).slice(0, 3)}</u>`) +
          `<b>${x.quantidade}</b></span>`;
      }).join('')
    : '<span class="tiny">a bolsa está vazia</span>';
}
