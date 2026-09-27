/* Q1/Q3/Q4 · OS GINÁSIOS COMO AULAS (ST-10.13 · F4.6 · Spec §8.1.2)
 *
 * "Um time montado ignorando a lição do ginásio precisa perder a maior parte
 * das vezes. Ginásio vencível sem entender a lição não ensina nada." E a
 * dificuldade é MEDIDA: cada ginásio do pack tem medição gravada, os dois
 * times de referência diferem num membro só, o aceite é cobrado no número
 * gravado, e o número se refaz pela raiz.
 *
 * E o primeiro passo (D-125): o inicial sozinho no nível 5 vence o primeiro
 * nó do caminho.
 */
import { readFileSync, existsSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import pack from '../content/pokemon_kanto_v1.mjs';
import { movesetDoRival, padraoDoMoveset, liberados, movesetValido } from '../app/modules/moveset-dados.mjs';
import { rivalDe, treinador } from '../app/modules/treino-dados.mjs';
import { lote, resumo } from '../engine/treino-preco.mjs';
import { efeito } from '../engine/primitivas.mjs';
import { REFERENCIAS, INICIAIS, NIVEL_INICIAL, medir } from '../tools/medir-ginasios.mjs';

const fx = JSON.parse(readFileSync(new URL('./fixtures/ginasios.json', import.meta.url), 'utf8'));
const golpe = n => Object.values(pack.golpes).flat().find(g => g.n === n);
/* O aceite (recomendação do plano, valores finais na fixture). */
export const PERDE_IGNORANDO = 0.70, VENCE_APLICANDO = 0.60, PRIMEIRO_PASSO = 0.80;

export function suite() {
  const s = criarSuite('ginasios');

  s.teste('todo ginásio do pack tem lição escrita e dificuldade MEDIDA', () => {
    const gin = pack.jornada.filter(n => n.insignia);
    ok(gin.length >= 1, 'o pack não tem ginásio');
    /* ST-10.19c: e a Liga também — todo nó com lição é medido. */
    const comLicao = pack.jornada.filter(n => n.licao);
    igual(fx.ginasios.map(g => g.id).join(), comLicao.map(n => n.id).join(), 'nó com lição sem medição (dificuldade estimada reprova)');
    ok(pack.jornada.filter(n => n.liga).length === 5 && pack.jornada.filter(n => n.liga).every(n => n.licao), 'a Liga: cinco nós, todos com lição');
    for (const n of comLicao) {
      ok(n.licao?.ensina && n.licao?.dica, `${n.id}: sem a lição escrita`);
      ok(REFERENCIAS[n.id], `${n.id}: sem times de referência`);
      ok(!fx.ginasios.find(g => g.id === n.id).semReferencia, `${n.id}: medido sem referência`);
    }
    for (const n of gin) {
      ok(n.licao?.ensina && n.licao?.dica, `${n.id}: sem a lição escrita`);
      ok(REFERENCIAS[n.id], `${n.id}: sem times de referência`);
      ok(!fx.ginasios.find(g => g.id === n.id).semReferencia, `${n.id}: medido sem referência`);
      /* L-202: a insígnia tem arte NOSSA, e ela existe. */
      ok(existsSync(new URL(`../arte/insignias/${n.insignia}.svg`, import.meta.url)), `${n.id}: a insígnia ${n.insignia} não tem arte em arte/insignias/`);
    }
  });

  s.teste('a lição é a ÚNICA diferença entre os dois times de referência', () => {
    for (const [id, r] of Object.entries(REFERENCIAS)) {
      igual(r.ignora.length, r.aplica.length, `${id}: tamanhos`);
      const dif = r.ignora.map((x, i) => i).filter(i => JSON.stringify(r.ignora[i]) !== JSON.stringify(r.aplica[i]));
      /* ST-10.19a: a lição do PRESET não troca ninguém — o time é o mesmo, e
         só o preset muda. Toda outra lição troca exatamente um membro. */
      if (r.varia === 'preset') {
        igual(dif.length, 0, `${id}: a lição do preset trocou membro do time`);
        ok(r.presets?.ignora && r.presets?.aplica && r.presets.ignora !== r.presets.aplica, `${id}: os presets não diferem`);
        continue;
      }
      ok(!r.presets, `${id}: preset diferente numa lição que não é de preset`);
      igual(dif.length, 1, `${id}: os times diferem em ${dif.length} membros`);
      igual(r.ignora.map(x => x[1]).join(), r.aplica.map(x => x[1]).join(), `${id}: os níveis mudaram junto`);
      /* ST-10.14: "mesmo time, só a velocidade invertida" — quem declara
         `varia: 'vel'` só pode diferir no oculto de velocidade. */
      if (r.varia === 'vel') {
        const [a, b] = [r.ignora[dif[0]], r.aplica[dif[0]]];
        igual(`${a[0]}@${a[1]}`, `${b[0]}@${b[1]}`, `${id}: a espécie ou o nível mudou junto com a velocidade`);
        igual(JSON.stringify(a[2].iv.slice(0, 5)), JSON.stringify(b[2].iv.slice(0, 5)), `${id}: mudou outro oculto além da velocidade`);
        ok(a[2].iv[5] < b[2].iv[5], `${id}: o time que aplica a lição não é o mais rápido`);
        ok(!a[2].natureza && !b[2].natureza, `${id}: natureza mexe em dois atributos`);
      }
    }
    ok(REFERENCIAS.cerulean?.varia === 'vel', 'a lição da velocidade não é medida com só a velocidade variando');
    /* ST-10.19c: cada regra vale para TODO nó que declara a lição — os
       ginásios e a Liga, que os revisa. */
    const especie = dex => pack.especies.find(e => e.dex === dex) ?? pack.lendarios.find(e => e.dex === dex);
    const tiposDe = dex => especie(dex).t, soma = dex => especie(dex).s.reduce((a, b) => a + b, 0);
    const trocado = r => r.ignora.findIndex((x, k) => JSON.stringify(x) !== JSON.stringify(r.aplica[k]));
    const comLicao = m => pack.jornada.filter(n => n.licao?.mostra === m);
    const liderDe = n => treinador(pack, n.rival).time;
    /* ST-10.19a · "resistência" — o membro que muda RESISTE a todo tipo de
       golpe do líder (≤ ½) no time que aplica, e apanha cheio (≥ 1) no que
       ignora, e o que ignora não é mais fraco no papel. Os tipos da lição são
       os do PRÓPRIO líder (todo membro tem um deles) — o golpe Normal da
       reserva, que todo mundo tem, não é a lição. */
    ok(comLicao('resiste').length >= 2, 'a resistência (Erika) e a revisão dela (Lance)');
    for (const n of comLicao('resiste')) {
      const r = REFERENCIAS[n.id], tg = n.licao.tiposGolpe, k = trocado(r);
      ok(r?.varia === 'resiste', `${n.id}: a lição da resistência não é medida`);
      ok(liderDe(n).every(x => tiposDe(x.dex).some(t => tg.includes(t))), `${n.id}: os tipos da lição não são os do líder`);
      ok(liderDe(n).some(x => movesetDoRival(pack, x.dex, x.nivel).some(g => tg.includes(golpe(g).t))), `${n.id}: o líder não usa golpe dos tipos da lição`);
      for (const t of tg) {
        ok(efeito(pack.tipos.efetividade, t, tiposDe(r.aplica[k][0])) <= 0.5, `${n.id}: o membro que aplica a lição não resiste a ${t}`);
        ok(efeito(pack.tipos.efetividade, t, tiposDe(r.ignora[k][0])) >= 1, `${n.id}: o membro que ignora a lição resiste a ${t}`);
      }
      ok(soma(r.ignora[k][0]) >= soma(r.aplica[k][0]), `${n.id}: o membro que ignora a resistência é mais fraco no papel`);
    }
    /* Toda lição de preset mede o preset que ENSINA, contra o que ela diz
       estar errado (o Equilibrado, se não disser — o Campeão diz o Agressivo). */
    for (const n of comLicao('preset')) {
      const r = REFERENCIAS[n.id];
      ok(r?.varia === 'preset' && r.presets.aplica === n.licao.presetCerto, `${n.id}: a lição não mede o preset que ensina`);
      igual(r.presets.ignora, n.licao.presetErrado ?? 'balanced', `${n.id}: a medição ignora com outro preset que o da lição`);
    }
    ok(comLicao('preset').length >= 4, 'Koga, Blaine, Lorelei e o Campeão');
    /* ST-10.19b · "cada ginásio ensina UMA interação" (§8.1.2) — e nenhuma
       repetida ENTRE GINÁSIOS: duas lições de preset só se ensinam presets
       diferentes. A Liga revisa, e por isso pode repetir. */
    const aulas = pack.jornada.filter(n => n.insignia && n.licao?.mostra).map(n => `${n.licao.mostra}:${n.licao.presetCerto ?? ''}`);
    igual(new Set(aulas).size, aulas.length, `lição repetida entre ginásios: ${aulas.join(' ')}`);
    /* A Liga só REVISA: toda lição dela aponta um ginásio que a ensinou, e o
       Campeão ensina a única que falta — o preset não é receita. */
    for (const n of pack.jornada.filter(x => x.liga && x.licao?.revisa)) {
      const g = pack.jornada.find(x => x.id === n.licao.revisa);
      ok(g?.insignia && g.licao?.mostra === n.licao.mostra, `${n.id}: revisa ${n.licao.revisa}, que não ensinou ${n.licao.mostra}`);
    }
    /* ST-10.19b · Giovanni: "o tipo duplo" — o membro que ignora PARECE bater
       (≥ 2× em alguém dele) e é cortado pelo segundo tipo (≤ ½ em alguém); o
       que aplica bate ≥ 2× em TODOS; o que ignora não é mais fraco no papel;
       e o time do líder tem de fato tipo duplo (três ou mais). */
    for (const n of comLicao('duplo')) {
      const du = REFERENCIAS[n.id], lider = liderDe(n), j2 = trocado(du);
      ok(du?.varia === 'duplo', `${n.id}: a lição do tipo duplo não é medida`);
      ok(lider.filter(x => tiposDe(x.dex).length === 2).length >= 3, `${n.id}: o time do líder não tem tipo duplo`);
      const melhor = (dex, nivel, alvo) => Math.max(...padraoDoMoveset(pack, dex, nivel).map(g => efeito(pack.tipos.efetividade, golpe(g).t, tiposDe(alvo))));
      const multIg = lider.map(x => melhor(du.ignora[j2][0], du.ignora[j2][1], x.dex)), multAp = lider.map(x => melhor(du.aplica[j2][0], du.aplica[j2][1], x.dex));
      ok(multIg.some(v => v >= 2) && multIg.some(v => v <= 0.5), `${n.id}: o membro que ignora não PARECE aplicar (${multIg.join(' ')})`);
      ok(multAp.every(v => v >= 2), `${n.id}: o membro que aplica não bate forte em todos (${multAp.join(' ')})`);
      ok(soma(du.ignora[j2][0]) >= soma(du.aplica[j2][0]), `${n.id}: o membro que ignora o tipo duplo é mais fraco no papel`);
    }
    /* ST-10.15: "imunidade" — o membro que muda é IMUNE ao tipo do líder no
       time que aplica, e NÃO no que ignora; e o que ignora não é mais fraco no
       papel (soma dos atributos base maior ou igual) — senão a diferença
       seria força, e não imunidade. E o líder USA golpe daquele tipo. */
    ok(comLicao('imune').length >= 2, 'a imunidade (Surge) e a revisão dela (Bruno)');
    for (const n of comLicao('imune')) {
      const r = REFERENCIAS[n.id], i = trocado(r), tg = n.licao.tipoGolpe;
      ok(r?.varia === 'imune' && r.tipo === tg, `${n.id}: a lição da imunidade não declara o tipo`);
      igual(efeito(pack.tipos.efetividade, tg, tiposDe(r.aplica[i][0])), 0, `${n.id}: o membro que aplica a lição não é imune a ${tg}`);
      ok(efeito(pack.tipos.efetividade, tg, tiposDe(r.ignora[i][0])) > 0, `${n.id}: o membro que ignora a lição também é imune`);
      ok(soma(r.ignora[i][0]) >= soma(r.aplica[i][0]), `${n.id}: o membro que ignora é mais fraco no papel — a medição mede força, e não imunidade`);
      ok(liderDe(n).filter(x => movesetDoRival(pack, x.dex, x.nivel).some(g => golpe(g).t === tg)).length * 2 >= liderDe(n).length,
        `${n.id}: menos da metade do time do líder usa golpe de ${tg}`);
    }
    ok(treinador(pack, 'surge').time.every(x => tiposDe(x.dex).includes('electric')), 'o time do Surge não é elétrico');
    /* ST-10.16: "inverter a categoria do atacante" — o MESMO atacante, mesmo
       nível, só os golpes mudam: todos físicos de um lado, todos especiais do
       outro, válidos para ele; e o atacante é EQUILIBRADO (ataque e especial a
       10% um do outro) — senão a medição mede o atacante, e não o lado fraco
       de quem apanha. */
    ok(comLicao('categoria').length >= 2, 'físico × especial (Sabrina) e a revisão (Agatha)');
    for (const n of comLicao('categoria')) {
      const c = REFERENCIAS[n.id], k = trocado(c);
      ok(c?.varia === 'categoria', `${n.id}: a lição físico × especial não varia só a categoria`);
      const [ig, ap] = [c.ignora[k], c.aplica[k]];
      igual(`${ig[0]}@${ig[1]}`, `${ap[0]}@${ap[1]}`, `${n.id}: o atacante ou o nível mudou junto com a categoria`);
      ok(ap[2].golpes.every(g => golpe(g).cat === 'fis') && ig[2].golpes.every(g => golpe(g).cat === 'esp'), `${n.id}: as categorias não estão separadas`);
      ok(movesetValido(pack, ap[0], ap[1], ap[2].golpes).ok && movesetValido(pack, ig[0], ig[1], ig[2].golpes).ok, `${n.id}: golpe que o atacante não poderia ter`);
      const st = especie(ap[0]).s;
      ok(Math.abs(st[1] - st[3]) / Math.max(st[1], st[3]) <= 0.1, `${n.id}: o atacante não é equilibrado — a medição mede o atacante`);
      ok(liderDe(n).every(x => { const s2 = especie(x.dex).s; return s2[2] < s2[4]; }), `${n.id}: o time do líder não é mais frágil no físico — a lição do lado fraco não vale`);
    }
  });

  s.teste('a diferença entre os dois times passa de 3× o erro (ST-10.14)', () => {
    for (const g of fx.ginasios) ok(g.aplica - g.ignora > 3 * g.erro, `${g.id}: ${g.aplica} − ${g.ignora} não passa de 3 × ${g.erro}`);
  });

  s.teste('o aceite: ignorar a lição perde, aplicá-la vence', () => {
    for (const g of fx.ginasios) {
      ok(g.ignora <= 1 - PERDE_IGNORANDO, `${g.id}: ignorando a lição vence ${Math.round(g.ignora * 100)}% — não ensina nada`);
      ok(g.aplica >= VENCE_APLICANDO, `${g.id}: aplicando a lição vence só ${Math.round(g.aplica * 100)}%`);
    }
  });

  s.teste('D-125 consertado: o inicial sozinho no nível 5 dá o primeiro passo', () => {
    igual(fx.primeiroNo.id, pack.jornada[0].id, 'o primeiro nó medido não é o do pack');
    igual(fx.primeiroNo.inicial.map(x => x.dex).join(), INICIAIS.join(), 'os iniciais');
    for (const x of fx.primeiroNo.inicial) ok(x.p >= PRIMEIRO_PASSO, `o inicial ${x.dex} no nível ${NIVEL_INICIAL} vence só ${Math.round(x.p * 100)}%`);
  });

  s.teste('a medição se refaz pela raiz, número a número', () => {
    igual(JSON.stringify(medir()), JSON.stringify(fx), 'a fixture não é a medição de agora — rode node tools/medir-ginasios.mjs e explique no commit');
  });

  s.teste('o rival escolhe pela força de quem bate (L-200)', () => {
    const esp = n => golpe(n).cat === 'esp';
    /* Chansey (ataque 5, especial 35): o padrão dava zero especial. */
    ok(padraoDoMoveset(pack, 113, 50).filter(esp).length === 0, 'o padrão do Chansey mudou (o do jogador não é deste bloco)');
    ok(movesetDoRival(pack, 113, 50).filter(esp).length >= 1, 'o Chansey rival continua só com golpe físico');
    /* Machamp (ataque 130, especial 65): sem Aura Sphere, que é especial. */
    ok(!movesetDoRival(pack, 68, 50).some(esp), 'o Machamp rival bate pelo especial');
    ok(esp(movesetDoRival(pack, 65, 50)[0]), 'o primeiro golpe do Alakazam rival não é especial');
    for (const dex of [1, 4, 7, 19, 74, 95, 113]) for (const nv of [3, 12, 50]) {
      const r = movesetDoRival(pack, dex, nv), pode = new Set(liberados(pack, dex, nv));
      ok(r.length >= 1 && r.length <= 4 && new Set(r).size === r.length, `${dex}@${nv}: moveset inválido`);
      ok(r.every(n => pode.has(n)), `${dex}@${nv}: o rival tem golpe que o jogador não poderia ter`);
      igual(r.join(), movesetDoRival(pack, dex, nv).join(), `${dex}@${nv}: não é determinístico`);
    }
    igual(JSON.stringify(rivalDe(pack, treinador(pack, 'brock')).map(x => x.golpes)),
      JSON.stringify(treinador(pack, 'brock').time.map(x => movesetDoRival(pack, x.dex, x.nivel))), 'o rival de treino não usa o moveset do rival');
    /* E isso muda a luta: o Chansey rival vence mais que com o padrão. */
    const outro = [{ dex: 19, nivel: 50, golpes: padraoDoMoveset(pack, 19, 50) }];
    const p = g => resumo(lote(pack, outro, [{ dex: 113, nivel: 50, golpes: g }], 7, 0, 600)).p;
    ok(p(movesetDoRival(pack, 113, 50)) < p(padraoDoMoveset(pack, 113, 50)), 'o Chansey rival não ficou mais forte');
  });

  s.teste('L-201 decidida (ST-10.19c): o rival luta com o PRÓPRIO tipo, e a reserva só completa', () => {
    /* Acima do nível 45 a reserva (Normal) dava o Skull Bash — 130, o maior
       poder da lista — a quase todo rival, e a Lorelei deixava de "usar Água e
       Gelo". O rival é especialista: os golpes do tipo dele, e a reserva só
       quando ele tem menos de dois. A Arena não usa esta regra. */
    const tipoDe = n => golpe(n).t;
    for (const t of pack.treinadores) for (const x of t.time) {
      const e = pack.especies.find(s2 => s2.dex === x.dex) ?? pack.lendarios.find(s2 => s2.dex === x.dex);
      const r = movesetDoRival(pack, x.dex, x.nivel), proprios = r.filter(n => e.t.includes(tipoDe(n)));
      if (proprios.length >= 2) igual(proprios.length, r.length, `${t.id}/${x.dex}@${x.nivel}: golpe de fora do tipo com ${proprios.length} do próprio (${r.join(', ')})`);
    }
    /* O Skull Bash some de quem não é Normal; o Pidgeot (Normal/Voador) o mantém. */
    ok(!movesetDoRival(pack, 87, 54).includes('Skull Bash'), 'o Dewgong rival ainda usa Skull Bash');
    ok(!movesetDoRival(pack, 149, 60).includes('Skull Bash'), 'o Dragonite rival ainda usa Skull Bash');
    ok(movesetDoRival(pack, 18, 59).includes('Skull Bash'), 'o Pidgeot (Normal) perdeu o golpe do próprio tipo');
    /* E o jogador não muda: o padrão dele é o de sempre (ST-9.12). */
    ok(padraoDoMoveset(pack, 143, 50).includes('Skull Bash') && padraoDoMoveset(pack, 59, 50).includes('Body Slam'), 'o padrão do JOGADOR mudou — não é desta regra');
    ok(!movesetDoRival(pack, 59, 50).includes('Body Slam'), 'o Arcanine rival ainda usa a reserva com dois de Fogo');
  });

  /* D-126 — 99,95% aparecia como 100% — consertado na ST-10.17; o aceite mora
     em `recompensa-pve` ("D-126 consertado"). */

  return s;
}
