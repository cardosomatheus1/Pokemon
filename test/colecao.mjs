/* Q1/Q3 · MEDALHAS E MISSÕES DE COLEÇÃO (ST-9.15 · Spec §7.15, §7.6, §7.18, §10.4, §22)
 *
 * Medalhas derivadas (recalcular dá o mesmo, nada é gravado); missões da
 * semana com resgate idempotente, pagando só PokéCoin e bolas, dentro do
 * orçamento escrito; e a fronteira: nada do idle ou da coleção toca a
 * carteira de PokéCash.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import pack from '../content/pokemon_kanto_v1.mjs';
import * as motor from '../app/modules/motor.mjs';
import { medalhasDeColecao, missoesDaSemana, resgatarMissao, MISSOES, ORCAMENTO_SEMANAL, semanaDe, camposDaColecao } from '../app/modules/colecao-dados.mjs';
import { resgatarMissaoLocal } from '../app/modules/colecao-local.mjs';
import { VAZIO, salvar, carregar } from '../app/modules/idle-dados.mjs';

const FIXTURE = JSON.parse(readFileSync(new URL('./fixtures/emissao-idle.json', import.meta.url), 'utf8'));
const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const deposito = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
const T = Date.UTC(2026, 8, 1, 15);
const cria = (id, dex) => ({ id, dex, nivel: 5, xp: 0, vinculo: 0, foco: null, iv: [1, 1, 1, 1, 1, 1], natureza: 'Bold',
                             origem: 'captura', stamina: 100, staminaEm: T, criadaEm: T });

export function suite() {
  const s = criarSuite('colecao');

  s.teste('medalhas derivadas: recalcular dá o mesmo, e nada é gravado', () => {
    const e = VAZIO(); e.criaturas = [cria('a', 4), cria('b', 7), cria('c', 1)];
    const antes = JSON.stringify(e);
    const m1 = medalhasDeColecao(pack, e, { marcas: { vistas: [] }, naArena: motor.elenco });
    igual(JSON.stringify(medalhasDeColecao(pack, e, { marcas: { vistas: [] }, naArena: motor.elenco })), JSON.stringify(m1), 'recalcular mudou');
    igual(JSON.stringify(e), antes, 'a medalha gravou estado');
    ok(m1.find(x => x.id === 'tipo:fire').tier >= 1, 'o Charmander não deu a medalha de fogo');
    /* Soltar não tira medalha: "já possuiu" conta. */
    e.criaturas = []; e.jaPossuiu = [4, 7, 1];
    igual(medalhasDeColecao(pack, e, { naArena: motor.elenco }).find(x => x.id === 'tipo:fire').tier, 1, 'soltar tirou a medalha');
    const fogo = motor.elenco.filter(x => (x.types ?? x.t).includes('fire')).map(x => x.dex);
    const arena = medalhasDeColecao(pack, e, { marcas: { vistas: fogo }, naArena: motor.elenco }).find(x => x.id === 'arena:fire');
    igual(arena.tier, 1, 'viu todos os de fogo e não ganhou');
  });

  s.teste('missões: progresso a partir da base da semana, resgate uma vez, só quando pronta', () => {
    const e = VAZIO();
    const q = missoesDaSemana(e, { marcas: { vistas: [] }, agora: T });
    igual(q.every(x => x.feito === 0), true, 'a semana começou com progresso');
    e.registro = { 10: 30 };
    const moeda = pack.moedaPve.id;
    igual(resgatarMissao(pack, e, { id: 'capturar', marcas: { vistas: [] }, agora: T }).ok, false, 'resgatou missão não feita');
    const r = resgatarMissao(pack, e, { id: 'fichas', marcas: { vistas: [] }, agora: T });
    ok(r.ok && e.bolsa[moeda] === 500 && e.bolsa.great === 2, `resgate: ${JSON.stringify(e.bolsa)}`);
    igual(resgatarMissao(pack, e, { id: 'fichas', marcas: { vistas: [] }, agora: T }).repetida, true, 'resgatou duas vezes');
    igual(e.bolsa[moeda], 500, 'o segundo resgate creditou');
    /* A semana seguinte começa do zero, com a base nova. */
    const seg = missoesDaSemana(e, { marcas: { vistas: [] }, agora: T + 7 * 86400e3 });
    ok(seg.find(x => x.id === 'fichas').feito === 0 && !seg.find(x => x.id === 'fichas').resgatada, 'a semana nova herdou a velha');
    igual(semanaDe(T + 7 * 86400e3), semanaDe(T) + 1, 'a semana não virou');
  });

  s.teste('duas abas: o resgate credita uma vez; o save guarda a semana', () => {
    const d = deposito();
    const e = VAZIO(); e.registro = { 10: 0 }; salvar(e, d);
    const base = carregar(d); missoesDaSemana(base, { marcas: { vistas: [] }, agora: T }); salvar(base, d);
    const e2 = carregar(d); e2.registro = { 10: 40 }; salvar(e2, d);
    ok(resgatarMissaoLocal(pack, { id: 'fichas', marcas: { vistas: [] }, agora: T }, d).ok, 'o resgate gravado falhou');
    igual(resgatarMissaoLocal(pack, { id: 'fichas', marcas: { vistas: [] }, agora: T }, d).repetida, true, 'a outra aba resgatou de novo');
    igual(carregar(d).bolsa[pack.moedaPve.id], 500, 'o pote dobrou');
    igual(camposDaColecao({ missoes: 'lixo' }).missoes, null, 'lixo no save virou semana');
  });

  s.teste('o orçamento: a semana inteira paga no máximo o escrito, e só PokéCoin e bolas', () => {
    const soma = k => MISSOES.reduce((a, m) => a + (m.premio[k] ?? 0), 0);
    ok(soma('pokecoin') <= ORCAMENTO_SEMANAL.pokecoin, `PokéCoin da semana ${soma('pokecoin')} > ${ORCAMENTO_SEMANAL.pokecoin}`);
    ok(soma('poke') + soma('great') + soma('ultra') <= ORCAMENTO_SEMANAL.bolas, 'bolas acima do orçamento');
    const semana = FIXTURE.perfis.casual.estagio1.porDia.pokecoin * 7;
    ok(ORCAMENTO_SEMANAL.pokecoin <= 0.15 * semana, `o orçamento passa de 15% do que o casual colhe (${semana.toFixed(0)}/semana)`);
    const permitidos = new Set(['pokecoin', ...(pack.bolas ?? []).map(b => b.id)]);
    for (const m of MISSOES) for (const k of Object.keys(m.premio)) ok(permitidos.has(k), `a missão ${m.id} paga ${k}`);
  });

  s.teste('a fronteira: nada do idle ou da coleção toca a carteira de PokéCash', () => {
    const pasta = new URL('../app/modules/', import.meta.url);
    const alvos = readdirSync(pasta).filter(f => /^(idle-|pokedex|colecao-|doce-|moveset-|pesquisa-|bonus-arena|dossie-ficha|avanco-)/.test(f));
    ok(alvos.length > 15, `poucos módulos varridos (${alvos.length})`);
    for (const f of alvos) {
      const src = fonte(`../app/modules/${f}`);
      for (const m of src.matchAll(/import \{([^}]*)\} from '\.\/banco\.mjs'/g)) {
        const nomes = m[1].split(',').map(x => x.trim()).filter(Boolean);
        ok(nomes.every(n => n === 'modoServidor'), `${f} importa da carteira de PokéCash: ${nomes.join(', ')}`);
      }
      ok(!/creditarCompra|creditarRecompensa|pagarAposta|converter/.test(src), `${f} converte algo em PokéCash`);
    }
    ok(/[Nn]o código: `pack\.moedaPve`/.test(fonte('../docs/POKEARENA_SPEC_MASTER_V1-V5_v1.5_COMPLETE.md')), 'a Spec §10.4 não diz onde o Trainer Coins mora no código');
  });

  s.teste('a tela: o cartão da coleção vive na Pokédex', () => {
    /* ST-9.16b: a Pokédex abre a aba lembrada, e a aba da Coleção pinta o cartão. */
    ok(/id="pdxColecao"/.test(fonte('../app/index.html')) && /mostrarAba\(abaLembrada\(\)\)/.test(fonte('../app/modules/pokedex.mjs'))
       && /if \(aba === 'colecao'\) \{ pintarMinha\(\); pintarColecao\(\); \}/.test(fonte('../app/modules/colecao-tela.mjs')), 'a coleção não é pintada');
  });

  return s;
}
