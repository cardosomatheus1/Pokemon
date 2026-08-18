/* Utilidades de DOM. Sem estado, sem dependência — é o único módulo que
   todos podem importar sem criar ciclo. */

const $ = s => document.querySelector(s);

/* O painel de log é o único elemento que este módulo guarda: `log()` é
   chamada de toda parte, e passar o alvo em cada chamada só empurraria o
   acoplamento para quem chama. */
const logBox = $('#log');

function log(html){
  const d = document.createElement('div');
  d.innerHTML = html;
  logBox.appendChild(d);
  while (logBox.children.length > 260) logBox.removeChild(logBox.firstChild);
  logBox.scrollTop = logBox.scrollHeight;
}

export {
  $,
  log,
};
