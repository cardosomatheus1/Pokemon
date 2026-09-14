/* OS AVISOS DA ABA DO IDLE (bloco 1.21, camada 4).
 *
 * Saiu do `idle-tela` quando ele passou de 600 linhas, e a divisão é por
 * assunto: aqui vive tudo que a tela DIZ ao jogador fora dos painéis —
 *
 *     avisarBanner        o banner de batalha, com o bioma e o tempo restante
 *     avisarCompanheiro   quem anda com o treinador na cena
 *     avisar              a faixa de recado, que aparece e some
 *
 * As três respondem a mesma pergunta: **o que está acontecendo agora?** E as
 * três já foram fonte de defeito por serem regra cercada de DOM — o D-061 e o
 * D-062 nasceram aqui. A regra de quem acompanha mora em `idle-quem.mjs`,
 * camada 0, exatamente por isso: cercada de DOM ela errou quatro vezes seguidas
 * e nenhum teste conseguia falar sobre ela.
 */
import { $, nosDois } from './dom.mjs';
import { PACK } from './motor.mjs';
import { situacaoIdle, renderBattleBanner } from './banner.mjs';
import { emCampo, criaturasDe } from './idle-dados.mjs';
import { quemMostrar, expedicaoEm } from './idle-quem.mjs';
import { acompanhar } from './idle-mundo.mjs';

/* Quanto tempo a faixa de recado fica no ar. Quatro segundos é o que se lê sem
   pressa e some antes de virar poluição — e ela nunca carrega informação que só
   exista ali: recado que some não pode ser a única cópia de nada. */
export const MS_DO_RECADO = 4000;

export function avisarBanner(E, biomaEscolhido, agora) {
  /* A MAIS RECENTE VENCE, e nao a primeira da lista (D-062).

     `find` devolvia a primeira expedicao daquele bioma — e uma expedicao
     PRONTA e nao colhida continua em campo. Terminada uma e mandada outra no
     mesmo lugar, a cena seguia desenhando o bicho da antiga. Relato do dono:
     *"quando acabou eu mandei outro pokemon do time, sem ser o que estava
     anteriormente e nao atualizou"*.

     A regra que ele deu junto e a que vale: *a mudanca da sprite do pokemon em
     um campo de bioma precisa ser atualizada a toda nova expedicao*. A mais
     recente e a que ele acabou de mandar, e e nela que ele esta pensando. */
  const aqui = expedicaoEm(emCampo(E), biomaEscolhido);
  if (!aqui) return situacaoIdle({});
  const b = (PACK.biomas ?? []).find(y => y.id === aqui.bioma);
  return situacaoIdle({
    bioma: b?.rotulo ?? aqui.bioma,
    restanteMs: Math.max(0, aqui.terminaEm - agora),
  });
}

export function avisarCompanheiro(E, biomaEscolhido, equipeEscolhida, agora) {
  /* A REGRA MORA EM `idle-quem.mjs`, camada 0 — ver a nota longa la. */
  const quem = quemMostrar({
    emCampo: emCampo(E), criaturas: criaturasDe(E),
    bioma: biomaEscolhido, selecao: equipeEscolhida,
  });
  acompanhar(quem?.dex ?? null);
  avisarBanner(E, biomaEscolhido, agora);
  renderBattleBanner();
  return quem;
}

export function avisar(texto) {
  /* NAS DUAS ABAS (A4e). O recado é a resposta a um clique — "sem stamina",
     "o teto não comporta" — e ele tem de sair na aba onde o clique aconteceu.
     Escrevê-lo só na de ROTAS deixaria o botão da Rota OFF recusar em silêncio,
     que é a pior forma de recusar: o jogador clica de novo. */
  const alvos = nosDois('Aviso');
  if (!alvos.length) return false;
  for (const a of alvos) {
    a.textContent = texto;
    a.classList.add('on');
    setTimeout(() => a.classList.remove('on'), MS_DO_RECADO);
  }
  return true;
}
