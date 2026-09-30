/* A LEAGUE HOME — o que a tela diz, decidido aqui (ST-11.6a · Spec §12 telas 25–26) — camada 0.
 *
 * Puro: entra o que o servidor devolveu em `GET /api/equipe/liga` (e se há
 * conta); sai a tela em palavras — o estado, a barra da temporada, o tier, o
 * time publicado, a ação principal e as últimas partidas. A tela pinta isto e
 * mais nada: cada frase que um mutante pode estragar é pega em Node.
 *
 * Três regras do §9 que moram aqui, e não na tela:
 *   o TIER, nunca o número (§9.7)
 *   o BOT sempre com o rótulo, na linha e no resultado (§9.5: "sem fingir que
 *     são humanos")
 *   a partida FORA DO RANKING diz que ficou fora — sem os números do sinal
 */
import { motivoDaVersao } from './partida-dados.mjs';
import { PRESETS_NA_TELA, presetValido } from './treino-dados.mjs';
import { TIERS } from '../../engine/liga-mmr.mjs';

/* Quem ainda não jogou lê o que a Liga É antes do que ela pede: três passos,
   na ordem em que acontecem. Some quando o time está publicado. */
export const PASSOS = Object.freeze([
  { n: 1, titulo: 'Publique o seu time', texto: 'ele fica congelado como está — evoluir depois não muda a Liga' },
  { n: 2, titulo: 'Busque partida', texto: 'o servidor acha um time da sua faixa; sem ninguém, um bot identificado' },
  { n: 3, titulo: 'Suba de tier', texto: 'vencer sobe, perder desce; a temporada fecha a cada 28 dias' },
]);

export const ROTULO_BOT = 'bot — treinador da jornada, não é um jogador';
const DIA_MS = 86_400_000, DIAS = 28;
const FASES = Object.freeze({
  colocacao:  { nome: 'Colocação',  dias: [1, 7],   dica: 'as primeiras partidas decidem onde você começa' },
  competicao: { nome: 'Competição', dias: [8, 21],  dica: 'cada partida move o seu tier' },
  fechamento: { nome: 'Fechamento', dias: [22, 28], dica: 'o ranking fecha no fim do dia 28' },
});

/* A barra da temporada: as três fases como fatias de 28, e o hoje dentro dela. */
export function barraDaTemporada(t, agora) {
  const resta = Math.max(0, Math.ceil((t.fim - agora) / DIA_MS));
  return {
    titulo: `Temporada ${t.numero}`, fase: FASES[t.fase]?.nome ?? t.fase, dica: FASES[t.fase]?.dica ?? '',
    dia: `dia ${t.dia} de ${DIAS}`, resta: resta <= 1 ? 'termina hoje' : `termina em ${resta} dias`,
    fatias: Object.entries(FASES).map(([id, f]) => ({ id, nome: f.nome, largura: +(((f.dias[1] - f.dias[0] + 1) / DIAS) * 100).toFixed(2), atual: id === t.fase })),
    hoje: +(((t.dia - 0.5) / DIAS) * 100).toFixed(2),
  };
}

/* O efeito de uma partida que contou, pelos nomes dos tiers. */
export function efeitoNoTier(tier) {
  if (!tier) return null;
  const i = n => TIERS.findIndex(t => t.nome === n);
  return i(tier.depois) > i(tier.antes) ? `subiu para ${tier.depois}` : i(tier.depois) < i(tier.antes) ? `desceu para ${tier.depois}` : `tier mantido: ${tier.depois}`;
}

/* Há quanto tempo, sem relógio de parede: a linha diz "há 3 h", e não a hora. */
export function haQuanto(ms) {
  const h = Math.floor(Math.max(0, ms) / 3_600_000);
  return h < 1 ? 'agora há pouco' : h < 24 ? `há ${h} h` : `há ${Math.floor(h / 24)} dia${h < 48 ? '' : 's'}`;
}

/* A escada dos tiers, com o meu aceso e os de baixo já passados: o lugar na
   Liga sem o número (§9.7). */
export const escadaDoTier = tier => {
  const i = TIERS.findIndex(t => t.nome === tier);
  return TIERS.map((t, k) => ({ nome: t.nome, estado: k === i ? 'on' : k < i ? 'passou' : 'falta' }));
};

export function linhaDaPartida(p, agora = null) {
  const bot = p.contra?.tipo === 'bot';
  return {
    id: p.id, lado: p.lado ?? 'B', classe: p.resultado,
    titulo: p.resultado === 'venceu' ? 'Vitória' : p.resultado === 'perdeu' ? 'Derrota' : 'Empate',
    contra: bot ? `contra ${p.contra.nome}` : `contra ${p.contra?.nome ?? 'jogador'}`,
    bot: bot ? ROTULO_BOT : null,
    ranking: bot ? 'não conta no ranking — é bot' : p.rated ? 'contou no ranking' : 'fora do ranking: padrão de partidas entre as mesmas contas',
    /* O SELO curto, colado ao resultado: "contou" ou não é a segunda pergunta
       depois de ganhei/perdi, e não pode ficar no canto em cinza. */
    /* O efeito no tier É o selo da partida que contou — a resposta a "o que mudou" não pode ser o menor texto da linha. */
    selo: bot ? { texto: 'não contou · bot', tipo: 'fora' } : p.rated ? { texto: p.tier ? `contou · ${efeitoNoTier(p.tier)}` : 'contou', tipo: 'ok' } : { texto: 'fora do ranking', tipo: 'fora' },
    /* A frase longa só quando NÃO contou: é ela que explica o porquê; o "contou" já está no selo. */
    /* O que a partida FEZ: a que contou diz o efeito no tier; a fora do
       ranking diz por quê; a do bot, nada além do selo e do rótulo. */
    explica: bot ? 'ninguém da sua faixa na fila — por isso um bot' : !p.rated ? 'padrão de partidas entre as mesmas contas' : null,
    turnos: `${p.turnos} turnos`,
    quando: agora != null && p.quando != null ? haQuanto(agora - p.quando) : null,
  };
}

const idsDo = snap => (snap?.time ?? []).map(x => x.id).join();

/* A tela inteira. `conta`: há sessão de servidor. `dados`: a resposta da rota, ou null. */
/* `acabou`: o id da partida que a busca acabou de jogar — ela sobe para o
   topo como RESULTADO, com o mesmo texto da linha (uma frase só para os dois). */
export function homeDaLiga({ conta, dados, pack, agora, preset, acabou = null }) {
  /* Sem escolha feita, o preset aceso é o do time publicado: a tela não pode
     sugerir que o time luta com um preset que não é o dele. */
  const escolhido = presetValido(preset ?? dados?.meuTime?.preset);
  const presets = PRESETS_NA_TELA.map(p => ({ ...p, on: p.id === escolhido }));
  /* O preset só aparece onde há o que publicar: com o time vazio, ou sem conta, escolher não leva a nada. */
  const comPresets = h => ({ ...h, mostraPresets: ['publicar', 'desatualizado', 'pronto'].includes(h.estado),
    rotuloPresets: h.estado === 'publicar' ? 'preset do time' : 'preset para publicar de novo' });
  if (!conta) return comPresets({ estado: 'sem-conta', presets, passos: PASSOS, acao: { rotulo: 'Entrar com a conta', habilitada: true, tipo: 'entrar' },
    aviso: 'A Liga é jogada contra os times de outros jogadores, guardados no servidor — ela precisa de conta.' });
  if (!dados) return comPresets({ estado: 'sem-rede', presets, acao: { rotulo: 'Tentar de novo', habilitada: true, tipo: 'recarregar' },
    aviso: 'O servidor não respondeu. Nada foi jogado.' });
  const base = {
    presets, barra: barraDaTemporada(dados.temporada, agora),
    tier: { nome: dados.tier, escada: escadaDoTier(dados.tier), /* "no ranking": a partida contra o bot não conta aqui, e a frase não pode
       dizer "nenhuma partida" em cima de uma vitória contra ele. */
    nota: dados.partidas ? `${dados.partidas} partida${dados.partidas === 1 ? '' : 's'} no ranking` : 'nenhuma partida no ranking ainda — todo mundo começa no Bronze' },
    time: dados.meuTime ? { membros: dados.meuTime.time.map(m => ({ dex: m.dex, nivel: m.nivel })), power: dados.meuTime.power,
                            preset: PRESETS_NA_TELA.find(p => p.id === dados.meuTime.preset)?.nome ?? dados.meuTime.preset } : null,
    recentes: (dados.recentes ?? []).map(p => linhaDaPartida(p, agora)),
  };
  /* A partida que acabou sobe para o topo e SAI da lista — a mesma partida
     duas vezes na tela é leitura em dobro, e parece que foram duas. */
  base.resultado = acabou ? base.recentes.find(r => r.id === acabou) ?? null : null;
  if (base.resultado) base.recentes = base.recentes.filter(r => r.id !== acabou);
  base.semHistorico = !base.resultado && !base.recentes.length;
  if (!dados.ligada) return comPresets({ ...base, estado: 'desligada', acao: { rotulo: 'Buscar partida', habilitada: false, tipo: 'buscar' },
    aviso: 'A Liga está em manutenção agora. As partidas jogadas continuam aqui.' });
  /* Sem time na conta NÃO há botão: um botão apagado sem saída é um beco.
     A frase diz o que é e o que vem; o passo 1 aparece bloqueado. */
  if (!(dados.equipe ?? []).length) return comPresets({ ...base, estado: 'sem-equipe', passos: null, acao: null, semHistorico: false,
    titulo: 'Ainda não dá para jogar a Liga',
    aviso: 'Você não tem time na sua conta. A Liga luta só com criaturas guardadas na conta, e levar para ela as que você tem neste aparelho chega numa próxima versão. Quando chegar, é publicar o time e buscar partida.' });
  if (!dados.meuTime) return comPresets({ ...base, estado: 'publicar', passos: PASSOS, acao: { rotulo: 'Publicar meu time', habilitada: true, tipo: 'publicar' },
    aviso: 'Publique o time para entrar: ele fica congelado como está, e é ele que os outros enfrentam.' });
  const velho = motivoDaVersao(pack, dados.meuTime);
  if (velho) return comPresets({ ...base, estado: 'desatualizado', acao: { rotulo: 'Publicar de novo', habilitada: true, tipo: 'publicar' },
    aviso: 'As regras da luta mudaram desde que você publicou. Publique de novo para voltar à fila.' });
  const mudou = idsDo(dados.meuTime) !== (dados.equipe ?? []).map(c => c.id).join();
  return comPresets({ ...base, estado: 'pronto', acao: { rotulo: 'Buscar partida', habilitada: true, tipo: 'buscar' },
    secundaria: { rotulo: 'Publicar de novo', tipo: 'publicar' },
    aviso: mudou ? 'O seu time mudou desde a publicação. A Liga luta com o publicado até você publicar de novo.' : null });
}

/* O REPLAY na tela (ST-11.6b · tela 27): o topo diz o que se está vendo e o
   fim diz o que aconteceu — com a mesma linha da lista (o selo e o porquê),
   e a prova de que a semente estava decidida antes. */
export function replayNaTela(linha, prova) {
  const r = linha ? { venceu: 'Você venceu', perdeu: 'Você perdeu', empate: 'Empate' }[linha.classe] : null;
  return {
    topo: linha ? `replay · ${linha.contra}` : 'replay',
    /* O rótulo de cada lado: o jogador à esquerda; o outro pelo nome — e o bot com o rótulo dele. */
    rotulos: { A: 'seu time', B: linha ? `${linha.contra.replace(/^contra /, '')}${linha.bot ? ' · bot' : ''}` : 'rival' },
    fim: { titulo: r ?? 'Fim', classe: linha?.classe === 'venceu' ? 'venceu' : linha?.classe === 'perdeu' ? 'perdeu' : 'empate',
           selo: linha?.selo ?? null, texto: linha?.explica ?? '' },
    /* A frase curta para quem joga; o detalhe técnico fica no título (o "como sabemos?"). */
    prova: prova == null ? 'conferindo…'
      : prova.ok ? 'resultado travado antes da luta — conferido'
      : 'o resultado NÃO confere com o travado antes da luta — avise o suporte',
    provaDetalhe: 'o servidor gravou o compromisso (SHA-256) da semente antes de jogar; a raiz revelada agora reproduz esse compromisso e esta semente',
    provaOk: prova?.ok ?? null,
  };
}

/* O RANKING NA TELA (ST-11.6c · tela 28). A posição, o nome, o tier e as
   partidas — nunca o número (§9.7). O pódio ganha a medalha; a minha linha
   aparece destacada, e quando eu estou fora do topo ela vem depois de um
   "…", com a minha posição de verdade. As abas: a temporada de agora e as
   fechadas, da mais nova para a mais velha. */
const MEDALHA = { 1: 'ouro', 2: 'prata', 3: 'bronze' };
export function rankingNaTela(r) {
  if (!r) return { vazio: 'O ranking não abriu — o servidor não respondeu.', linhas: [], abas: [] };
  const linha = x => ({ posicao: `${x.posicao}º`, nome: x.nome, tier: x.tier, partidas: `${x.partidas} partida${x.partidas === 1 ? '' : 's'}`,
                        medalha: MEDALHA[x.posicao] ?? null, eu: !!x.eu });
  const linhas = r.linhas.map(linha);
  const foraDoTopo = r.eu && !r.linhas.some(x => x.eu) ? linha(r.eu) : null;
  return {
    titulo: r.atual ? `Temporada ${r.temporada} · ao vivo` : `Temporada ${r.temporada} · final`,
    nota: r.atual ? 'muda a cada partida e fecha junto com a temporada' : 'o ranking gravado quando a temporada fechou',
    /* A ORDEM é pelo desempenho: com o número escondido, a coluna de partidas
       parecia o critério (Q7 da ST-11.6c). */
    ordem: 'a ordem é pelo desempenho nas partidas — o número fica escondido',
    linhas, foraDoTopo,
    suaPosicao: r.eu ? `você: ${r.eu.posicao}º de ${r.total}` : r.atual ? 'você entra no ranking na primeira partida que contar' : 'você não jogou esta temporada',
    vazio: r.linhas.length ? null : r.atual ? 'Ninguém jogou esta temporada ainda — a primeira partida abre o ranking.' : 'Ninguém jogou nesta temporada.',
    /* Sem temporada fechada não há o que escolher: diz isso, em vez de uma pílula solta que parece etiqueta. */
    abas: r.fechadas.length ? [{ temporada: null, rotulo: 'agora', on: r.atual }, ...r.fechadas.map(n => ({ temporada: n, rotulo: `T${n}`, on: !r.atual && r.temporada === n }))] : [],
    semAnteriores: r.fechadas.length ? null : 'primeira temporada — ainda sem anteriores',
  };
}
