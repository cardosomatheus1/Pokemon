/* Q1/Q2 · O PRESTÍGIO NA ARENA SÓ APARECE PARA QUEM O POSSUI (R24 → ST-14.3b)
 *
 * ── ST-14.3b: O COSMÉTICO DEIXOU DE SER SHINY ──────────────────────────────
 *
 * Com a E14 o shiny é da INSTÂNCIA (nasce do encontro, vai na troca). O que o
 * perfil desbloqueia por nível virou PRESTÍGIO: a mesma regra de quem vê
 * (ter E ter escolhido), mas o desenho é uma aura neon — nunca a paleta
 * shiny, nunca o "✦". O histórico abaixo continua valendo: ele explica a
 * regra de quem vê, que não mudou.
 *
 * ── O QUE ESTAVA ERRADO ────────────────────────────────────────────────────
 *
 * `rodada.mjs` decidia assim:
 *
 *     e.folha = sheetURL(e.f.dex, key, skinShinyAtiva(S.profile, e.f.dex));
 *
 * Isso aplica o MEU shiny a QUALQUER lutador cujo dex eu possua — tenha eu
 * apostado nele ou não. Se eu tenho a skin de Charizard e outro jogador escolhe
 * Charizard, o Charizard dele aparece shiny na minha tela. E ele não tem a skin.
 *
 * ── POR QUE ISSO IMPORTA MAIS DO QUE PARECE ────────────────────────────────
 *
 * O guarda-roupa shiny (R8) vende cosmético por conquista: vagas por nível,
 * desbloqueio por jogar. Um cosmético que aparece em bicho que não é seu — e
 * pior, em bicho de outra pessoa — deixa de ser cosmético. Ele vira uma
 * decoração ambiental, e quem se esforçou para desbloquear não ganhou nada
 * distinguível.
 *
 * A regra que o dono pediu, na letra: **shiny só quando quem SELECIONOU o
 * lutador possui a skin.**
 *
 * ── A FORMA DA FUNÇÃO PREPARA O MULTIJOGADOR ───────────────────────────────
 *
 * Hoje o cliente só conhece o próprio perfil, então "quem selecionou" é sempre
 * "eu ou ninguém". A função recebe isso como ENTRADA em vez de consultar
 * `S.myBet` por dentro — e é de propósito: quando a rodada do servidor passar a
 * dizer quem apostou em quem e com qual skin, o que muda é o argumento, não a
 * regra.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { prestigioNaArena, skinShinyAtiva, atributoPrestigio } from '../app/modules/shiny-dados.mjs';

/* Um perfil com o prestígio de Charizard (dex 6) desbloqueado e equipado. */
const COM_SKIN = { shiny: { skins: [6], onSkin: {}, gifs: [], onGif: {} } };
const SEM_SKIN = { shiny: { skins: [], onSkin: {}, gifs: [], onGif: {} } };
const CHARIZARD = 6, BLASTOISE = 9;

export function suite() {
  const s = criarSuite('shiny-arena');
  const ler = f => readFileSync(new URL(f, import.meta.url), 'utf8');
  const APP = ler('../app/index.html');
  const regra = sel => (APP.match(
    new RegExp(`^${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\{[^}]*\\}`, 'm')) || [''])[0];
  const semComentario = x => x.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

  /* ── A REGRA DE QUEM VÊ, NOS QUATRO CASOS QUE EXISTEM (R24) ──────────────*/
  s.teste('tenho o prestígio E escolhi: aparece', () => {
    ok(prestigioNaArena(COM_SKIN, CHARIZARD, true), 'quem tem e escolheu o lutador não viu o prestígio');
  });
  s.teste('tenho e NÃO escolhi: não aparece', () => {
    ok(!prestigioNaArena(COM_SKIN, CHARIZARD, false), 'o prestígio apareceu num lutador que eu não escolhi');
  });
  s.teste('não tenho e escolhi: não aparece', () => {
    ok(!prestigioNaArena(SEM_SKIN, CHARIZARD, true), 'escolher o lutador passou a dar o prestígio de graça');
  });
  s.teste('não tenho e não escolhi: não aparece', () => {
    ok(!prestigioNaArena(SEM_SKIN, CHARIZARD, false), 'o prestígio apareceu do nada');
  });
  s.teste('a posse vale para a espécie que ela é, e não para todas', () => {
    ok(!prestigioNaArena(COM_SKIN, BLASTOISE, true), 'o prestígio de uma espécie vazou para outra');
  });
  s.teste('sem perfil, o caminho é o normal, e não um erro', () => {
    for (const p of [null, undefined, {}, { shiny: null }])
      igual(prestigioNaArena(p, CHARIZARD, true), false, `perfil \`${JSON.stringify(p)}\` não devolveu o caminho normal`);
  });
  s.teste('desbloqueado mas desligado continua não aparecendo', () => {
    const desligada = { shiny: { skins: [6], onSkin: { 6: false }, gifs: [], onGif: {} } };
    ok(!skinShinyAtiva(desligada, CHARIZARD), 'o `skinShinyAtiva` mudou de comportamento');
    ok(!prestigioNaArena(desligada, CHARIZARD, true), 'o desligado no guarda-roupa voltou a aparecer na arena');
  });

  /* ── A ARENA USA A REGRA, E A FOLHA NUNCA É A SHINY (ST-14.3b) ───────────*/
  s.teste('a arena marca o prestígio pela regra, e a folha é sempre a normal', () => {
    const fonte = ler('../app/modules/rodada.mjs');
    const corpo = semComentario(fonte.slice(fonte.indexOf('function setAnim'), fonte.indexOf('function drawFrame')));
    const nome = (corpo.match(/const (\w+) = prestigioNaArena\(/) || [])[1];
    ok(nome, 'a decisão do prestígio na arena deixou de ser uma variável nomeada');
    ok(new RegExp(`classList\\.toggle\\('prestigio',\\s*${nome}\\)`).test(corpo), 'a marca da arena não usa a regra do prestígio');
    ok(/e\.folha = sheetURL\(e\.f\.dex, key, false\)/.test(corpo),
      'a folha da arena voltou a depender do perfil — o cosmético pintaria de shiny um lutador que não é instância de ninguém');
    ok(/S\.ents\[S\.myBet\.idx\]\s*===\s*e/.test(corpo), 'a regra não identifica ESTA entidade como a apostada');
    ok(!/skinShinyAtiva\s*\(\s*S\.profile/.test(corpo), 'o `setAnim` voltou a perguntar a posse solta');
  });

  s.teste('o preload só pede a folha normal — a shiny não é do perfil', () => {
    const fonte = ler('../app/modules/rodada.mjs');
    const bloco = semComentario(fonte.slice(fonte.indexOf('function preloadSheets'), fonte.indexOf('function diagnosticoFolhas')));
    const pedidos = bloco.match(/conferirFolha\(sheetURL\([^)]*\)\)/g) || [];
    ok(pedidos.length >= 1 && pedidos.every(p => /,\s*false\)/.test(p)), `o preload pede folha shiny pelo perfil: ${pedidos.join(' ')}`);
  });

  /* ── O DESENHO: AURA NEON, NUNCA A PALETA NEM O "✦" ─────────────────────*/
  s.teste('a aura do prestígio é sombra de silhueta neon, e não tinta nem o símbolo do shiny', () => {
    const r = regra('.mon.prestigio .body');
    ok(r && /drop-shadow/.test(r), `a aura não é \`drop-shadow\`: ${r}`);
    for (const proibido of ['hue-rotate', 'sepia(', 'invert(', 'saturate(']) ok(!r.includes(proibido), `\`${proibido}\` repinta o sprite`);
    ok(!/255,\s*214,\s*90/.test(r), 'a aura do prestígio usa o dourado do shiny — os dois se confundem');
    ok(/img\[data-prestigio="1"\]/.test(APP) && /\.temPrestigio::after\{content:'◆'/.test(APP), 'o retrato com prestígio não se marca, ou se marca com outro símbolo');
    ok(!/\.temPrestigio::after\{content:'✦'/.test(APP), 'o prestígio usa o "✦" do shiny');
  });

  s.teste('o shiny verdadeiro continua se anunciando, e só ele', () => {
    const src = ler('../app/modules/sprites.mjs');
    ok((src.match(/shiny \? ' data-shiny="1"' : ''/g) || []).length >= 2, 'a marca `data-shiny` não é condicional nos dois montadores');
    ok(/img\[data-shiny="1"\]/.test(APP), 'ninguém desenha `img[data-shiny="1"]`');
    igual(atributoPrestigio(true), ' data-prestigio="1"', 'o atributo do prestígio');
    igual(atributoPrestigio(false), '', 'o atributo do prestígio sem prestígio');
  });

  s.teste('nenhum retrato do perfil pede a paleta shiny', () => {
    /* Banner, guarda-roupa, vencedor e admin: toda linha que marca o prestígio
       pede a folha NORMAL (`false`) — o que o perfil dá vai no atributo, e a
       paleta shiny é só da instância. */
    let marcadas = 0;
    for (const f of ['banner.mjs', 'customizacao.mjs', 'resultado-tela.mjs', 'adm.mjs']) {
      const c = semComentario(ler(`../app/modules/${f}`));
      for (const l of c.split('\n').filter(x => /(retratoAnimado|dexImg)\(/.test(x) && /atributoPrestigio\(/.test(x))) {
        marcadas++;
        ok(/, false\)/.test(l), `${f}: o retrato com prestígio pede a paleta shiny: ${l.trim().slice(0, 120)}`);
      }
      ok(!/dexImg\([^\n]*,\s*true\)/.test(c), `${f}: um retrato pede a paleta shiny fixa`);
    }
    ok(marcadas >= 8, `só ${marcadas} retratos marcam o prestígio — algum voltou a não marcar`);
  });

  s.teste('o símbolo do banner não disputa o pseudo-elemento do K.O.', () => {
    const src = ler('../app/modules/banner.mjs');
    ok(/class="bnPrestigio"/.test(src), 'o banner não emite o símbolo do prestígio');
    ok(/prestigioNoRetrato\(perfil, dexNoBanner\)/.test(src), 'o símbolo do banner não pergunta a mesma fonte que marca o retrato');
    ok(regra('.bnPrestigio'), 'a regra `.bnPrestigio` sumiu do CSS');
    ok(!/^\.battle-banner\.(shiny|prestigio)::after/m.test(APP), 'o símbolo voltou para o `::after` do banner, que é a marca de K.O.');
  });

  s.teste('a grade do lutador do banner mostra o mesmo GIF, com o prestígio', () => {
    const src = ler('../app/modules/customizacao.mjs');
    const bloco = src.match(/\$\('#pickBannerMon'\)\.innerHTML[\s\S]{0,700}?join\(''\);/);
    ok(bloco && /retratoAnimado\(/.test(bloco[0]), 'a grade do lutador do banner voltou ao retrato parado');
    ok(/gifShinyAtivo\(/.test(bloco[0]) && /atributoPrestigio\(/.test(bloco[0]), 'a grade não mostra o prestígio equipado');
  });

  s.teste('a tela de vencedor exige a escolha (ter apostado no campeão), e não só a posse', () => {
    const fonte = ler('../app/modules/resultado-tela.mjs');
    const corpo = semComentario(fonte.slice(fonte.indexOf('function vencedorImg'), fonte.indexOf('function blocoXP')));
    ok(/prestigioNaArena\(/.test(corpo), 'o retrato do vencedor é decidido pela posse solta');
    ok(/S\.myBet/.test(corpo), 'a tela de vencedor não consulta a aposta');
    ok(!/prestigioNaArena\([^)]*,\s*true\s*\)/.test(corpo), 'o terceiro argumento virou `true` fixo');
    ok(!/gifShinyAtivo\s*\(\s*S\.profile/.test(corpo), 'o `vencedorImg` voltou a perguntar só a posse');
  });

  s.teste('o banner do perfil mostra o prestígio que o jogador equipou', () => {
    const fonte = ler('../app/modules/customizacao.mjs');
    const corpo = semComentario(fonte.slice(fonte.indexOf('function renderBanner'), fonte.indexOf('function renderCustom')));
    const chamada = (corpo.match(/dexImg\(.*$/m) || [''])[0];
    ok(/atributoPrestigio\(gifShinyAtivo/.test(chamada), `o banner do perfil desenha com: "${chamada.trim().slice(0, 100)}"`);
  });

  /* ── O SHINY VERDADEIRO APARECE ONDE A INSTÂNCIA APARECE (ST-14.3b) ─────*/
  s.teste('a carta da criatura e a cena da captura pintam a instância brilhante', () => {
    const carta = semComentario(ler('../app/modules/idle-paineis.mjs'));
    ok(/dexImg\(c\.dex, [^\n]*idleCriaArte[^\n]*, c\.shiny === true\)/.test(carta), 'a carta da criatura ignora o shiny da instância');
    const equipe = semComentario(ler('../app/modules/idle-equipe.mjs'));
    ok(/retratoAnimado\(esp\(c\.dex\), [^\n]*idleCriaArte[^\n]*, c\.shiny === true\)/.test(equipe), 'a carta da equipe ignora o shiny da instância');
    ok(/c\.shiny === true \? '<span class="criaShiny">✦ brilhante<\/span>'/.test(equipe) && /^\.criaShiny\{/m.test(APP), 'a carta da equipe não diz que a criatura é brilhante');
    const cena = semComentario(ler('../app/modules/captura-cena.mjs'));
    ok(/retratoAnimado\(espDe\(dex\), 'class="capForma"', res\?\.shiny === true\)/.test(cena) &&
       /dexImg\(dex, espDe\(dex\)\.n, 'class="capForma"', res\?\.shiny === true\)/.test(cena),
      'a cena da captura não mostra o brilho que o recibo diz');
  });

  return s;
}
