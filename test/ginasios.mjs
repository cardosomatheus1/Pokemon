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
import { movesetDoRival, padraoDoMoveset, liberados } from '../app/modules/moveset-dados.mjs';
import { rivalDe, treinador } from '../app/modules/treino-dados.mjs';
import { lote, resumo } from '../engine/treino-preco.mjs';
import { fraseDoResultado } from '../app/modules/pve-dados.mjs';
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
    igual(fx.ginasios.map(g => g.id).join(), gin.map(n => n.id).join(), 'ginásio sem medição (dificuldade estimada reprova)');
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
      const dif = r.ignora.filter((x, i) => x[0] !== r.aplica[i][0] || x[1] !== r.aplica[i][1]);
      igual(dif.length, 1, `${id}: os times diferem em ${dif.length} membros`);
      igual(r.ignora.map(x => x[1]).join(), r.aplica.map(x => x[1]).join(), `${id}: os níveis mudaram junto`);
    }
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

  s.teste('D-126 (afirma o defeito): 99,95% aparece como 100%', () => {
    const t = fraseDoResultado({ vencedor: 'A', turnos: 3 }, { p: 0.9995, erro: 0.0005, sims: 2000 }).texto;
    ok(/100%/.test(t), `D-126 CONSERTADO? "${t}" — mova este teste para o aceite da ST-10.17`);
  });

  return s;
}
