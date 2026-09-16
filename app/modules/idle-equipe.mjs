/* O QUE A CENA DO IDLE MOSTRA SOBRE A EQUIPE (bloco 1.17, camada 4).
 *
 * Duas pecas que respondem a mesma pergunta — *quem esta comigo, e como esta?*
 * — e que sairam do `idle-tela` quando ele passou de 600 linhas:
 *
 *     seloDoFoco    a marca no cartao da criatura: o foco escolhido, o
 *                   chamado de "escolher", ou o aviso de reaprendendo
 *     desenharHud   junta o que a CENA mostra de relance e entrega ao
 *                   `idle-hud`, que so desenha
 *
 * A divisao e por assunto e nao por tamanho: as duas leem a criatura e o
 * relogio, e nenhuma delas decide nada — a decisao mora no `engine/foco.mjs`.
 */
import { PACK, nomeExibido } from './motor.mjs';
import { fatorDaEquipe } from '../../engine/expedicao.mjs';
import { retratoAnimado } from './sprites.mjs';
import { nomesDe } from './itens-nome.mjs';
import { emCampo, staminaDe, criaturasDe, ondeAventura, AVENTURAS } from './idle-dados.mjs';
import { PERFIS, STAMINA_MAX } from '../../engine/expedicao.mjs';
import { expedicaoEm, podemIr } from './idle-quem.mjs';
import { pintarEm } from './idle-hud.mjs';
import { $, nosDois } from './dom.mjs';
import { mostra, MODO_PADRAO, proximoModo, resumoDaEvolucao,
         mostraNivelSolto } from './idle-escolha.mjs';
import { FALA as FALA_DO_FOCO } from './idle-foco.mjs';
import { NIVEL_PARA_ESCOLHER as NIVEL_DO_FOCO, descansando as descansandoFoco }
  from '../../engine/foco.mjs';
import { prontasPara, oQueFalta } from './evolucao-idle.mjs';

/* A especie pelo dex. Copia deliberada do `idle-tela`: importar de la criaria
   um ciclo, e a busca e uma linha. */
const esp = dex => (PACK.especies ?? []).find(e => e.dex === dex) ?? { n: '?', dex };

/* ── O SELO DO FOCO NO CARTAO (1.16) ──────────────────────────────────────
 *
 * Tres estados, e o do meio e o que faz a mecanica existir: a criatura que
 * PODE escolher e ainda nao escolheu precisa CHAMAR. Sem esse chamado, o foco
 * seria uma tela que ninguem abre — e um sistema que ninguem descobre nao
 * existe, por melhor que seja.
 *
 * O clique nao propaga para o botao da criatura: escolher foco e mandar para
 * a expedicao sao duas decisoes, e uma nao pode disparar a outra por descuido. */
/* ── O SELO DA EVOLUCAO (1.21) ────────────────────────────────────────────
 *
 * O motor da evolucao existe desde sempre e NINGUEM O CHAMAVA. Este selo e o
 * chamador que faltava — e ele tem tres estados, nao dois:
 *
 *     PRONTA        botao aceso: da para evoluir agora
 *     FALTA ALGO    diz O QUE falta, e nao "nao pode". Recusa sem endereco e
 *                   o D-067, que ja custou um bloco a este projeto.
 *     NAO EVOLUI    nada aparece. Escrever "nao evolui" em toda linha final
 *                   encheria a tela com uma informacao que ninguem procura.
 *
 * O do meio e o que faz a mecanica ser jogavel: "falta o nivel 16" transforma
 * a expedicao seguinte numa decisao. */
export function seloDaEvolucao(c, bolsa, nomeDoItem) {
  const r = oQueFalta(PACK, c, bolsa, nomeDoItem);
  if (!r.evolui) return '';
  if (!r.falta)
    return `<span class="criaEvo pronta" data-evoluir="${c.id}"
                  title="esta criatura pode evoluir agora">evoluir</span>`;
  /* O RECORTE NO CORPO, A FRASE INTEIRA NO `title` (1.27f).

     `"evolui com nível 32"` tem 19 caracteres e quebrava em TRES linhas em
     Press Start 2P — o selo ficava maior que o retrato. O que o D-067 exige e
     que a recusa diga O QUE consertar, e o `title` continua dizendo por
     extenso. O corpo deixou de gritar; nao deixou de falar.

     Quem recorta e o `resumoDaEvolucao`, em camada 0 — mutante de navegador
     custa ~30 s, o mesmo mutante num modulo puro custa ~0,1 s. */
  return `<span class="criaEvo esperando" title="para evoluir: ${r.falta}">`+
         `<em>evolui</em>${resumoDaEvolucao(r.falta)}</span>`;
}

export function seloDoFoco(c, t) {
  const f = c.foco ? FALA_DO_FOCO[c.foco] : null;
  if (f)
    return `<span class="criaFoco" data-foco-abrir="${c.id}" style="--corFoco:${f.cor}"
                  title="${f.resumo} — clique para trocar">${f.nome}</span>`;
  if (descansandoFoco(c, t))
    return `<span class="criaFoco esperando">reaprendendo</span>`;
  if ((Math.floor(c.nivel) || 1) >= NIVEL_DO_FOCO)
    return `<span class="criaFoco chamando" data-foco-abrir="${c.id}"
                  title="esta criatura pode escolher um foco">escolher foco</span>`;
  return '';
}

/* ── O HUD DA CENA (1.17) ─────────────────────────────────────────────────
 *
 * Junta o que a cena precisa mostrar de relance e entrega ao `idle-hud`, que
 * so desenha. A expedicao mostrada e a DESTE bioma — mostrar a de outro lugar
 * seria pior que nao mostrar nenhuma: o jogador leria o tempo errado.
 *
 * A equipe do HUD e a que ESTA EM CAMPO aqui, e nao a selecionada no seletor.
 * Sao coisas diferentes, e confundi-las ja custou um defeito neste arquivo
 * (ver a nota do `expedicaoEm`, no 1.6a). */
export function desenharHud(E, biomaEscolhido, agora) {
  const t = agora;
  const aqui = expedicaoEm(emCampo(E), biomaEscolhido);
  const bioma = (PACK.biomas ?? []).find(b => b.id === biomaEscolhido);
  const equipe = (aqui?.equipe ?? []).map(id => {
    const c = (E.criaturas ?? []).find(x => x.id === id);
    if (!c) return null;
    return { dex: c.dex, nivel: Math.floor(c.nivel ?? 1),
             nome: nomeExibido(esp(c.dex).n),
             stamina: staminaDe(E, c.id, t) };
  }).filter(Boolean);
  pintarEm($('#idleHud'), { expedicao: aqui, equipe, bolsa: E.bolsa,
              moeda: PACK.moedaPve?.id ?? 'pokecoin',
              cor: bioma?.paleta?.acento ?? 'var(--gold)', agora: t });
}

/* ── O CARTÃO DA CRIATURA (mudou de casa no 1.24) ─────────────────────────
 *
 * Ele morava em `idle-tela.mjs`, que passou de 600 linhas pela quinta vez. A
 * divisão continua sendo por RESPONSABILIDADE e não por tamanho: os SELOS do
 * cartão já moravam aqui, e o cartão sem os selos dele era metade de coisa em
 * dois arquivos.
 *
 * A ESCOLHA — perfil, seleção, relógio — entra por argumento. Quem desenha não
 * guarda: é a mesma regra que o `idle-paineis` segue desde o 1.9.
 *
 * ── A POKÉBOLA COMO INTERRUPTOR (L-121) ─────────────────────────────────
 *
 * Palavra do dono:
 *
 *   > "a hora de escolha desse Pokémon pode ser bem simples com um ícone [...]
 *   >  a pokebola [...] ao clicar ele fica aceso e libera o pokémon, ao guardar
 *   >  Pokémon ele se apaga e fica escuro"
 *
 * É a MESMA bola da Pokédex — quarta aparição do mesmo símbolo —, e a repetição
 * é a vantagem: o jogador aprende o símbolo uma vez e o reconhece em quatro
 * lugares.
 *
 * **Acesa = vai a campo. Apagada = fica.** E "apagada" é o mesmo desenho sem
 * cor e sem giro, e não outro desenho: o estado desligado tem de ser
 * reconhecivelmente a mesma coisa, ou vira um segundo ícone que ninguém liga ao
 * primeiro.
 *
 * O clique dela é o MESMO clique do cartão — ela não é um segundo botão. Um
 * interruptor que faz algo diferente do cartão que o cerca seria duas ações
 * onde o jogador vê uma.
 */
export function pintarCartoes(E, { perfil, selecao = [], agora = Date.now(),
                                   modo = MODO_PADRAO } = {}) {
  /* ── O MODO DECIDE O QUE O CARTÃO RESPONDE (L-164) ──────────────────
   *
   * O dono reprovou a tela inteira: *"uma loucura, bagunça total, muito feio e
   * confuso"*. A causa é acúmulo — cada bloco acrescentou um dado ao cartão
   * porque cabia, e ninguém perguntou o que a tela precisa responder NA HORA
   * DE ESCOLHER. Deram dez informações em 90 px.
   *
   * A hora de escolher faz três perguntas: quem é, se pode ir, e o que ele
   * soma. O resto é ficha — e ficha se consulta, não se atravessa onze vezes
   * seguidas.
   *
   * NADA FOI APAGADO: o modo `ficha` devolve a tela de antes, inteira. Ele
   * pediu a forma, o potencial e a natureza em blocos anteriores, e esconder
   * não é apagar.
   *
   * Quem decide o que cada modo mostra é o `idle-escolha.mjs`, em camada 0 e
   * com teste próprio — a lição que o portão Q2 cobrou quatro vezes no bloco
   * passado. */
  const ver = campo => mostra(modo, campo);

  /* ── O BOTÃO DIZ PARA ONDE LEVA, e não onde está ────────────────────
     "ficha" quando o cartão está compacto; "compacto" quando está na ficha.
     Um rótulo que descreve o estado atual faz o jogador clicar para ir aonde
     já está — e é o erro mais comum de botão que alterna. */
  for (const b of nosDois('ModoCartao')) {
    b.textContent = proximoModo(modo) === 'ficha' ? 'ficha' : 'compacto';
    b.classList.toggle('on', modo === 'ficha');
    b.title = modo === 'ficha'
      ? 'mostrando a ficha inteira — clique para voltar ao cartão da escolha'
      : 'o cartão mostra o que a escolha pede — clique para ver a ficha inteira';
  }
  /* O MESMO painel serve ROTAS e ROTA OFF — ver `nosDois` no dom.mjs. */
  const alvos = nosDois('Equipe');
  const alvo = alvos[0];
  /* ESCREVE NOS DOIS. Uma função explícita, e não um objeto com setter: a
     versão anterior era um espelho engenhoso que o `test/origem` leu como
     chamada de `innerHTML(...)` — e ele estava certo em desconfiar.
     Esperteza que confunde quem lê o código confunde quem o analisa. */
  const escrever = html => { for (const el of alvos) el.innerHTML = html; };
  if (!alvo) return;
  const t = agora;
  const custo = PERFIS[perfil]?.custo ?? 0;
  /* SO QUEM PODE IR APARECE AQUI (D-062).

     A lista era `criaturasDe(E)` — TODAS as criaturas, inclusive as da caixa.
     O jogador escolhia uma guardada, clicava em mandar, e so ai ouvia "N
     criatura(s) estao na caixa — tire-as antes". Relato do dono: *"tentei
     enviar outro pokemon do meu time e dizia que so podia o inicial"* — ele
     leu a recusa como uma regra que nao existe.

     E o comentario logo acima ja dizia a regra que o codigo quebrava: *a
     recusa depois de clicar e a pior forma de ensinar uma regra*. Quem esta na
     caixa se move no painel do Centro; oferecer aqui e oferecer o que nao da. */
  const lista = podemIr(criaturasDe(E));
  if (!lista.length) { escrever(''); return; }

  escrever(lista.map(c => {
    const st = Math.round(staminaDe(E, c.id, t));
    /* ── QUEM JÁ ESTÁ FORA APARECE, E APARECE FECHADO (L-162) ────────────
       Pergunta do dono: *"como eu consigo mandar 1 avançar e o mesmo na
       expedição?"* — o dado passou a recusar, e a recusa do dado sozinha
       repetiria o D-062: o jogador clica, ouve "não pode", e lê como uma
       regra que não existe.

       Ela APARECE, e não some da lista. Uma criatura que desaparece do painel
       é lida como perdida — e o jogador vai procurá-la na caixa, onde ela não
       está. Fechada com o lugar escrito, ele sabe onde ir buscá-la. */
    const fora = ondeAventura(E, c.id);
    const pode = st >= custo && !fora;
    const sel = selecao.includes(c.id);
    const f = c.forma ?? { ofensiva: 0, defesa: 0, velocidade: 0 };
    return `
      <button class="idleCria${sel ? ' on' : ''}${pode ? '' : ' seca'}${fora ? ' fora' : ''}" data-cria="${c.id}" data-dex="${c.dex}"
              title="${fora ? 'já está ' + AVENTURAS[fora].onde + ' — recolha antes' : ''}"
              ${pode ? '' : 'disabled'}>
        ${fora ? `<span class="criaFora">${AVENTURAS[fora].selo}</span>` : ''}
        <i class="criaBola${sel ? ' acesa' : ''}" aria-hidden="true"
           title="${sel ? 'vai a campo — clique para tirar' : 'fica — clique para mandar'}"></i>
        ${retratoAnimado(esp(c.dex), 'class=\"idleCriaArte\"', false)}
        <span class="idleCriaNome">${nomeExibido(esp(c.dex).n)}${c.exemplar ? ' <i class=\"exFlag\">✦</i>' : ''}</span>
        <!-- O NIVEL APARECE UMA VEZ SO (1.27f).
             A barra de XP ja traz o nivel na frente dela (NV 36 · 58%). Com as
             duas, o numero saia repetido a quatro pixels de si mesmo — e
             repeticao num cartao de 104 px le como erro de montagem, e nao
             como enfase. Quem decide e o mostraNivelSolto, em camada 0. -->
        ${mostraNivelSolto(modo) ? `<span class="criaNivel">nv <b>${Math.floor(Number(c.nivel) || 1)}</b></span>` : ''}

        <!-- O RAIO DIZ QUE ISTO E ENERGIA, E NAO VIDA (1.19).
             Queixa do dono: a barra "parecia ser da barra de hp do bicho". Ele
             esta certo — uma barra colorida sob um retrato de criatura le como
             HP em qualquer jogo, e o idle NAO TEM hp. Um simbolo custa cinco
             pixels e desfaz a leitura errada; um rotulo escrito custaria uma
             linha em cada cartao. -->
        <span class="idleBarra" title="stamina ${st}/${STAMINA_MAX} — energia para ir a campo, não vida">
          <em class="barraRaio" aria-hidden="true">⚡</em>
          <i style="--ench:${st}%"></i>
          <u style="left:${Math.min(100, custo)}%"></u></span>

        ${ver('xp') ? barraDeXp(c) : ''}

        ${ver('forma') ? `<span class="criaForma" aria-label="forma">
          ${[['ATQ', f.ofensiva,   'of', 'ataque e especial, juntos'],
             ['DEF', f.defesa,     'df', 'vida, defesa e defesa especial'],
             ['VEL', f.velocidade, 've', 'velocidade — quem age primeiro']]
            .map(([r, v, k, ajuda]) => `<span class="fLinha f-${k}" title="${r}: ${ajuda} (${v} de 100)">
                 <u>${r}</u><i><b style="width:${Math.max(4, v)}%"></b></i><s>${v}</s></span>`).join('')}
        </span>` : ''}

        ${ver('potencial') ? `<span class="tiny criaPot">potencial <b>${c.potencial}</b>${
          ver('natureza') && c.natureza ? ` · ${c.natureza}` : ''}</span>` : ''}
        ${seloDoFoco(c, t)}
        ${ver('evolucao') ? seloDaEvolucao(c, E.bolsa, nomesDe(PACK)) : ''}
      </button>`;
  }).join('') + rodapeDaConcentracao(selecao.length, custo));
}

/* ── O QUE MANDAR MAIS GENTE RENDE (L-140, bloco 1.27) ────────────────────
 *
 * O motor passou a pagar mais por concentrar. Se a tela não DISSER isso, a
 * decisão continua invisível — e uma mecânica que o jogador não vê é uma
 * mecânica que não existe para ele.
 *
 *   > Foi a mesma correção do vínculo (L-145): um número que decide e que
 *   > ninguém pode olhar.
 *
 * E ele diz as DUAS metades, porque a escolha só é escolha com as duas: o
 * ganho é decrescente, e o custo de stamina é linear. Mostrar só o ganho
 * venderia concentrar; mostrar só o custo o esconderia. */
function rodapeDaConcentracao(quantos, custoPorCriatura) {
  if (quantos < 1) return '';
  const f = fatorDaEquipe(quantos);
  const total = custoPorCriatura * quantos;
  if (quantos === 1)
    return `<p class="tiny idleConcentra">Mandar mais de um no MESMO bioma rende ` +
           `mais — e o segundo rende mais que o terceiro.</p>`;
  return `<p class="tiny idleConcentra"><b>${quantos} juntos</b> rendem ` +
         `<b class="concGanho">×${f.toFixed(2)}</b> de encontros e itens, e custam ` +
         `<b>${total}</b> de stamina. ` +
         `<i>O ganho é decrescente de propósito: concentrar traz mais do mesmo ` +
         `lugar, espalhar traz variedade.</i></p>`;
}

/* ── A BARRA DE XP (bloco 1.14, fecha a L-099) ────────────────────────────
 *
 * O dono pediu isto no 1.6b e eu recusei, por escrito:
 *
 *   > Um número que nunca anda ensina o jogador que o número é falso.
 *
 * `nivel` era gravado na criação e nunca escrito depois. Desenhar a barra antes
 * teria sido entregar a moldura de uma coisa que não existe — e a moldura vazia
 * é PIOR que a ausência: a ausência ele lê como "ainda não tem"; o número parado
 * ele lê como "tem, e eu não entendi", e passa a desconfiar dos outros números.
 *
 * Agora ela anda, então ela aparece.
 *
 * E O NÚMERO VAI AO LADO DA BARRA (1.18), a pedido do dono. Ele está certo, e o
 * motivo é o mesmo da recusa lá atrás: a barra sozinha diz "perto" ou "longe", e
 * não diz QUANTO. Duas criaturas a 71% e a 79% desenham praticamente o mesmo
 * tracinho, e a decisão de qual mandar depende justamente dessa diferença.
 *
 * INTEIRO, e não com casa: 71,4% num tipo de 9 px vira ruído. No nível máximo o
 * número dá lugar a "MAX" — 100% ali seria verdade e ainda assim enganaria,
 * porque sugere que falta o próximo.
 *
 * Saiu para função própria quando o cartão mudou de casa: ele tinha uma função
 * anônima chamada na hora dentro do template, e isso é um jeito caro de esconder
 * uma função que tem nome. */
function barraDeXp(c) {
  const b = c.barra ?? { nivel: 1, pct: 0, atual: 0, ini: 0, fim: 0, maximo: false };
  const titulo = b.maximo ? 'nível máximo'
    : `${b.atual} de ${b.fim - b.ini} XP para o nível ${b.nivel + 1}`;
  return `<span class="criaNv" title="${titulo}">
    <u>NV ${b.nivel}</u>
    <i class="nvBarra${b.maximo ? ' cheia' : ''}"><b style="width:${b.pct.toFixed(1)}%"></b></i>
    <s class="nvPct${b.maximo ? ' max' : ''}">${b.maximo ? 'MAX' : `${Math.floor(b.pct)}%`}</s>
  </span>`;
}
