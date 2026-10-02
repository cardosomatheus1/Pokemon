/* Q1/Q3 · OS PEQUENOS DO 6º RELATO (ST-2.28b · D-154, D-156, D-157, D-158)
 *
 * Quatro leituras erradas, cada uma com a causa medida:
 *
 *   "3 de 2 vaga(s)"   o cabeçalho da run dividia a equipe (teto 3) pelas
 *                      VAGAS DE EXPEDIÇÃO, que são outra coisa (D-156);
 *   17:50 × 21:04      durante a run o teto reserva os encontros dela (D-107),
 *                      e a hora da volta contava essa reserva (D-157);
 *   "+2"               o resto da bolsa sem dizer o quê (D-158);
 *   o chefe fora de    a aba aberta antes do deploy reproduz a run com o código
 *   ordem              velho, e o servidor a fecha antes (D-154).
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { rotuloDaEquipeDaRun } from '../app/modules/avanco-relogio.mjs';
import { reservadoForaDaRun } from '../app/modules/volta-dados.mjs';
import { resumoDaBolsa } from '../app/modules/bolsa-resumo.mjs';
import { recarregaNaVersaoNova } from '../app/modules/idle-conta.mjs';
import { cartaoTravado, equipeDaEscolha } from '../app/modules/idle-escolha.mjs';
import { EQUIPE_MAX, comprometido } from '../engine/expedicao.mjs';
import { ENCONTROS_POR_AVANCO } from '../engine/avanco.mjs';

const H = 3600_000, T0 = Date.UTC(2026, 9, 5, 15);
const fonte = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

export function suite() {
  const s = criarSuite('relato6');

  s.teste('D-156: a equipe da run se mede pelo teto da EQUIPE, e não pelas vagas de expedição', () => {
    igual(rotuloDaEquipeDaRun(3), `3 de ${EQUIPE_MAX} na equipe`, 'o cabeçalho da run');
    const t = fonte('app/modules/avanco-direita.mjs');
    ok(/rotuloDaEquipeDaRun\(run\.equipe\.length\)/.test(t) && !/de \$\{vagas\} vaga/.test(t), 'a tela da run ainda divide pelas vagas de expedição');
  });

  s.teste('D-157: a hora da volta não conta a reserva da própria run — no aparelho e no servidor', () => {
    const t = { encontrosHoje: 20, emCampo: [{ perfil: 'batida', membros: 1 }], reservas: [ENCONTROS_POR_AVANCO] };
    igual(reservadoForaDaRun(t), comprometido({ ...t, reservas: [] }) - 20, 'a reserva da run entrou na conta');
    ok(reservadoForaDaRun(t) < comprometido(t) - 20, 'sem a run, a reserva tinha de ser menor');
    ok(/reservado: reservadoForaDaRun\(t\)/.test(fonte('app/modules/avanco-estado.mjs')), 'o aparelho conta a reserva da run');
    ok(/reservado: reservadoForaDaRun\(t\)/.test(fonte('server/colecao-rotas.mjs')), 'o servidor conta a reserva da run');
  });

  s.teste('D-157: com o teto cheio e a run aberta, a run diz a MESMA hora que a rota dizia antes dela', async () => {
    const D = await import('../app/modules/idle-dados.mjs');
    const { voltaDoEncontro } = await import('../app/modules/avanco-estado.mjs');
    const PACK = (await import('../content/escolhido.mjs')).default;
    const e = D.VAZIO();
    e.criaturas.push(D.criarCriatura(PACK, 1, 'captura', T0, 'r6'.padStart(12, 'r') + 'a0'));
    e.avancos = [{ colhidaEm: T0 - 10 * H, encontros: 12 }, { colhidaEm: T0 - 6 * H, encontros: 10 }, { colhidaEm: T0 - 2 * H, encontros: 8 }];
    const antes = voltaDoEncontro(e, { pack: PACK, agora: T0 });
    e.run = { id: 'r', semEncontros: true, equipe: [], wave: 3 };
    igual(voltaDoEncontro(e, { pack: PACK, agora: T0 }), antes, 'a run aberta empurrou a hora da volta');
  });

  s.teste('D-158: o resto da bolsa diz o que é', () => {
    const lista = [{ id: 'a', quantidade: 1 }, { id: 'b', quantidade: 1 }, { id: 'c', quantidade: 1 }, { id: 'd', quantidade: 1 }, { id: 'e', quantidade: 1 }];
    ok(/· \+2 outros itens — ver tudo/.test(resumoDaBolsa(lista).texto), resumoDaBolsa(lista).texto);
    ok(/· \+1 outro item — ver tudo/.test(resumoDaBolsa(lista.slice(0, 4)).texto), resumoDaBolsa(lista.slice(0, 4)).texto);
  });

  s.teste('D-154: com conta e uma run aberta, a versão nova recarrega a aba — o replay tem de ser o do servidor', () => {
    igual(recarregaNaVersaoNova({ conta: true, run: { id: 'r' } }), true, 'run aberta na conta e a aba velha segue');
    igual(recarregaNaVersaoNova({ conta: true, run: null }), false, 'recarregou sem run — o aviso basta');
    igual(recarregaNaVersaoNova({ conta: false, run: { id: 'r' } }), false, 'recarregou sem conta — a run do aparelho é a do código dele');
    const pag = fonte('app/index.html');
    const i = pag.indexOf('api.aoMudarVersao(');
    ok(i > 0 && /recarregaNaVersaoNova\(/.test(pag.slice(i, i + 500)) && /location\.reload\(\)/.test(pag.slice(i, i + 500)), 'a aba não recarrega na versão nova');
  });

  /* ── ST-2.28d · o cansado não prende o time (D-159) ────────────────────
     O dono: "um pokémon acabou a stamina e fica travado no time, não consigo
     guardar ele pra botar outro para upar". Medido no navegador: o cartão do
     cansado ficava ACESO E DESABILITADO ao mesmo tempo (não saía da escolha);
     e guardado na caixa pelo Centro, a escolha da run seguia com o id dele. */
  s.teste('D-159: o cartão cansado não entra na escolha, mas SAI dela', () => {
    igual(cartaoTravado({ sel: false, pode: false }), true, 'o cansado de fora pôde entrar');
    igual(cartaoTravado({ sel: true, pode: false }), false, 'o cansado escolhido não pode ser tirado');
    igual(cartaoTravado({ sel: false, pode: true }), false, 'o descansado ficou travado');
    ok(/cartaoTravado\(\{ sel, pode \}\)/.test(fonte('app/modules/idle-equipe.mjs')), 'o cartão da equipe que vai não usa a regra');
  });

  s.teste('D-159: a escolha da run larga quem foi para a caixa, e cai no mais descansado', () => {
    const cr = [{ id: 'a', naCaixa: true }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
    const st = { a: 0, b: 40, c: 90, d: 10 };
    igual(equipeDaEscolha(['a', 'd'], cr, c => st[c.id]).join(','), 'd', 'a escolha manteve quem está na caixa');
    igual(equipeDaEscolha(['a'], cr, c => st[c.id]).join(','), 'c', 'sem ninguém, não caiu no mais descansado');
    igual(equipeDaEscolha(['zz'], cr, c => st[c.id]).join(','), 'c', 'manteve um id que não existe');
    igual(equipeDaEscolha([], [{ id: 'x', naCaixa: true }], () => 0).join(','), '', 'inventou equipe com todos na caixa');
    ok(/equipeEscolhida = equipeDaEscolha\(/.test(fonte('app/modules/idle-tela.mjs')), 'a tela não limpa a escolha a cada pintura');
  });

  return s;
}
