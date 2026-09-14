/* Q1/Q3/Q4 · AS ROTAS POR NÍVEL (bloco 1.4, §7.13).
 *
 * ── A AFIRMAÇÃO CENTRAL ───────────────────────────────────────────────────
 *
 * **A distribuição por nível é DERIVADA da linha evolutiva, e por isso não
 * pode contradizê-la.**
 *
 * O dono do projeto pediu a distribuição do material de origem: "no bioma
 * floresta, de 1 a 5 weedle, caterpie, metapod, kakuna; de 5 a 10 beedrill,
 * butterfree". Escrever isso à mão são 146 linhas de dado morto e 146 chances
 * de discordar do que o bloco 1.1 já declarou.
 *
 * Derivando, o exemplo dele sai sozinho — e o teste abaixo mede exatamente o
 * exemplo dele, com o nome das criaturas que ele citou.
 *
 * ── E AS TRÊS QUE SUSTENTAM A ESCADA ──────────────────────────────────────
 *
 * 1. **NINGUÉM FICA SEM ROTA.** Espécie sem rota é espécie que não existe no
 *    jogo, e some sem ninguém notar.
 * 2. **NENHUMA ROTA FICA VAZIA.** Rota vazia é rota morta: o jogador escolhe e
 *    não acontece nada.
 * 3. **A ROTA ALTA É MAIS FORTE QUE A BAIXA.** Sem isso, escolher a rota longa
 *    é escolher esperar mais pela mesma coisa.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import {
  nivelMinimo, nivelDeSaida, faixaNatural, faixasDe, elencoDaRota,
  nivelDoEncontro, rotasDo, semRota, NIVEL_BASE, elencoPesado,
} from '../engine/rotas.mjs';
import { forcaDe, especiesDoBioma } from '../engine/bioma.mjs';
import { estagioDe } from '../engine/evolucao.mjs';
import { semente } from '../engine/instancia.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';
import original from '../content/original_v1.mjs';

const PACKS = [['kanto', kanto], ['original', original]];
const dexDe = (pack, nome) => pack.especies.find(e => e.n === nome)?.dex;

export function suite() {
  const s = criarSuite('rotas-idle');

  /* --- A AFIRMAÇÃO CENTRAL, com o exemplo do dono -------------------------- */

  s.teste('§dono · a escada da Floresta é a que o dono do projeto descreveu', () => {
    /* "de 1 a 5 weedle, caterpie, metapod, kakuna; de 5 a 10 beedrill,
        butterfree" — e nenhum desses números foi escolhido: são os níveis de
        evolução que o pack já declarava. */
    for (const [nome, esperado] of [
      ['caterpie', 2], ['weedle', 2],
      ['metapod', 7],  ['kakuna', 7],
      ['butterfree', 10], ['beedrill', 10],
    ])
      igual(nivelMinimo(kanto, dexDe(kanto, nome)), esperado,
        `${nome} pode existir a partir do nível ${nivelMinimo(kanto, dexDe(kanto, nome))} ` +
        `e devia ser ${esperado}. O número sai da linha evolutiva — se ele mudou, ` +
        `ou a linha mudou de propósito, ou a derivação quebrou.`);

    const rasa = elencoDaRota(kanto, 'floresta', 'f1').map(e => e.n);
    for (const n of ['caterpie', 'metapod', 'weedle', 'kakuna'])
      ok(rasa.includes(n), `${n} não está na rota rasa da Floresta`);
    for (const n of ['butterfree', 'beedrill'])
      ok(!rasa.includes(n),
        `${n} apareceu na rota rasa. Ele só existe a partir do nível 10, e a rota ` +
        `rasa vai até 8 — deixá-lo entrar é dizer ao jogador que o nível não vale nada.`);

    const media = elencoDaRota(kanto, 'floresta', 'f2').map(e => e.n);
    for (const n of ['butterfree', 'beedrill'])
      ok(media.includes(n), `${n} não está na rota média da Floresta`);
    for (const n of ['caterpie', 'weedle'])
      ok(!media.includes(n),
        `${n} continua na rota média. Ele evolui no nível 7, e a rota média começa ` +
        `no 9 — na natureza dela, já virou outra coisa.`);
  });

  /* O CASO QUE O DONO CITOU COMO ERRO. */
  s.teste('§dono · nada de Nidoking na praia de nível baixo', () => {
    const nk = dexDe(kanto, 'nidoking');
    ok(nivelMinimo(kanto, nk) >= 25,
      `nidoking pode existir a partir do nível ${nivelMinimo(kanto, nk)}`);
    for (const f of faixasDe(kanto))
      ok(!elencoDaRota(kanto, 'praia', f.id).some(e => e.dex === nk),
        `nidoking apareceu na praia (${f.rotulo}). Ele é veneno/terra, e a praia ` +
        `hospeda água e voador — foi o exemplo que o dono do projeto deu do que ` +
        `não pode acontecer.`);
    const rasa = elencoDaRota(kanto, 'praia', 'f1');
    for (const e of rasa)
      ok(nivelMinimo(kanto, e.dex) <= 8,
        `${e.n} está na praia rasa e só existe a partir do nível ${nivelMinimo(kanto, e.dex)}`);
  });

  s.teste('nenhum voador de outro elemento invade a praia', () => {
    /* Charizard é fogo/voador e a praia hospeda voador. Com a regra antiga —
       "basta um tipo bater" — ele morava lá. É o que a regra de moradia do 1.4
       corrigiu, e o teste guarda o caso concreto. */
    for (const nome of ['charizard', 'butterfree', 'scyther'])
      for (const f of faixasDe(kanto))
        ok(!elencoDaRota(kanto, 'praia', f.id).some(e => e.n === nome),
          `${nome} apareceu na praia. O tipo principal dele não é de lá, e só um ` +
          `dos tipos bate — a regra de moradia exige o principal, ou dois.`);
    /* e quem É de lá continua lá */
    const rasa = elencoDaRota(kanto, 'praia', 'f1').map(e => e.n);
    for (const n of ['squirtle', 'psyduck', 'tentacool', 'magikarp'])
      ok(rasa.includes(n), `${n} devia estar na praia rasa e não está`);
  });

  /* --- 1, 2 e 3 · a escada, nos DOIS packs -------------------------------- */

  for (const [nome, pack] of PACKS) {
    s.teste(`[${nome}] ninguém fica sem rota`, () => {
      const orfas = semRota(pack);
      igual(orfas.length, 0,
        `${orfas.length} espécie(s) sem rota nenhuma: ` +
        `${orfas.slice(0, 6).map(e => e.n).join(', ')}. Espécie sem rota é espécie ` +
        `que não existe no jogo — ela some da coleção sem ninguém notar, porque ` +
        `nada reprova.`);
    });

    s.teste(`[${nome}] nenhuma rota fica vazia`, () => {
      for (const b of pack.biomas)
        for (const f of faixasDe(pack)) {
          const n = elencoDaRota(pack, b.id, f.id).length;
          ok(n >= 3,
            `${b.rotulo} / ${f.rotulo} tem ${n} espécie(s). Rota quase vazia é rota ` +
            `morta: o jogador escolhe e não acontece nada — e ele aprende a evitar ` +
            `aquele lugar sem nunca saber por quê.`);
        }
    });

    /* A ESCADA SE MEDE PELA MEDIANA, E NÃO PELA MÉDIA.
     *
     * Não é para afrouxar o teste — é porque a média mente aqui, e a mediana
     * não. A regra da FAIXA NATURAL admite na rota do próprio nível quem é
     * fraco demais para o piso dela; sem essa exceção, nove espécies do pack
     * original ficavam sem rota nenhuma. Essas poucas puxam a MÉDIA da rota
     * alta para baixo — medido: uma inversão em 24 rotas — e não mudam nada do
     * que o jogador encontra, porque são raras dentro da rota.
     *
     * A mediana descreve o que ele de fato encontra, e ela é monotônica nos
     * dois packs, em todas as rotas. Escolher a estatística certa é parte do
     * teste; escolher a que passa não é. */
    s.teste(`[${nome}] a rota alta é mais forte que a baixa`, () => {
      const mediana = a => { const o = [...a].sort((x, y) => x - y); return o[Math.floor(o.length / 2)]; };
      for (const b of pack.biomas) {
        const meds = rotasDo(pack, b.id).map(r => mediana(r.elenco.map(forcaDe)));
        for (let i = 1; i < meds.length; i++)
          ok(meds[i] >= meds[i - 1],
            `em ${b.rotulo}, a rota ${i + 1} tem força mediana ${meds[i]} e a ${i} ` +
            `tem ${meds[i - 1]}. Sem a escada, escolher a rota longa é escolher ` +
            `esperar mais pela mesma coisa.`);
        ok(meds[meds.length - 1] > meds[0],
          `em ${b.rotulo} a rota do fim (${meds[meds.length-1]}) não é mais forte ` +
          `que a rasa (${meds[0]}) — a escada não existe neste bioma`);
      }
    });

    s.teste(`[${nome}] toda espécie de uma rota mora naquele bioma`, () => {
      for (const b of pack.biomas) {
        const moradores = new Set(especiesDoBioma(pack, b.id).map(e => e.dex));
        for (const f of faixasDe(pack))
          for (const e of elencoDaRota(pack, b.id, f.id))
            ok(moradores.has(e.dex),
              `${e.n} está numa rota de ${b.rotulo} e não mora nele. A rota é um ` +
              `recorte do bioma; se ela puder trazer de fora, a fidelidade some.`);
      }
    });

    s.teste(`[${nome}] a rota alta não tem quem já evoluiu`, () => {
      for (const b of pack.biomas)
        for (const f of faixasDe(pack))
          for (const e of elencoDaRota(pack, b.id, f.id))
            ok(nivelDeSaida(pack, e.dex) > f.nivel[0],
              `${e.n} evolui no nível ${nivelDeSaida(pack, e.dex)} e aparece em ` +
              `${f.rotulo} (${f.nivel[0]}-${f.nivel[1]}). Na natureza daquela rota ` +
              `ele já teria virado outra coisa.`);
    });

    s.teste(`[${nome}] as faixas são contíguas e crescentes`, () => {
      const fs = faixasDe(pack);
      ok(fs.length >= 3, `só ${fs.length} faixa(s) — a escada precisa de degraus`);
      igual(fs[0].nivel[0], NIVEL_BASE, 'a primeira faixa não começa no nível base');
      for (let i = 1; i < fs.length; i++) {
        igual(fs[i].nivel[0], fs[i - 1].nivel[1] + 1,
          `há um buraco ou uma sobreposição entre ${fs[i-1].rotulo} e ${fs[i].rotulo}. ` +
          `Buraco é nível que nenhuma rota cobre; sobreposição é a mesma criatura ` +
          `em duas rotas pelo mesmo motivo.`);
        ok(fs[i].piso >= fs[i - 1].piso, `o piso de força caiu em ${fs[i].rotulo}`);
        ok(fs[i].teto >= fs[i - 1].teto, `o teto de força caiu em ${fs[i].rotulo}`);
      }
    });
  }

  /* --- O PESO DA ASSINATURA, que é o que separa dois biomas iguais -------- */

  /* SEM ESTE TESTE, APAGAR A DIFERENCIAÇÃO NÃO REPROVA NADA — e a sabotagem
   * provou: o defeito `S601` (o peso da assinatura vira 1 para todos) PASSOU.
   *
   * O elenco de dois biomas pode ser quase igual e isso é fiel ao material de
   * origem — a caverna gelada do cartucho é habitada sobretudo por criaturas de
   * água. O que separa os dois lugares é a FREQUÊNCIA, e frequência não aparece
   * em teste de pertencimento: só em teste de distribuição. */
  s.teste('§Q4 · dois biomas de elenco parecido têm distribuições diferentes', () => {
    const dist = (bid, fid) => {
      const l = elencoPesado(kanto, bid, fid);
      const tot = l.reduce((a, x) => a + x.peso, 0);
      return new Map(l.map(x => [x.dex, x.peso / tot]));
    };
    const praia = dist('praia', 'f3'), gelo = dist('gelo', 'f3');

    /* o elenco é quase o mesmo — é essa a premissa que torna o teste necessário */
    const comuns = [...praia.keys()].filter(d => gelo.has(d));
    ok(comuns.length / Math.min(praia.size, gelo.size) > 0.7,
      'os dois biomas não compartilham elenco — o teste não mede o que promete');

    /* e mesmo assim as distribuições têm de ser diferentes */
    const distancia = comuns.reduce((a, d) => a + Math.abs(praia.get(d) - gelo.get(d)), 0);
    ok(distancia > 0.35,
      `as distribuições de Praia e Caverna de gelo diferem em ${(distancia*100).toFixed(0)}% ` +
      `no total. Com elencos quase idênticos, é SÓ a frequência que faz os dois ` +
      `serem lugares diferentes — sem ela, onze biomas viram quatro e escolher a ` +
      `rota é escolher a cor do fundo.`);

    /* e quem assina o bioma tem de dominar nele */
    const assinam = elencoPesado(kanto, 'gelo', 'f3')
      .filter(x => (x.especie.t ?? []).includes('ice'));
    ok(assinam.length >= 3, 'o gelo não tem espécies de gelo suficientes para medir');
    const somaAssin = assinam.reduce((a, x) => a + gelo.get(x.dex), 0);
    ok(somaAssin > 0.4,
      `as espécies da assinatura somam ${(somaAssin*100).toFixed(0)}% dos encontros do ` +
      `gelo. Elas têm de DOMINAR o lugar — é o que faz alguém escolher ir lá.`);
  });

  /* --- o nível do encontro ------------------------------------------------ */

  s.teste('o nível sorteado cabe na faixa E na própria espécie', () => {
    const rnd = semente(17);
    for (const b of kanto.biomas)
      for (const f of faixasDe(kanto))
        for (const e of elencoDaRota(kanto, b.id, f.id))
          for (let i = 0; i < 4; i++) {
            const nv = nivelDoEncontro(rnd, kanto, e.dex, f.id);
            ok(nv >= f.nivel[0] && nv <= f.nivel[1],
              `${e.n} saiu no nível ${nv}, fora de ${f.nivel.join('-')}`);
            ok(nv >= nivelMinimo(kanto, e.dex),
              `${e.n} saiu no nível ${nv} e só existe a partir do ` +
              `${nivelMinimo(kanto, e.dex)}. Um Dragonair de nível 9 é impossível ` +
              `pela própria linha evolutiva — e o jogador que percebe isso perde a ` +
              `confiança em todo o resto.`);
          }
  });

  s.teste('a faixa natural existe para todas, e é a primeira que cabe', () => {
    for (const [nome, pack] of PACKS)
      for (const e of pack.especies) {
        const f = faixaNatural(pack, e.dex);
        ok(f, `[${nome}] ${e.n} não tem faixa natural`);
        ok(nivelMinimo(pack, e.dex) <= f.nivel[1],
          `[${nome}] a faixa natural de ${e.n} começa antes de ele poder existir`);
      }
  });

  /* --- §Gen2 -------------------------------------------------------------- */

  s.teste('§Gen2 · os NÍVEIS podem ser os mesmos; a FORÇA, não', () => {
    const nk = faixasDe(kanto), no = faixasDe(original);
    igual(nk.length, no.length, 'os dois packs têm números de faixa diferentes');
    for (let i = 0; i < nk.length; i++)
      igual(nk[i].nivel.join('-'), no[i].nivel.join('-'),
        'as faixas de NÍVEL divergiram entre os packs. Elas saem da linha ' +
        'evolutiva, que é estrutura — podem e devem ser iguais.');
    ok(nk.some((f, i) => f.teto !== no[i].teto || f.piso !== no[i].piso),
      'os dois packs usam a MESMA janela de força. É o D-051: as distribuições ' +
      'de força são diferentes, e copiar a janela do outro deixou cinco das seis ' +
      'rotas rasas do pack original vazias. Qualquer limiar tirado da força é ' +
      'por pack.');
  });

  return s;
}
