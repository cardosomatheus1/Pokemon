/* OS TRÊS PERFIS DE EXPEDIÇÃO (bloco 1.20, camada 4).
 *
 * Saiu do `idle-tela` quando ele passou de 600 linhas, e a divisão é por
 * assunto: aqui vive a ESCOLHA DE DURAÇÃO, e nada mais.
 *
 * ── O CARTÃO DIZ O QUE É, O QUE RENDE E O QUE CUSTA ──────────────────────
 *
 * É a regra que o dono fixou como padrão do projeto, e este cartão foi o
 * exemplo que ele deu:
 *
 *   > "por exemplo no print contém a informação do que é a trilha, quanto
 *   >  tempo, o que faz e etc. Uma explicação resumida e breve"
 *
 * Quatro linhas por cartão, e cada uma responde uma pergunta:
 *
 *     o ROTULO e a DURAÇÃO   "Trilha · 3 h"
 *     o RESUMO               "o meio-termo"
 *     o DETALHE              "uma noite fora, e volta com um pouco de tudo"
 *     o CUSTO                "−45 stamina por criatura"
 *
 * O custo tem o mesmo destaque do resto de propósito. Uma escolha em que só o
 * ganho aparece não é escolha — é um menu com um item bom e dois enfeites.
 *
 * ── E "45 min" NÃO É INFORMAÇÃO ──────────────────────────────────────────
 *
 * Informação é *"muitos encontros, quase todos comuns"*. A duração sozinha diz
 * quanto esperar e não diz o que se ganha esperando — e a escolha de duração só
 * é escolha quando os dois lados da troca estão na tela.
 */
import { $ } from './dom.mjs';

/* O QUE CADA PERFIL SIGNIFICA, em palavras.
 *
 * Os números vêm do motor; a frase é daqui, porque ela é leitura e não regra.
 * Sem ela a tela ofereceria três durações e nenhuma diferença — e a escolha,
 * que é o coração do idle, viraria "clique no maior". */
export const FALA_DO_PERFIL = {
  batida:  { cor: 'var(--green)', resumo: 'muitos encontros, quase todos comuns',
             detalhe: 'o melhor ritmo por hora — para quando você está aqui' },
  trilha:  { cor: 'var(--gold)',  resumo: 'o meio-termo',
             detalhe: 'uma noite fora, e volta com um pouco de tudo' },
  vigilia: { cor: '#8f7bff',      resumo: 'poucos encontros, e os raros aparecem',
             detalhe: 'oito horas — é a que se manda antes de dormir' },
};

/* A duração em palavra de gente: minutos abaixo de uma hora, horas acima.
   "180 min" é a mesma coisa que "3 h" e obriga o jogador a dividir. */
export const duracaoDe = minutos =>
  minutos < 60 ? `${minutos} min` : `${minutos / 60} h`;

/* Recebe os perfis e o escolhido por parâmetro, e não lê estado: é o que deixa
   o cartão ser montado num teste sem navegador. */
export function montarPerfis(perfis, escolhido) {
  return Object.entries(perfis ?? {}).map(([id, p]) => {
    const f = FALA_DO_PERFIL[id] ?? { cor: 'var(--gold)', resumo: '', detalhe: '' };
    return `
      <button class="idlePerfil${id === escolhido ? ' on' : ''}" data-perfil="${id}"
              style="--corPerfil:${f.cor}">
        <b>${p.rotulo}</b><span class="idleDur">${duracaoDe(p.minutos)}</span>
        <span class="tiny">${f.resumo}</span>
        <span class="tiny idleDet">${f.detalhe}</span>
        <span class="idleCusto">−${p.custo} stamina por criatura</span>
      </button>`;
  }).join('');
}

export function pintarPerfis(perfis, escolhido) {
  const alvo = $('#idlePerfis');
  if (!alvo) return 0;
  alvo.innerHTML = montarPerfis(perfis, escolhido);
  return alvo.querySelectorAll('.idlePerfil').length;
}
