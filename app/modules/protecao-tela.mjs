/* A TELA DE PROTEÇÃO (F1.13, Spec §28.3 e §28.4) — limites e pausa.
 *
 * Fronteira: desenha o que o servidor diz e manda de volta o que o jogador
 * pede. **Nenhuma regra mora aqui.** A assimetria, o cooldown e a
 * irreversibilidade são do servidor; esta tela EXPLICA as três antes do clique,
 * e é só isso que ela faz com elas.
 *
 * A distinção importa mais aqui do que em qualquer outra tela do app: um limite
 * que valesse na interface seria um limite que some quando o jogador abre outra
 * aba. É o item "deixar o limite valer só na interface e não no servidor" da
 * lista de sabotagem do F1.8.
 *
 * ── O QUE O §28.7 PROÍBE, E QUE ESTA TELA TEM QUE RESISTIR A FAZER ─────────
 *
 * A recusa por limite **nunca oferece um caminho alternativo de gasto na mesma
 * tela**. O app já tem uma tela de saldo insuficiente com botão de depositar, e
 * copiar aquele padrão para cá seria o movimento natural — e seria exatamente
 * o padrão escuro que a Spec nomeia.
 *
 * Pela mesma razão não há nada que tente segurar o jogador no caminho da pausa:
 * *"pedido de autoexclusão nunca pode disparar oferta de retenção. Isso precisa
 * estar escrito porque é exatamente o que um funil de retenção otimizado faria
 * sozinho."*
 */
import { $ } from './dom.mjs';
import { api } from './api.mjs';
import { CUR } from './motor.mjs';
/* Os rótulos e a frase da recusa moram num módulo PURO: o §28.3 faz uma
   exigência sobre TEXTO, e texto se confere sem abrir navegador. */
import { ROTULO, quando, mensagemDeBloqueio } from './protecao-texto.mjs';
export { mensagemDeBloqueio };

/* ── O DESENHO ─────────────────────────────────────────────────────────────*/

function linhaDeLimite(tipo, valor, pedido, agora) {
  const atual = valor === undefined ? 'sem limite' : `${CUR} ${valor.toLocaleString('pt-BR')}`;
  /* O PEDIDO PENDENTE APARECE COM O PRAZO. Pedido invisível é pedido que o
     jogador refaz — e refazer não encurta nada, por desenho. */
  const pend = pedido
    ? `<div class="pt-pend">Pedido de aumento para <b>${pedido.valor ?? 'sem limite'}</b> —
         ${agora >= pedido.efetivoEm
           ? `<button class="btn" data-confirmar="${tipo}">Confirmar aumento</button>`
           : `disponível em ${quando(pedido.efetivoEm)}`}</div>`
    : '';
  return `<div class="pt-linha">
      <div class="pt-nome">${ROTULO[tipo] || tipo}<small>${atual}</small></div>
      <input type="number" min="1" step="1" placeholder="novo valor" data-limite="${tipo}">
      <button class="btn" data-definir="${tipo}">Aplicar</button>
      <button class="btn ghost" data-remover="${tipo}">Remover</button>
      ${pend}
    </div>`;
}

export async function abrirProtecao() {
  const caixa = $('#ptCorpo');
  if (!caixa) return;
  caixa.innerHTML = '<div class="pt-carregando">carregando…</div>';

  const [lim, prot] = await Promise.all([api.get('/api/limites'), api.get('/api/protecao')]);

  /* SILÊNCIO NÃO É RECUSA, e a tela diz qual dos dois aconteceu. Sem esta
     distinção, um servidor fora do ar apareceria como "você não tem limites" —
     que é a informação errada exatamente para quem foi ali se proteger. */
  if (lim.indisponivel || prot.indisponivel) {
    caixa.innerHTML = `<div class="pt-erro">Não consegui falar com o servidor.
      Seus limites e sua pausa continuam valendo — eles são guardados lá, não aqui.
      Tente de novo em instantes.</div>`;
    return;
  }
  if (!lim.ok || !prot.ok) {
    caixa.innerHTML = `<div class="pt-erro">Você precisa entrar na sua conta para
      ver e mudar seus limites.</div>`;
    return;
  }

  const agora = Date.now();
  const pedidos = Object.fromEntries((lim.corpo.pedidos || []).map(p => [p.tipo, p]));
  const pausa = prot.corpo.pausa;

  caixa.innerHTML = `
    ${pausa ? `<div class="pt-pausa-ativa">
        <b>Sua conta está em ${pausa.tipo === 'cooloff' ? 'pausa' : 'autoexclusão'}.</b>
        ${pausa.ate ? `Até ${quando(pausa.ate)}.` : 'Sem prazo de término.'}
        Apostar, comprar e transferir ficam bloqueados. Coleção, perfil, histórico
        e carteira continuam abertos para leitura.
      </div>` : ''}

    <h3>Seus limites</h3>
    <p class="pt-regra">
      <b>Diminuir um limite vale imediatamente.</b> Aumentar ou remover é um
      pedido: ele fica disponível depois de <b>24 h</b> e ainda precisa da sua
      <b>confirmação</b>. O prazo é do pedido e não recomeça se você pedir de novo.
    </p>
    <div class="pt-limites">
      ${(lim.corpo.tipos || []).map(t =>
        linhaDeLimite(t, lim.corpo.limites[t], pedidos[t], agora)).join('')}
    </div>

    <h3>Pausar</h3>
    <p class="pt-regra">
      Durante o período nada reabre a conta — <b>é irreversível</b>, e nenhum
      canal encurta. Ao fim do prazo a volta é ativa: você precisa pedir.
    </p>
    <div class="pt-pausas">
      ${(prot.corpo.tipos || []).map(tipo => `
        <div class="pt-linha">
          <div class="pt-nome">${tipo === 'cooloff' ? 'Pausa curta' : 'Autoexclusão'}</div>
          ${(prot.corpo.duracoes?.[tipo] || []).map(d =>
            `<button class="btn ghost" data-pausar="${tipo}" data-dur="${d.id}">${d.id}</button>`).join('')}
        </div>`).join('')}
    </div>`;

  ligar(caixa);
}

function ligar(caixa) {
  caixa.querySelectorAll('[data-definir]').forEach(b => b.onclick = async () => {
    const tipo = b.dataset.definir;
    const campo = caixa.querySelector(`[data-limite="${tipo}"]`);
    const valor = Math.floor(Number(campo?.value));
    if (!Number.isInteger(valor) || valor <= 0) return aviso(caixa, 'Informe um número inteiro maior que zero.');
    await mandar(caixa, '/api/limites', { tipo, valor });
  });

  caixa.querySelectorAll('[data-remover]').forEach(b => b.onclick = async () =>
    /* Remover é AUMENTO, e a tela diz isso antes de mandar — senão o jogador
       clica esperando efeito imediato e conclui que o produto travou. */
    confirmar(caixa, 'Remover um limite é tratado como aumento: leva 24 h e precisa de confirmação.',
      () => mandar(caixa, '/api/limites', { tipo: b.dataset.remover, valor: null })));

  caixa.querySelectorAll('[data-confirmar]').forEach(b => b.onclick = async () =>
    mandar(caixa, '/api/limites/confirmar', { tipo: b.dataset.confirmar }));

  caixa.querySelectorAll('[data-pausar]').forEach(b => b.onclick = async () =>
    confirmar(caixa,
      `Você vai ficar em ${b.dataset.pausar === 'cooloff' ? 'pausa' : 'autoexclusão'} por ` +
      `${b.dataset.dur}. Isso é irreversível durante o período: nem você, nem o suporte, ` +
      `nem ninguém encurta.`,
      () => mandar(caixa, '/api/protecao/pausar', { tipo: b.dataset.pausar, duracao: b.dataset.dur })));
}

/* A confirmação é uma pergunta, e nada mais. Nenhuma tentativa de dissuadir,
   nenhuma alternativa oferecida — ver a nota do cabeçalho sobre o §28.4. */
function confirmar(caixa, texto, seguir) {
  const alvo = caixa.querySelector('.pt-msg') || document.createElement('div');
  alvo.className = 'pt-msg';
  alvo.innerHTML = `<p>${texto}</p>
    <button class="btn" id="ptSim">Confirmar</button>
    <button class="btn ghost" id="ptNao">Voltar</button>`;
  caixa.prepend(alvo);
  $('#ptSim').onclick = () => { alvo.remove(); seguir(); };
  $('#ptNao').onclick = () => alvo.remove();
}

const aviso = (caixa, texto) => {
  const d = caixa.querySelector('.pt-msg') || document.createElement('div');
  d.className = 'pt-msg'; d.textContent = texto; caixa.prepend(d);
};

async function mandar(caixa, caminho, corpo) {
  const r = await api.post(caminho, corpo);
  if (r.indisponivel) return aviso(caixa, 'Não consegui falar com o servidor. Tente de novo.');
  if (!r.ok) return aviso(caixa, r.corpo?.erro || 'Não foi possível concluir.');
  await abrirProtecao();
}
