/* AS BARRAS DA RUN — camada 0: a stamina e o XP como VÃO FICAR, ao vivo.
 *
 * O dono: "entendi que ali é barra de stamina, mas ela reduz quando? isso tá
 * funcionando?" e "onde tem barra de XP do pokémon?". As duas perguntas têm a
 * mesma causa: a run só COBRA a stamina e só PAGA o XP na colheita, no fim
 * (`contaDaRun`). Durante a luta a stamina ficava parada em 100 e o XP parado
 * no nível de antes — tudo certo no bolso, tudo errado na tela.
 *
 * Aqui a tela passa a mostrar o que a colheita vai gravar:
 *
 *   STAMINA   a de agora MENOS o que as waves alcançadas já custaram — o mesmo
 *             `staminaAteWave` que a colheita cobra (2 por wave, 5 no chefe)
 *   XP        o da criatura MAIS o que a run já rendeu — o mesmo `ganhoDaRun`
 *             do "XP até aqui"; o clima entra só na colheita, por isso "≈"
 *
 * Nada muda no que se cobra nem no que se paga; muda o que se VÊ. */
import { progresso } from '../../engine/nivel-criatura.mjs';

export const staminaNaRun = (agora, custo) =>
  Math.max(0, Math.round((Number(agora) || 0) - Math.max(0, Number(custo) || 0)));

export function xpNaRun(xpAtual, ganho) {
  const g = Math.max(0, Math.floor(Number(ganho) || 0));
  const antes = progresso(xpAtual), depois = progresso((Number(xpAtual) || 0) + g);
  return { ...depois, ganho: g, subiu: depois.nivel - antes.nivel };
}

/* A linha curta embaixo da barra de XP. */
export function textoDoXp(p) {
  if (p.maximo) return 'nível máximo';
  const subiu = p.subiu > 0 ? ` · ▲ nv ${p.nivel}` : '';
  return `${p.ganho ? `+${p.ganho} XP nesta run` : 'sem XP ainda nesta run'}${subiu} · faltam ${p.falta} para o nv ${p.nivel + 1}`;
}
