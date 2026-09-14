/* O QUE ESTA ACONTECENDO AGORA (bloco 1.10, camada 4).
 *
 * Saiu de `idle-tela.mjs` quando ele passou de 600 linhas pela quarta vez, e a
 * divisao continua sendo por RESPONSABILIDADE:
 *
 *     idle-tela      a ESCOLHA — para onde, com quem, por quanto tempo
 *     idle-estagios  a PROFUNDIDADE — quao fundo, e o que mora la
 *     idle-paineis   o RESULTADO — o que apareceu, o que se pegou
 *     idle-campo     o AGORA — quem esta fora, quanto falta, quanto do dia sobrou
 *
 * As quatro perguntas sao diferentes, e o jogador faz uma de cada vez. Este
 * arquivo e o unico que muda a cada segundo, e por isso ele fica sozinho: o
 * relogio repinta so o que o relogio move.
 *
 * `E` entra por argumento, como nos outros: quem desenha nao guarda.
 */
import { $, nosDois } from './dom.mjs';
import { PACK, nomeExibido } from './motor.mjs';
import { retratoAnimado } from './sprites.mjs';
import {
  emCampo, encontrosHoje, estadoDoTeto, comprometido, TETO_ENCONTROS, concluidasHoje,
  especiesVistas, tetoDeEncontros, proximoEncontro, totalDeEspecies,
  PERFIS, vagasDe, proximaVagaDe,
} from './idle-dados.mjs';

/* O RELOGIO DESTE ARQUIVO. Ele veio junto na extracao e a definicao ficou para
   tras — `agora` era do `idle-tela.mjs`. O erro so aparecia NA TELA, e nenhuma
   suite de Node falou sobre ele: e a mesma familia da L-103, chegando pela
   outra ponta (la e o import que nao acha; aqui e o simbolo que nao veio). */
const agora = () => Date.now();

/* O NOME DO REGISTRO VEM DO PACK (§0.3). O motor fala `registro`, neutro; o
   TEMA diz como ele se chama para quem joga. Reserva para pack que nao declare. */
const nomeDoRegistro = () => PACK.rotulos?.registro ?? 'registro';

const esp = dex => (PACK.especies ?? []).find(e => e.dex === dex) ?? { n: "?", dex };

/* ── O TEMPO EM PALAVRAS ───────────────────────────────────────────────────
 *
 * "6h 12min" e não "372 minutos": quem olha uma contagem quer saber se dá tempo
 * de fazer outra coisa, e minuto acumulado não responde isso. */
export function faltando(ms) {
  if (ms <= 0) return 'pronta';
  const min = Math.ceil(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}


/* ── AS VAGAS, EM PALAVRAS ────────────────────────────────────────────────
 *
 * Duas frases diferentes para dois estados diferentes, e a distinção é o ponto:
 * "faltam 15 espécies" convida a continuar; "todas abertas" encerra. Um número
 * que chega a zero e fica não diz qual dos dois é.
 *
 * Diz de onde a vaga vem, sempre. Uma recompensa cujo caminho o jogador não
 * consegue ver é indistinguível de sorte — e ele para de perseguir. */
function vagasEmPalavras(E) {
  const usadas = emCampo(E).length, total = vagasDe(E);
  const prox = proximaVagaDe(E);
  const base = `<b class="vagaConta">${usadas}/${total}</b> vaga(s) em campo`;
  if (!prox) return base + ' · <i class="vagaFim">todas abertas</i>';
  return base + ` · <i class="vagaProx">a ${prox.vaga}ª abre com ${prox.em} espécies` +
         ` no Pokédex (faltam ${prox.faltam})</i>`;
}


export function pintarCampo(E) {
  /* O MESMO painel serve ROTAS e ROTA OFF — ver `nosDois` no dom.mjs. */
  const alvos = nosDois('Campo');
  const alvo = alvos[0];
  /* ESCREVE NOS DOIS. Uma função explícita, e não um objeto com setter: a
     versão anterior era um espelho engenhoso que o `test/origem` leu como
     chamada de `innerHTML(...)` — e ele estava certo em desconfiar.
     Esperteza que confunde quem lê o código confunde quem o analisa. */
  const escrever = html => { for (const el of alvos) el.innerHTML = html; };
  if (!alvo) return;
  const t = agora();
  const emCurso = emCampo(E);
  const feitas = concluidasHoje(E, t);

  /* O TETO DIÁRIO É DE ENCONTROS (D-052), e a tela tem de dizer isso — ela
     dizia "expedições hoje", que virou mentira: com o teto em encontros, cinco
     Batidas cabem e duas Vigílias não. Mostrar a unidade errada faria o jogador
     contar a coisa errada e ser recusado sem entender. */
  /* ── O NÚMERO DO MEIO, E POR QUE ELE PRECISOU APARECER ─────────────────
     O dono leu a tela e não fechou a conta: *"diz que estou no teto de 30
     encontros porém ali embaixo marca 15/30, não entendi"*.

     Os dois números estavam certos. Faltava o terceiro. Uma expedição que sai a
     campo RESERVA o máximo do perfil dela na hora — é assim que o teto não é
     furado por quem manda três Vigílias juntas — e devolve a diferença ao
     colher. Com 15 colhidos e uma Trilha em campo, 8 já estão comprometidos: a
     próxima Trilha daria 31, e é recusada.

     Mostrar só o colhido e depois recusar é o pior dos dois mundos: o jogador
     vê folga e leva "não". A reserva agora é visível, porque um limite que o
     jogador não consegue prever é indistinguível de um limite quebrado. */
  /* ── O TETO É O DE HOJE, E A ESCADA APARECE (1.19) ──────────────────────
     `TETO_ENCONTROS` virou o PISO: o registro de espécies levanta o teto a
     partir das 60. Mostrar o piso quando o jogador já subiu seria mentir por
     omissão — e mentira por omissão num contador é o D-067 de novo.

     E o PRÓXIMO DEGRAU vem junto, sempre. É a regra que o dono acabou de
     tornar padrão: onde há uma escolha ou um limite, diz-se o que ele é e o
     que o move. Sem isso, as 101 espécies depois da última vaga não teriam
     motivo visível para existir. */
  const vistas = especiesVistas(E);
  const total = totalDeEspecies(PACK);
  const tetoHoje = tetoDeEncontros(vistas, total);
  const usados = encontrosHoje(E, t);
  const reservado = Math.max(0, comprometido(estadoDoTeto(E, t, PACK)) - usados);
  const livre = Math.max(0, tetoHoje - usados - reservado);
  const px = proximoEncontro(vistas, total);
  const escada = px
    ? `<i class="tetoEscada">+${px.ganho} ${px.completo ? `ao COMPLETAR o ${nomeDoRegistro()}` : `com ${px.em} espécies no ${nomeDoRegistro()}`}` +
      ` (faltam ${px.faltam})</i>`
    : `<i class="tetoEscada cheia">${nomeDoRegistro()} completo — teto máximo</i>`;
  const teto = `<span class="idleTeto"><em>${usados}/${tetoHoje} encontros hoje</em>` +
    (reservado ? `<b class="tetoRes">+${reservado} reservados</b>` +
                 `<i class="tetoLivre">${livre} livres</i>` : '') + escada + '</span>';

  if (!emCurso.length) {
    escrever(`<p class="tiny">Nenhuma expedição em campo. ${teto}</p>`);
    return;
  }
  /* ── QUEM ESTÁ EM CAMPO TEM CARA, E NÃO SÓ CONTAGEM (bloco 1.9) ────────
   *
   * A versão anterior escrevia "1 criatura(s) em campo". Com UMA expedição isso
   * bastava: só havia uma resposta possível. Com quatro, "1 criatura(s)" quatro
   * vezes é a mesma frase repetida — e o desenho do dono é justamente que cada
   * expedição tenha o SEU bicho no SEU bioma.
   *
   * O retrato responde "quem está onde" de relance, que é a pergunta que o
   * jogador faz ao abrir a aba. Nome sozinho obrigaria a ler quatro linhas. */
  escrever(emCurso.map(x => {
    const b = (PACK.biomas ?? []).find(y => y.id === x.bioma);
    const p = PERFIS[x.perfil];
    const falta = x.terminaEm - t;
    const cheio = Math.max(0, Math.min(1, 1 - falta / (x.terminaEm - x.iniciadaEm)));
    const equipe = (x.equipe ?? [])
      .map(id => E.criaturas.find(c => c.id === id)).filter(Boolean);
    return `
      <div class="idleEmCampo${falta <= 0 ? ' pronta' : ''}"
           style="--corBioma:${b?.paleta?.acento ?? 'var(--gold)'}">
        <span class="ecQuem">${equipe.map(c =>
          retratoAnimado(esp(c.dex), 'class=\"ecArte\" title=\"' + nomeExibido(esp(c.dex).n) + '\"', false)
        ).join('')}</span>
        <span class="ecTexto">
          <span class="ecOnde"><b>${p?.rotulo ?? x.perfil}</b> em <b class="ecBioma">${b?.rotulo ?? x.bioma}</b></span>
          <span class="idleBarra grande"><i style="--ench:${(cheio * 100).toFixed(1)}%"></i></span>
          <span class="idleFalta">${faltando(falta)}</span>
        </span>
        ${falta <= 0 ? `<button class="btn gold" data-colher="${x.id}">Colher</button>` : ''}
      </div>`;
  }).join('') + `<p class="tiny idleContas">${teto}</p>` +
     `<p class="tiny idleContas">${vagasEmPalavras(E)}</p>`);
}
