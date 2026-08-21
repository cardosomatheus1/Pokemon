/* Q1/Q2/Q5 · O CONTENTPACK ORIGINAL (F1.12) — §0.3.1.
 *
 * O pack Kanto resolve o risco TÉCNICO de depender da franquia; ele não resolve
 * o COMERCIAL. E o motivo do prazo é de produto: a V1 é a primeira versão que
 * gera telemetria real de retenção e LTV, e medir isso sobre o pack Pokémon
 * mede o apelo da nostalgia — número que não sobrevive à troca de tema.
 *
 * Estes testes cobram as duas coisas que o bloco declara como sabotagem:
 * identificador da franquia fora do pack, e queda para o pack Kanto quando algo
 * falha.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { criarMotor, tiposDaPool } from '../engine/engine.mjs';
import { validarPack } from '../engine/pack.mjs';
import original, { RODA, COM_ARTE, silhuetaDe } from '../content/original_v1.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';

const RAIZ = new URL('..', import.meta.url).pathname;
const M = criarMotor(original);

/* Os arquivos de PRODUÇÃO onde nenhum identificador da franquia pode aparecer.
   O pack Kanto fica de fora por definição — ele é o lugar onde eles podem
   estar. Os testes também: eles falam sobre o pack, e proibi-los de nomeá-lo
   tornaria impossível testar que ele existe. */
function fontesDeProducao() {
  const fora = [];
  for (const dir of ['engine', 'server', 'app/modules']) {
    for (const f of readdirSync(RAIZ + dir)) {
      if (!f.endsWith('.mjs')) continue;
      fora.push([dir + '/' + f, readFileSync(RAIZ + dir + '/' + f, 'utf8')]);
    }
  }
  fora.push(['app/index.html', readFileSync(RAIZ + 'app/index.html', 'utf8')]);
  return fora;
}

export function suite() {
  const s = criarSuite('pack-original');

  s.teste('o pack original é válido e joga', () => {
    igual(validarPack(original).join(' | '), '', 'o pack original não passa no contrato');
    igual(original.especies.length, 76, 'o elenco não tem 76 criaturas');
    igual(Object.keys(original.tipos.efetividade).length, 8, 'a roda não tem oito tipos');
  });

  s.teste('300 rodadas do pack original sempre terminam com vencedor', () => {
    let sem = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const pool = M.sortearPool(seed);
      const clima = M.sortearClima(seed * 7, tiposDaPool(pool));
      if (M.simular(M.aplicarClima(pool, clima), seed, false) < 0) sem++;
    }
    igual(sem, 0, `${sem} de 300 rodadas do pack original não tiveram vencedor`);
  });

  /* ── A RODA ────────────────────────────────────────────────────────────
   *
   * Oito tipos e não dezoito, e isso é decisão: copiar a tabela de dezoito
   * seria copiar o desenho de jogo da franquia mesmo trocando os nomes. A
   * propriedade que a roda garante por FORMA — nenhum tipo dominante, nenhum
   * lixo — a tabela grande só alcança por ajuste manual. */
  s.teste('nenhum tipo da roda é dominante nem inútil', () => {
    const chart = original.tipos.efetividade;
    for (const t of RODA) {
      const ataca = Object.values(chart[t]);
      const forte = ataca.filter(v => v > 1).length;
      const fraco = RODA.filter(o => (chart[o][t] ?? 1) > 1).length;
      igual(forte, 2, `\`${t}\` é forte contra ${forte} tipos; a roda dá 2 a cada um`);
      igual(fraco, 2, `\`${t}\` é atacado com vantagem por ${fraco} tipos; a roda dá 2`);
    }
  });

  s.teste('a força do elenco é a MESMA distribuição do pack medido', () => {
    /* HERANÇA DELIBERADA, e ela precisa de teste porque é fácil de perder ao
       regerar o pack. Margem, ruína e precisão de odd foram medidas sobre a
       distribuição do elenco Kanto; trocar de tema não pode trocar o jogo,
       senão todas aquelas medidas viram lixo no dia do lançamento. */
    const total = p => p.s.reduce((a, b) => a + b, 0);
    const doKanto = kanto.especies.filter(e => kanto.elenco.includes(e.dex))
      .map(total).sort((a, b) => a - b);
    const doOriginal = original.especies.map(total).sort((a, b) => a - b);
    igual(doOriginal.length, doKanto.length, 'os elencos têm tamanhos diferentes');
    for (let i = 0; i < doKanto.length; i++)
      igual(doOriginal[i], doKanto[i],
        `o percentil ${i} tem total ${doOriginal[i]} no original e ${doKanto[i]} no medido. ` +
        `A distribuição de força é herdada de propósito — é o que faz o estudo ` +
        `de economia continuar valendo depois da troca de tema.`);
  });

  /* ── O QUE NÃO PODE VAZAR ──────────────────────────────────────────────*/

  s.teste('nenhum identificador da franquia fora do pack dela', () => {
    /* A varredura é sobre PRODUÇÃO: motor, servidor e cliente. O pack Kanto é
       o lugar onde esses nomes podem estar, e é o único. */
    const PROIBIDOS = [/pok[ée]mon/i, /pikachu/i, /charizard/i, /bulbasaur/i,
                       /kanto/i, /pok[ée]ball/i, /nintendo/i, /showdown/i];
    const achados = [];
    for (const [arquivo, txt] of fontesDeProducao()) {
      const semComentario = txt.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
      for (const re of PROIBIDOS) {
        const m = semComentario.match(re);
        if (m) achados.push(`${arquivo}: ${m[0]}`);
      }
    }
    igual(achados.length, 0,
      `identificador da franquia em código de produção:\n      ${achados.join('\n      ')}\n` +
      `      O §0.3 é "Engine != Pokémon". Enquanto o pack for o único lugar com ` +
      `esses nomes, trocar de tema é trabalho de arte e dados, não de engenharia.`);
  });

  s.teste('o pack original NÃO cai para o outro pack', () => {
    /* A LIÇÃO DA v0.6.1, e ela é a sabotagem nº 2 do bloco: "o resgate busca a
       mesma coisa em outro endereço, nunca outra coisa". Um `catch` que
       devolvesse o sprite do Kanto faria o jogo original mostrar arte da
       franquia no primeiro erro. */
    const fonte = readFileSync(RAIZ + 'content/original_v1.mjs', 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ');
    for (const re of [/pokemon_kanto/i, /kanto/i, /showdown/i]) {
      /* A MENSAGEM É MONTADA ANTES DA ASSERÇÃO, sempre — então `fonte.match(re)`
         não pode ser lido dentro dela: quando o teste PASSA, `match` devolve
         `null` e a montagem estoura. A primeira versão fazia isso e quebrava
         exatamente no caminho verde. */
      const achado = fonte.match(re);
      ok(!achado,
        `o pack original menciona \`${achado ? achado[0] : ''}\` fora de comentário. ` +
        `Nem para cair, nem para comparar: o dia em que houver uma referência, ` +
        `haverá um caminho.`);
    }

    /* E o comportamento: sem arte, a silhueta — nunca um endereço externo. */
    for (const e of original.especies.slice(0, 12)) {
      const src = original.sprite(e);
      ok(src.startsWith('data:image/svg+xml'),
        `\`${e.n}\` sem arte devolveu \`${src.slice(0, 40)}\` em vez da silhueta`);
      ok(!/https?:/.test(src), `\`${e.n}\` aponta para um endereço externo`);
    }
  });

  s.teste('a silhueta é determinística e distinta por criatura', () => {
    const vistas = new Map();
    for (const e of original.especies) {
      const a = silhuetaDe(e), b = silhuetaDe(e);
      igual(a, b, `a silhueta de \`${e.n}\` mudou entre duas chamadas`);
      ok(!vistas.has(a),
        `\`${e.n}\` e \`${vistas.get(a)}\` têm a MESMA silhueta — o jogador não ` +
        `distingue em quem está apostando`);
      vistas.set(a, e.n);
    }
  });

  s.teste('o livro-razão da arte só nomeia arquivo que existe', () => {
    /* `COM_ARTE` é o que responde "quanto falta?" sem ninguém contar arquivo.
       Um slug listado sem PNG correspondente seria uma imagem quebrada na tela
       — pior que a silhueta assumida. */
    for (const slug of COM_ARTE)
      ok(existsSync(`${RAIZ}arte/original/${slug}.png`),
        `\`${slug}\` está em COM_ARTE e não há \`arte/original/${slug}.png\`. ` +
        `A lista promete um desenho que não existe, e a tela mostra imagem quebrada.`);
  });

  s.teste('resolver um pack que não existe LANÇA, e não devolve outro', async () => {
    const { resolver, PACKS, ID_ESCOLHIDO } = await import('../content/escolhido.mjs');
    let pegou = null;
    try { resolver('pack_que_nao_existe_v9'); } catch (e) { pegou = e.message; }
    ok(pegou,
      'resolver um pack inexistente devolveu ALGUM pack. É a v0.6.1 de volta: ' +
      '"faltou um arquivo" vira "o jogo inteiro saiu errado", e ninguém percebe ' +
      'porque a tela continua bonita.');
    ok(/não cai|nunca outra coisa/i.test(pegou),
      `a mensagem não explica a regra: ${pegou}`);
    igual(resolver(ID_ESCOLHIDO).id, ID_ESCOLHIDO, 'o escolhido não é o que foi pedido');
    ok(Object.keys(PACKS).length >= 2, 'só há um pack registrado — a troca não é testável');
  });

  s.teste('pack SEM rótulos é recusado no carregamento', () => {
    /* O campo nasceu no F1.12 e é o que impede o cliente de escrever o nome de
       uma franquia. Um contrato que o aceite ausente devolve o problema para
       onde ele estava. */
    const semRotulos = { ...original };
    delete semRotulos.rotulos;
    const erros = validarPack(semRotulos);
    ok(erros.some(e => /rotulos/i.test(e)),
      `um pack sem \`rotulos\` foi aceito. A interface volta a não ter como ` +
      `nomear as criaturas — e escreve o nome de uma franquia.`);
    for (const k of ['criatura', 'criaturas', 'elenco']) {
      const parcial = { ...original, rotulos: { ...original.rotulos, [k]: '' } };
      ok(validarPack(parcial).some(e => e.includes(k)),
        `\`rotulos.${k}\` vazio foi aceito`);
    }
  });

  s.teste('os dois packs coexistem sem se contaminar', () => {
    const A = criarMotor(original), B = criarMotor(kanto);
    igual(A.pack.id, 'original_v1'); igual(B.pack.id, 'pokemon_kanto_v1');
    const poolA = A.sortearPool(7), poolB = B.sortearPool(7);
    ok(!poolA.some(f => poolB.some(g => g.n === f.n)),
      'os dois packs sortearam criaturas com o mesmo nome — há estado compartilhado');
    igual(A.CUR ?? A.pack.moeda.nome, 'Arena Cash', 'a moeda do pack original não é a dele');
  });

  return s;
}
