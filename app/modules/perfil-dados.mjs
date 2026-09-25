/* O PERFIL COMO DADO — carregar, gravar, e a projeção do servidor.
 *
 * Fronteira: guarda o que o jogador progrediu e o que ele escolheu. Não resolve
 * endereço de arte, não desenha, e não conhece DOM. Quem faz isso é o
 * `perfil.mjs`, que reexporta tudo daqui.
 *
 * ── POR QUE ESTE ARQUIVO EXISTE (bloco 0.1, D-045) ─────────────────────────
 *
 * `perfil.mjs` importa `sprites.mjs` e `desafios.mjs`, e os dois tocam o DOM na
 * carga. Isso tornava a progressão impossível de testar no Node sem levantar
 * meia interface — e o critério de saída do F1.10 é justamente um teste que
 * limpa o armazenamento e confere o que sobrou.
 *
 * É o mesmo movimento que já tirou a curva de nível de dentro do `perfil.mjs` e
 * o placar de dentro do `killfeed.mjs`: o que é puro sai da frente do que não é.
 *
 * ── A REGRA É DIVIDIDA, E ISSO É DECISÃO ───────────────────────────────────
 *
 * A carteira tem uma regra forte: COM SESSÃO NÃO SE ESCREVE (`banco.mjs`,
 * `salvar()` devolve cedo). Ela é certa lá — o servidor é dono de cada centavo.
 *
 * Copiá-la inteira para cá apagaria trabalho entregue. O esquema do servidor
 * tem coluna para `xp`, `nome`, `avatar` e `banner_dex`; NÃO tem para `battle`
 * (cena, efeito de nome, moldura) nem para `shiny` (gifs e skins, desbloqueados
 * e equipados). Esses nasceram na V1.15, do R24 ao R43, DEPOIS do F1.10. Um
 * `guardar()` que devolvesse cedo com sessão faria o jogador perder moldura,
 * skin equipada e desbloqueio shiny no primeiro reload.
 *
 *     servidor é dono de   xp · desafios do dia · trilha de login
 *     localStorage é dono  avatar · banner · battle · shiny · estatísticas
 *
 * Enquanto o servidor não tiver onde guardar cosmético — lacuna registrada, não
 * esquecimento — o cliente continua sendo a fonte dele, COM ou SEM sessão. O
 * teste `com sessão, o cosmético continua sendo gravado localmente` é o que
 * impede esta linha de ser desfeita em silêncio.
 *
 * ── A LEITURA CONTINUA SÍNCRONA ────────────────────────────────────────────
 *
 * Mesma razão do `banco.mjs`: `nivelDoPerfil()` é perguntado no meio do desenho
 * de tela por vários módulos. Quem escreve fala com o servidor e reidrata; quem
 * lê lê a projeção.
 */
import { S } from './estado.mjs';
import { api } from './api.mjs';
import { hidratarPosse, aplicarEquipados } from './posse-atual.mjs';
import { relatar, eventosDoEstado, diaDaSessao } from './telemetria-servidor.mjs';
import { carregar } from './idle-dados.mjs';
import { nivelDe, progressoNivel } from '../../engine/progressao.mjs';

export const CHAVE = 'ar_profile';

export const PROFILE_DEFAULT = {
  name:'Treinador', since:0, betsCount:0, winsCount:0,
  totalBet:0, totalWon:0, totalLost:0, biggestWin:0,
  mons:{},        // quantas vezes apostou em cada Pokémon
  types:{},       // idem por tipo (um dual-type conta nos dois)
  winMons:{},     // vitórias por Pokémon
  avatar:{kind:'trainer', id:'red'},
  /* `scene` saiu no R10: o banner do perfil veste a mesma cena dos outros dois. */
  banner:{dex:9},
  /* Cosméticos do BANNER DE BATALHA (V1.15) — cenário, efeito de nome e, desde
     o R40, a moldura do avatar.
     Separado de `banner`, que é o banner do PERFIL: são duas telas, duas
     escolhas, e juntá-las obrigaria a mudar as duas ao mesmo tempo.
     Perfil salvo antes do R40 chega aqui sem `moldura`, e é por isso que o
     banner passa o valor por `cosmeticoValido` em vez de usá-lo direto —
     `undefined` cai no padrão como qualquer id desconhecido (S70). */
  battle:{cena:'cidade', efeito:'neon', moldura:'neon'},
  /* Cosméticos shiny (V1.15). `gifs`/`skins` guardam o que foi DESBLOQUEADO;
     `onGif`/`onSkin` guardam o que está EQUIPADO. Dois estados de propósito:
     quem desbloqueou pode querer o visual normal de volta sem perder a
     conquista. Ver a fonte do desbloqueio em `shiny-dados.mjs`. */
  shiny:{gifs:[], skins:[], onGif:{}, onSkin:{}},
  xp:0,           // experiência acumulada do treinador
  pin:null,       // PIN local opcional (não é segurança de verdade)
  histBets:[],    // histórico de apostas (ganhos e perdas)
  daily:null,     // desafios do dia (ver rollDaily)
  dailyDone:0,    // desafios concluídos no total (histórico)
};

export function loadProfile(){
  let p;
  try { p = JSON.parse(localStorage.getItem(CHAVE)); } catch(e) {}
  if (!p || typeof p !== 'object') p = {};
  // migração campo a campo: preserva o que já existe, completa o resto
  for (const k in PROFILE_DEFAULT){
    if (p[k] === undefined || p[k] === null){
      const d = PROFILE_DEFAULT[k];
      p[k] = (typeof d === 'object') ? JSON.parse(JSON.stringify(d)) : d;
    }
  }
  /* COMPLETAR TAMBÉM POR DENTRO, e só para os objetos que ganharam campos
     depois de existirem. O laço acima só preenche chave de topo ausente: um
     `shiny` gravado por uma versão que ainda não tinha `onSkin` passaria
     inteiro, e o primeiro `s.onSkin[dex] = true` lançaria. É a diferença entre
     "o campo existe" e "o campo está completo". */
  for (const k of ['shiny', 'battle']){
    const d = PROFILE_DEFAULT[k];
    if (!d || typeof d !== 'object') continue;
    if (typeof p[k] !== 'object' || p[k] === null) { p[k] = JSON.parse(JSON.stringify(d)); continue; }
    for (const sub in d)
      if (p[k][sub] === undefined || p[k][sub] === null)
        p[k][sub] = (typeof d[sub] === 'object') ? JSON.parse(JSON.stringify(d[sub])) : d[sub];
  }
  if (!p.since) p.since = Date.now();
  return p;
}

export function saveProfile(p){ localStorage.setItem(CHAVE, JSON.stringify(p)); }

/* ── O MODO SERVIDOR DO PERFIL ─────────────────────────────────────────────
 *
 * Uma pergunta só, num lugar só — mesma forma do `banco.mjs`. Quem esquece de
 * perguntar não cria um caminho meio-migrado, porque não há o que perguntar. */
export const modoServidor = () => api.temSessao();

/* O que o servidor disse na última hidratação. Nasce vazio e HONESTO: sem
   sessão, ou antes da primeira resposta, a trilha é 0 e não um palpite. */
let doServidor = { sequencia: 0, desafios: [], emitido: null, hidratado: false };

/* Traz o perfil do servidor para a projeção, e registra o dia na trilha.
 *
 * A ORDEM IMPORTA: `entrar` antes de `perfil`. A trilha é um FATO do servidor —
 * ela acontece quando a sessão aparece, não quando o cliente pede —, então
 * registrar depois de ler devolveria uma sequência velha por uma chamada, e o
 * jogador veria a trilha de ontem no primeiro quadro de hoje.
 *
 * Chamar dez vezes é o mesmo que chamar uma: a linha é única por (conta, dia),
 * e `registrarLogin` devolve `repetido` em vez de creditar de novo.
 *
 * Devolve `false` quando não deu, e NÃO inventa progresso: uma projeção vazia é
 * honesta, um XP chutado não. */
export async function hidratarPerfil(){
  if (!modoServidor()) return false;
  await api.post('/api/perfil/entrar', {});
  const r = await api.get('/api/perfil');
  if (!r.ok) return false;

  if (!S.profile) S.profile = loadProfile();
  /* SÓ OS CAMPOS QUE O SERVIDOR POSSUI. Substituir `S.profile` inteiro pelo que
     veio da rota apagaria cosmético e estatística, que a rota não conhece — e
     seria o bloco 0.1 desfazendo do R24 ao R43 por descuido de uma linha. */
  S.profile.xp = r.corpo?.perfil?.xp ?? 0;
  /* O nome vem da conta (ST-7.2b): noutro aparelho não há perfil local. */
  if (r.corpo?.nome) S.profile.name = r.corpo.nome;
  /* A POSSE DE COSMÉTICO VEM JUNTO (E4): o que ele comprou e o que ele vestiu,
     de qualquer aparelho. Limpar o navegador deixa de levar a compra (L-055). */
  const posse = await hidratarPosse(api);
  if (posse?.ok) Object.assign(S.profile, aplicarEquipados(S.profile, posse.corpo?.equipados ?? {}));
  /* A PRESENÇA DO DIA E O DIA DO IDLE (ST-7.1a): o que só o navegador sabe.
     Sem `await` — telemetria não segura o login. */
  const agora = Date.now();
  relatar(api, [{ nome: 'session_started', chave: diaDaSessao(agora), campos: {} }]);
  try { relatar(api, eventosDoEstado(carregar(), agora)); } catch { /* sem idle salvo */ }
  doServidor = {
    sequencia: r.corpo?.sequencia ?? 0,
    desafios:  r.corpo?.desafios ?? [],
    emitido:   r.corpo?.emitido ?? null,
    hidratado: true,
  };
  return true;
}

/* As leituras da projeção. Síncronas de propósito — ver o cabeçalho. */
export const xpDoPerfil    = () => S.profile?.xp ?? 0;
export const nivelDoPerfil = () => nivelDe(xpDoPerfil());
export const progressoDoPerfil = () => progressoNivel(xpDoPerfil());
export const sequenciaDeLogin  = () => doServidor.sequencia;
export const desafiosDoServidor = () => doServidor.desafios;

/* Para o teste e para o boot poderem distinguir "ainda não perguntei" de
   "perguntei e o servidor disse zero". */
export const perfilHidratado = () => doServidor.hidratado;

/* Existe para a suíte poder rodar cada caso do zero: os módulos são singletons
   e o `doServidor` sobreviveria entre testes, fazendo o segundo herdar a
   projeção do primeiro. É a mesma armadilha do `reiniciarCarteira`. */
export function reiniciarProjecaoDoPerfil(){
  doServidor = { sequencia: 0, desafios: [], emitido: null, hidratado: false };
}
