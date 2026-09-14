/* Q1/Q3/Q4/Q6 · O ENCONTRO VIRA CAPTURA (bloco 1.2b, §7.5, §7.6, §28, §0.3).
 *
 * ── AS QUATRO AFIRMAÇÕES ──────────────────────────────────────────────────
 *
 * 1. **A CHANCE NÃO OLHA PARA DINHEIRO.** Nem para o saldo, nem para o valor
 *    apostado, nem para a aposta ter sido feita. É o §7.5 e é o §28: num jogo
 *    de apostas, ligar progressão de coleção a volume apostado cria pressão
 *    para apostar por um motivo que não é apostar — e isso não passa no §25.1.
 *
 *    O teste não enumera nomes de campo. Ele ESPIA com um Proxy tudo que a
 *    função lê, e reprova qualquer leitura fora da lista curta. É a lição que a
 *    sabotagem do 1.2a ensinou: enumerar veneno é adivinhação.
 *
 * 2. **ENCONTRAR NÃO É CAPTURAR, E FALHAR NÃO É PERDER TUDO.** O fragmento de
 *    registro cai no ENCONTRO. Sem isso, um teto de 85% vira 15% de frustração
 *    pura — e frustração é o que faz fechar a aba.
 *
 * 3. **A BOLA É CONSUMIDA MESMO QUANDO FALHA.** É o único custo do lance. Sem
 *    ele, a decisão de qual bola usar não é decisão: usa-se a melhor sempre.
 *
 * 4. **A ARENA É MODIFICADOR, NUNCA FONTE.** A espécie apostada fica mais
 *    COMUM por algumas horas — mexe no peso do encontro, e em mais nada. Se
 *    encostasse na chance de captura, apostar viraria "ser melhor caçador", que
 *    é o mesmo defeito da afirmação 1 por outra porta.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import {
  TETO_CAPTURA, FRAGMENTOS_POR_ENCONTRO, DURACAO_BONUS_MS, PESO_APOSTADA,
  chanceDe, tentar, pesoComBonus, bonusVivo, fragmentosDe,
  baseDaRaridade, alvoRegistro, bolaDe,
} from '../engine/captura.mjs';
import { semente } from '../engine/instancia.mjs';
import { sortearEncontros } from '../engine/expedicao.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';
import original from '../content/original_v1.mjs';

const T0 = Date.UTC(2026, 7, 30, 12, 0, 0);
const FAIXAS = kanto.raridade.map(([id]) => id);
const IDS_BOLA = kanto.bolas.map(b => b.id);

export function suite() {
  const s = criarSuite('captura');

  /* --- 1 · A CHANCE NÃO OLHA PARA DINHEIRO (§7.5, §28) -------------------- */

  s.teste('§28 · chanceDe() não lê nada de economia', () => {
    const PERMITIDO = ['raridade', 'bola'];
    const lidas = new Set();
    const espiao = new Proxy(
      { raridade: 'raro', bola: 'ultra',
        /* tudo abaixo é veneno: existe no objeto e NÃO pode ser lido */
        saldo: 999999, apostou: true, valorApostado: 5000, vip: true,
        assinante: true, comprou: true, nivelDeGasto: 9, boost: true },
      { get(alvo, k) { if (typeof k === 'string') lidas.add(k); return alvo[k]; } });

    chanceDe(kanto, espiao);

    const proibidas = [...lidas].filter(k => !PERMITIDO.includes(k));
    igual(proibidas.join(','), '',
      `chanceDe() leu ${proibidas.join(', ')}. A chance de captura é função da ` +
      `RARIDADE e da BOLA, e de mais nada. Ler qualquer coisa de economia liga ` +
      `progressão de coleção a dinheiro — e num jogo de apostas isso é pressão ` +
      `para apostar por um motivo que não é apostar (§28). Se o campo novo for ` +
      `legítimo, acrescente-o à lista aqui de propósito, e não por acidente.`);
    ok(lidas.has('raridade') && lidas.has('bola'),
      'chanceDe() não leu nem a raridade nem a bola — não está calculando nada');
  });

  s.teste('§7.5 · a chance é idêntica para quem apostou e para quem não apostou', () => {
    for (const r of FAIXAS) for (const b of IDS_BOLA) {
      const a = chanceDe(kanto, { raridade: r, bola: b });
      const c = chanceDe(kanto, { raridade: r, bola: b,
        apostou: true, valorApostado: 9e9, saldo: 9e9, vip: true });
      igual(a, c, `${r} com ${b} mudou de ${a} para ${c} quando o jogador apostou`);
    }
  });

  /* --- o formato da chance ------------------------------------------------ */

  s.teste('a chance nunca passa do teto, em nenhuma combinação', () => {
    for (const r of FAIXAS) for (const b of IDS_BOLA) {
      const c = chanceDe(kanto, { raridade: r, bola: b });
      ok(c <= TETO_CAPTURA + 1e-9,
        `${r} com ${b} deu ${(c*100).toFixed(1)}%, acima do teto de ` +
        `${(TETO_CAPTURA*100)}%. Captura garantida vira tarefa; o teto é o que ` +
        `mantém a sorte na conta, e sem sorte o farm vira planilha.`);
      ok(c > 0, `${r} com ${b} deu chance zero — espécie que não se captura`);
    }
  });

  s.teste('mais raro é sempre mais difícil, com a mesma bola', () => {
    for (const b of IDS_BOLA) {
      for (let i = 1; i < FAIXAS.length; i++) {
        const antes = chanceDe(kanto, { raridade: FAIXAS[i-1], bola: b });
        const dep = chanceDe(kanto, { raridade: FAIXAS[i], bola: b });
        ok(dep < antes || antes >= TETO_CAPTURA,
          `com a bola ${b}, ${FAIXAS[i]} (${(dep*100).toFixed(1)}%) não é mais ` +
          `difícil que ${FAIXAS[i-1]} (${(antes*100).toFixed(1)}%). A raridade tem ` +
          `de doer, senão o preço do mercado deixa de ter explicação.`);
      }
    }
  });

  s.teste('a bola melhor nunca piora a chance', () => {
    const ordem = [...kanto.bolas].sort((a,b) => a.mult - b.mult).map(b => b.id);
    for (const r of FAIXAS)
      for (let i = 1; i < ordem.length; i++)
        ok(chanceDe(kanto, { raridade: r, bola: ordem[i] })
           >= chanceDe(kanto, { raridade: r, bola: ordem[i-1] }),
          `em ${r}, a bola ${ordem[i]} ficou pior que a ${ordem[i-1]}`);
  });

  s.teste('raridade ou bola desconhecida não vira captura de graça', () => {
    igual(chanceDe(kanto, { raridade: 'inventada', bola: 'ultra' }), 0,
      'uma raridade que o pack não declara deu chance. Dado errado tem de virar ' +
      'zero e não jackpot — chance por acidente é criatura de graça, e criatura ' +
      'de graça é preço de mercado errado.');
    igual(chanceDe(kanto, { raridade: 'comum', bola: 'inventada' }), 0,
      'uma bola inexistente funcionou — seria captura sem consumir nada');
    igual(chanceDe(null, { raridade: 'comum', bola: 'poke' }), 0,
      'sem pack não pode haver chance nenhuma');
  });

  /* --- 2 e 3 · O LANCE ---------------------------------------------------- */

  s.teste('a bola é consumida mesmo quando a captura falha', () => {
    const rnd = semente(5);
    let gastas = 0, pegas = 0;
    for (let i = 0; i < 400; i++) {
      const r = tentar(rnd, kanto, { raridade: 'muitoRaro', bola: 'poke' });
      if (r.consumiu) gastas++;
      if (r.capturou) pegas++;
    }
    igual(gastas, 400,
      `${400 - gastas} lances não consumiram a bola. O consumo é o ÚNICO custo do ` +
      `lance — sem ele, escolher a bola deixa de ser decisão: usa-se a melhor sempre.`);
    ok(pegas > 0 && pegas < 400, `capturou ${pegas} de 400 — devia falhar bastante`);
  });

  s.teste('o fragmento de registro cai no ENCONTRO, inclusive quando falha', () => {
    const rnd = semente(9);
    let semFragmento = 0, falhas = 0;
    for (let i = 0; i < 300; i++) {
      const r = tentar(rnd, kanto, { raridade: 'lendario', bola: 'poke' });
      if (!r.capturou) falhas++;
      if (r.fragmentos < FRAGMENTOS_POR_ENCONTRO) semFragmento++;
    }
    ok(falhas > 200, `só ${falhas} falhas em 300 lances no lendário — o teste não mede nada`);
    igual(semFragmento, 0,
      `${semFragmento} encontros não deram fragmento. Ele cai no ENCONTRO e não na ` +
      `captura, de propósito: com o teto em 85%, uma captura que falha e não dá ` +
      `NADA transforma o farm em 15% de frustração pura — e frustração é o que faz ` +
      `o jogador fechar a aba.`);
  });

  s.teste('o alvo do registro cresce com a raridade', () => {
    for (let i = 1; i < FAIXAS.length; i++)
      ok(alvoRegistro(kanto, FAIXAS[i]) > alvoRegistro(kanto, FAIXAS[i-1]),
        `${FAIXAS[i]} precisa de ${alvoRegistro(kanto, FAIXAS[i])} fragmentos e ` +
        `${FAIXAS[i-1]} de ${alvoRegistro(kanto, FAIXAS[i-1])} — completar o raro tem ` +
        `de custar mais, senão a ficha rara não vale nada`);
  });

  s.teste('§Q4 · a taxa medida bate com a chance declarada', () => {
    for (const r of ['comum', 'raro']) {
      const rnd = semente(77);
      let pegas = 0;
      const N = 4000;
      for (let i = 0; i < N; i++)
        if (tentar(rnd, kanto, { raridade: r, bola: 'great' }).capturou) pegas++;
      const medida = pegas / N, alvo = chanceDe(kanto, { raridade: r, bola: 'great' });
      ok(Math.abs(medida - alvo) < 0.03,
        `${r} com a bola great: declarado ${(alvo*100).toFixed(1)}%, medido ` +
        `${(medida*100).toFixed(1)}% em ${N} lances. O número que a tela mostra ` +
        `tem de ser o número que acontece — §28.5, honestidade do que se exibe.`);
    }
  });

  s.teste('a mesma semente devolve o mesmo lance', () => {
    const a = tentar(semente(3), kanto, { raridade: 'raro', bola: 'ultra' });
    const b = tentar(semente(3), kanto, { raridade: 'raro', bola: 'ultra' });
    igual(JSON.stringify(a), JSON.stringify(b),
      'sem determinismo a captura não é auditável, e o §25.2 não fecha para ela ' +
      'como fecha para a rodada');
  });

  /* --- 4 · A ARENA É MODIFICADOR, NUNCA FONTE ----------------------------- */

  s.teste('§28 · o bônus da arena não encosta na chance de captura', () => {
    const bonus = { dex: 25, ate: T0 + DURACAO_BONUS_MS };
    for (const r of FAIXAS) for (const b of IDS_BOLA)
      igual(chanceDe(kanto, { raridade: r, bola: b, bonus, dex: 25, agora: T0 }),
            chanceDe(kanto, { raridade: r, bola: b }),
        `o bônus da arena mudou a chance de capturar um ${r} com ${b}. Ele pode ` +
        `mexer em QUEM APARECE e em mais nada — encostar na chance transformaria ` +
        `apostar em "ser melhor caçador", que é o mesmo defeito do §28 por outra porta.`);
  });

  s.teste('o bônus pesa a espécie apostada, e só ela', () => {
    const bonus = { dex: 25, ate: T0 + DURACAO_BONUS_MS };
    igual(pesoComBonus(10, 25, bonus, T0), 10 * PESO_APOSTADA,
      'a espécie apostada tinha de pesar mais');
    igual(pesoComBonus(10, 26, bonus, T0), 10,
      'uma espécie que não é a apostada teve o peso mexido');
  });

  s.teste('o bônus expira, e expirar é no instante exato', () => {
    const bonus = { dex: 25, ate: T0 + DURACAO_BONUS_MS };
    igual(bonusVivo(bonus, T0), true, 'nasceu morto');
    igual(bonusVivo(bonus, bonus.ate - 1), true, 'morreu um milissegundo cedo');
    igual(bonusVivo(bonus, bonus.ate), false,
      'o bônus não expirou na hora marcada. Bônus que não expira deixa de ser ' +
      'bônus e vira vantagem permanente de quem apostou.');
    igual(pesoComBonus(10, 25, bonus, bonus.ate), 10, 'o peso não voltou ao normal');
    igual(pesoComBonus(10, 25, null, T0), 10, 'sem bônus nenhum, o peso é o peso');
  });

  /* SEM APOSTA, A COLEÇÃO ANDA. É a afirmação que fez o desenho mudar. */
  s.teste('§28 · quem NUNCA apostou continua encontrando de tudo', () => {
    const rnd = semente(4);
    const vistos = new Set();
    for (let i = 0; i < 300; i++)
      for (const e of sortearEncontros(rnd, { pack: kanto, bioma: 'campo', perfil: 'vigilia' }))
        vistos.add(e.dex);
    ok(vistos.size > 15,
      `sem nenhuma aposta, só ${vistos.size} espécies apareceram no campo. O idle ` +
      `produz encontro SOZINHO — a arena é modificador e nunca fonte. Se ela virar ` +
      `fonte, colecionar passa a exigir apostar, e o §28 cai.`);
  });

  /* --- §Gen2 e §0.3.1 ----------------------------------------------------- */

  s.teste('§Gen2 · a captura funciona com as bolas e a escala de OUTRO pack', () => {
    for (const [id] of original.raridade) {
      const c = chanceDe(original, { raridade: id, bola: original.bolas[0].id });
      ok(c > 0 && c <= TETO_CAPTURA,
        `a faixa "${id}" do pack original deu ${c} com a bola dele`);
      ok(baseDaRaridade(original, id) > 0, `a faixa "${id}" não declara chance base`);
      ok(alvoRegistro(original, id) > 0, `a faixa "${id}" não declara alvo de registro`);
    }
    /* e a bola do OUTRO pack não pode funcionar aqui */
    igual(chanceDe(original, { raridade: 'comum', bola: 'poke' }), 0,
      'uma bola do outro pack funcionou. Cada pack declara as suas — se as duas ' +
      'listas se cruzarem, o motor está conhecendo tema.');
  });

  s.teste('§0.3.1 · os dois packs têm bolas de nomes próprios', () => {
    const idsK = new Set(kanto.bolas.map(b => b.id));
    for (const b of original.bolas)
      ok(!idsK.has(b.id),
        `a bola "${b.id}" é a mesma nos dois packs. O §0.3.1 exige que o original ` +
        `seja jogável SEM a franquia, e reusar o id de lá é trazer a franquia por ` +
        `outro caminho — foi o mesmo erro que eu já cometi com os biomas dele.`);
    for (const p of [kanto, original])
      for (const b of p.bolas) {
        ok(b.rotulo && b.mult > 0, `a bola "${b.id}" está incompleta`);
        ok(bolaDe(p, b.id) === b, `bolaDe não acha a bola "${b.id}"`);
      }
  });

  s.teste('fragmentosDe respeita o alvo e não passa dele', () => {
    for (const r of FAIXAS) {
      const alvo = alvoRegistro(kanto, r);
      igual(fragmentosDe(kanto, r, 0), 0);
      igual(fragmentosDe(kanto, r, alvo), 1, `${r} não completou no alvo exato`);
      igual(fragmentosDe(kanto, r, alvo * 3), 1,
        `${r} passou de 100% com fragmento sobrando. Barra que passa de cheia é ` +
        `número que a tela não sabe desenhar.`);
    }
  });

  return s;
}
