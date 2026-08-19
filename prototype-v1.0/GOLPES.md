# Mapa dos golpes

Com 72 lutadores (só evoluções finais e Pokémon-base de Kanto, sem
pré-evoluções nem os 5 lendários/míticos), escrever 4 golpes à mão para
cada um significaria 288 entradas — impraticável de manter e fácil de
deixar inconsistente. Em vez disso, existe uma tabela mestra de **66
golpes distintos**, agrupados pelos 18 tipos, e cada lutador sorteia os
seus 4 numa seed derivada do próprio número da Pokédex (determinístico:
recarregar a página não muda o kit de ninguém).

Este documento tem duas partes: como o sorteio funciona, e a tabela
completa dos 66 golpes com tipo, poder, classe e a encenação visual de
cada um.

---

## De onde vêm os efeitos

Mesma lógica dos sprites de personagem: em vez de inventar uma bolinha
colorida por tipo, os efeitos são as folhas originais do Pokémon Mystery
Dungeon, do repositório [PMDCollab/RawAsset](https://github.com/PMDCollab/RawAsset).
São **667 arquivos** na pasta `Particle/`, nomeados por golpe — `Shadow_Ball`,
`Crunch`, `Earthquake`, `Discharge`, `Close_Combat`, `Cross_Chop`...

Dessas, **56 folhas** são usadas aqui.

### O corte sai do nome do arquivo

Essas folhas não têm arquivo de metadados. Mas o formato é regular e o
próprio nome diz o resto:

- os quadros são **quadrados**;
- `Nome.Dir8.png` → 8 linhas, uma por direção; `Nome.None.png` → 1 linha;
- **lado do quadro** = altura ÷ número de linhas;
- **número de quadros** = largura ÷ lado.

Exemplo: `Flamethrower.None.png` tem 648×54 → 1 linha, lado 54, **12 quadros**.
`Brave_Bird.Dir8.png` tem 144×384 → 8 linhas, lado 48, **3 quadros**.

Ou seja: nada é chumbado no código. Trocar a folha é trocar a string.

---

## Os três tempos de um golpe

Todo golpe é encenado em até três etapas, encadeadas no relógio da batalha:

| Etapa | O que é | Quando |
|---|---|---|
| **carga** | efeito no atacante antes de sair o golpe | 0,38 s antes |
| **viagem** | projétil que voa, ou jato repetido ao longo da linha | 0,16–0,50 s conforme a distância |
| **impacto** | efeito no alvo | ao final da viagem |

E é **no impacto** que a barra de vida cai, o número de dano sobe, o alvo
pisca, toma o empurrão e a tela treme. Antes, tudo isso acontecia no instante
em que o evento era lido — a vida caía meio segundo antes da explosão chegar.

O agendamento roda no relógio da **batalha**, não em `setTimeout`. Isso
importa: se acelerar o replay, os três tempos aceleram junto, e a sincronia
entre jogadores continua valendo.

Golpes pesados sacodem a tela, proporcional ao peso — de `0.2` no Flamethrower
a `0.9` no Earthquake e no Hyper Beam. Crítico multiplica o tremor por 1,5.

Quando não existe folha boa para o impacto de um golpe, ele cai no estouro
procedural na cor do tipo. É o caso de 6 dos 66 (Aura Sphere, Magical Leaf,
Air Slash, Dragon Pulse, Signal Beam, Ancient Power): melhor um brilho
genérico do que um sprite que não tem nada a ver com o golpe.

---

## Como cada lutador sorteia os 4 golpes dele

Com 72 lutadores, escrever manualmente 288 combinações não é prático nem
sustentável. Em vez disso: uma tabela mestra `MASTER_MOVES` com um punhado
de golpes por tipo, e uma função `assignMoves(pokemon)` que sorteia 4 numa
seed derivada do **próprio número da Pokédex**.

```js
function assignMoves(entry){
  const R = rng(entry.dex * 7919 + 104729);   // seed determinística por dex
  const pools = entry.t.map(t => MASTER_MOVES[t] || MASTER_MOVES.normal);
  // garante pelo menos 1 golpe de cada tipo do lutador...
  // ...e completa até 4, preferindo mais STAB (62% de chance) sobre
  // cobertura genérica (pool "normal")
}
```

"Sorteia" aqui é determinístico, não aleatório de verdade: dex 6
(Charizard) sempre sai com o mesmo kit, em qualquer computador, toda vez
que a página carrega — dá pra recarregar sem o time mudar. Mas dex 6 e dex
59 (Arcanine, outro Fogo) não saem com o kit idêntico, porque a seed muda
com a dex de cada um.

A regra de montagem:

1. **Pelo menos 1 golpe de cada tipo que o lutador tem.** Um dual-type como
   o Charizard (Fogo/Voador) sempre sai com pelo menos 1 golpe de Fogo e
   1 de Voador — nunca os dois golpes do mesmo tipo só porque o sorteio
   deu assim.
2. **Preenche até 4** com 62% de chance de puxar mais um STAB (mesmo tipo,
   golpe diferente) e 38% de chance de golpe de cobertura genérico (pool
   Normal — mordida, investida, essas coisas que combinam com qualquer um).
3. Nunca repete um golpe no mesmo lutador.

## Tabela mestra — os 66 golpes por tipo

**Normal**

| Golpe | Poder | Classe · Acerto | Encenação |
|---|---:|---|---|
| Hyper Beam | 150 | Especial · 75% | carga `Charge_Up` → jato `Solar_Beam_Particle` → impacto `Giga_Impact_Front` → tremor 0.9 |
| Hyper Voice | 90 | Especial · 100% | impacto `Circle_Uproar_Yellow_Out` → tremor 0.3 |
| Body Slam | 85 | Físico · 92% | impacto `Giga_Impact_Front` → tremor 0.5 |
| Skull Bash | 130 | Físico · 92% | impacto `Giga_Impact_Back` → tremor 0.7 |
| Quick Attack | 40 | Físico · 100% | impacto `Metal_Burst` |
| Extreme Speed | 80 | Físico · 92% | impacto `Metal_Burst` → tremor 0.3 |

**Fogo**

| Golpe | Poder | Classe · Acerto | Encenação |
|---|---:|---|---|
| Flamethrower | 90 | Especial · 92% | jato `Flamethrower` → impacto `Fire_Fang_Hit` → tremor 0.2 |
| Fire Blast | 110 | Especial · 85% | projétil `Fire_Blast` → impacto `Blast_Burn` → tremor 0.5 |
| Fire Punch | 75 | Físico · 92% | impacto `Fire_Fang_Hit` → tremor 0.3 |

**Água**

| Golpe | Poder | Classe · Acerto | Encenação |
|---|---:|---|---|
| Hydro Pump | 110 | Especial · 80% | jato `Hydro_Pump_RSE` → impacto `Aqua_Tail_Splash` → tremor 0.45 |
| Surf | 90 | Especial · 100% | jato `Aqua_Tail_Wave` → impacto `Aqua_Tail_Splash` → tremor 0.4 |
| Waterfall | 80 | Físico · 92% | impacto `Aqua_Tail_Splash` → tremor 0.35 |

**Elétrico**

| Golpe | Poder | Classe · Acerto | Encenação |
|---|---:|---|---|
| Thunderbolt | 90 | Especial · 92% | jato `Shock_Wave` → impacto `Discharge` → tremor 0.35 |
| Discharge | 80 | Especial · 100% | impacto `Discharge` → tremor 0.3 |
| Volt Tackle | 120 | Físico · 92% | carga `Spark` → impacto `Discharge_Hit` → tremor 0.6 |
| Thunder Fang | 65 | Físico · 95% | impacto `Thunder_Fang_Fang` |

**Planta**

| Golpe | Poder | Classe · Acerto | Encenação |
|---|---:|---|---|
| Solar Beam | 120 | Especial · 92% | carga `Solar_Beam_Charge` → jato `Solar_Beam_Particle` → impacto `Giga_Impact_Front` → tremor 0.5 |
| Petal Dance | 120 | Especial · 92% | projétil `Petal_Dance_Flower_Pink` → impacto `Circle_Pink_Out` |
| Magical Leaf | 60 | Especial · 100% | projétil `Magical_Leaf` → impacto procedural |

**Gelo**

| Golpe | Poder | Classe · Acerto | Encenação |
|---|---:|---|---|
| Ice Beam | 90 | Especial · 92% | jato `Ice_Pieces` → impacto `Avalanche_Hit` → tremor 0.2 |
| Blizzard | 110 | Especial · 70% | jato `Hail` → impacto `Avalanche_Hit` → tremor 0.4 |
| Ice Fang | 65 | Físico · 92% | impacto `Ice_Fang_Hit` |

**Lutador**

| Golpe | Poder | Classe · Acerto | Encenação |
|---|---:|---|---|
| Aura Sphere | 80 | Especial · 100% | projétil `Aura_Sphere` → impacto procedural |
| Focus Blast | 120 | Especial · 70% | projétil `Focus_Blast_Ball` → impacto `Focus_Blast_Hit` → tremor 0.5 |
| Close Combat | 120 | Físico · 92% | impacto `Close_Combat` → tremor 0.5 |
| Cross Chop | 100 | Físico · 80% | impacto `Cross_Chop` → tremor 0.4 |
| Dynamic Punch | 100 | Físico · 60% | impacto `Dizzy_Punch_Hit` → tremor 0.55 |
| Body Press | 80 | Físico · 92% | impacto `Giga_Impact_Front` → tremor 0.5 |

**Venenoso**

| Golpe | Poder | Classe · Acerto | Encenação |
|---|---:|---|---|
| Sludge Bomb | 90 | Especial · 92% | projétil `Acid_Purple` → impacto `Cross_Poison` |
| Poison Jab | 80 | Físico · 92% | impacto `Poison_Jab` → tremor 0.2 |
| Gunk Shot | 120 | Físico · 70% | projétil `Gunk_Shot` → impacto `Gunk_Shot_Hit` → tremor 0.4 |

**Terrestre**

| Golpe | Poder | Classe · Acerto | Encenação |
|---|---:|---|---|
| Earthquake | 100 | Físico · 92% | impacto `Earthquake_Ranger` → tremor 0.9 |
| Dig | 80 | Físico · 92% | impacto `Dig` → tremor 0.4 |
| Mud Shot | 55 | Especial · 95% | projétil `Mud_Shot_Ball` → impacto `Mud_Bomb_Hit` |

**Voador**

| Golpe | Poder | Classe · Acerto | Encenação |
|---|---:|---|---|
| Air Slash | 75 | Especial · 92% | projétil `Air_Slash_Slash` → impacto procedural |
| Brave Bird | 120 | Físico · 92% | carga `Brave_Bird` → impacto `Brave_Bird_Hit` → tremor 0.6 |
| Drill Peck | 80 | Físico · 100% | impacto `Wing_Attack` → tremor 0.25 |

**Psíquico**

| Golpe | Poder | Classe · Acerto | Encenação |
|---|---:|---|---|
| Psychic | 90 | Especial · 92% | impacto `Psycho_Boost_Front` → tremor 0.35 |
| Psyshock | 80 | Especial · 92% | projétil `Psycho_Cut_Cut` → impacto `Psycho_Boost_Front` |
| Zen Headbutt | 80 | Físico · 92% | impacto `Zen_Headbutt` → tremor 0.35 |

**Inseto**

| Golpe | Poder | Classe · Acerto | Encenação |
|---|---:|---|---|
| Bug Bite | 60 | Físico · 100% | impacto `Bug_Bite` |
| X-Scissor | 80 | Físico · 92% | impacto `X_Scissor` → tremor 0.3 |
| Megahorn | 120 | Físico · 85% | impacto `Megahorn_Front` → tremor 0.5 |
| Signal Beam | 75 | Especial · 92% | projétil `Signal_Beam` → impacto procedural |

**Pedra**

| Golpe | Poder | Classe · Acerto | Encenação |
|---|---:|---|---|
| Stone Edge | 100 | Físico · 80% | projétil `Stone_Edge_Rock` → impacto `Iron_Head` → tremor 0.5 |
| Rock Tomb | 60 | Físico · 95% | impacto `Ancient_Power_Front` → tremor 0.3 |
| Ancient Power | 60 | Especial · 100% | projétil `Ancient_Power_Front` → impacto procedural → tremor 0.3 |

**Fantasma**

| Golpe | Poder | Classe · Acerto | Encenação |
|---|---:|---|---|
| Shadow Ball | 80 | Especial · 92% | projétil `Shadow_Ball` → impacto `Sucker_Punch_Hit` |
| Shadow Claw | 70 | Físico · 100% | impacto `Shadow_Claw` → tremor 0.3 |
| Lick | 30 | Físico · 96% | impacto `Lick` |

**Dragão**

| Golpe | Poder | Classe · Acerto | Encenação |
|---|---:|---|---|
| Dragon Pulse | 85 | Especial · 92% | projétil `Dragon_Pulse_Ball` → impacto procedural → tremor 0.2 |
| Dragon Claw | 80 | Físico · 92% | impacto `Cut_Dark` → tremor 0.3 |
| Outrage | 120 | Físico · 92% | impacto `Giga_Impact_Back` → tremor 0.6 |

**Sombrio** — nenhum Kanto tem este tipo; entra só como cobertura genérica

| Golpe | Poder | Classe · Acerto | Encenação |
|---|---:|---|---|
| Crunch | 80 | Físico · 92% | impacto `Crunch` → tremor 0.35 |
| Bite | 60 | Físico · 92% | impacto `Bite` |
| Knock Off | 65 | Físico · 92% | impacto `Knock_Off` → tremor 0.3 |
| Payback | 50 | Físico · 92% | impacto `Payback` |
| Foul Play | 95 | Físico · 92% | impacto `Cut_Dark` → tremor 0.35 |
| Dark Pulse | 80 | Especial · 92% | jato `Dark_Pulse_Front` → impacto `Sucker_Punch_Hit` |

**Aço**

| Golpe | Poder | Classe · Acerto | Encenação |
|---|---:|---|---|
| Flash Cannon | 80 | Especial · 92% | jato `Flash_Cannon` → impacto `Flash_Cannon_Release` → tremor 0.3 |
| Iron Head | 80 | Físico · 92% | impacto `Iron_Head` → tremor 0.4 |
| Iron Tail | 100 | Físico · 75% | impacto `Metal_Burst` → tremor 0.45 |
| Meteor Mash | 90 | Físico · 92% | projétil `Meteor_Mash_Star` → impacto `Bullet_Punch` → tremor 0.4 |
| Bullet Punch | 40 | Físico · 100% | impacto `Bullet_Punch` |

**Fada**

| Golpe | Poder | Classe · Acerto | Encenação |
|---|---:|---|---|
| Moonblast | 95 | Especial · 92% | projétil `Circle_Small_Pink_Out` → impacto `Circle_Pink_Out` → tremor 0.4 |
| Dazzling Gleam | 80 | Especial · 92% | impacto `Circle_Pink_Out` → tremor 0.25 |

---

## Como o poder do golpe vira dano

O poder da tabela acima entra na fórmula de dano dos jogos, nível 50:

```
base = ((2 × 50 / 5 + 2) × poder × ataque / defesa) / 50 + 2
dano = base × STAB × tipo × crítico × sorteio(0,85–1,00)
```

- **ataque/defesa**: golpe **físico** usa Ataque contra Defesa; **especial**
  usa Ataque Especial contra Defesa Especial. É por isso que o Machamp bate
  forte no braço e o Alakazam bate forte no feixe.
- **STAB** (×1,5): quando o tipo do golpe é um dos tipos do lutador. O
  Flamethrower do Charizard bate 50% mais forte do que bateria na mão de
  outro que não fosse de Fogo.
- **tipo**: tabela completa dos 18 tipos, regra da geração 6+ (a mesma que
  faz Clefairy/Jigglypuff/Mr. Mime contarem como Fada).
- **crítico**: 1/16 de chance, ×1,5.
- **acerto**: a coluna "Acerto" da tabela. Dynamic Punch com 60% erra 2 de
  cada 5 vezes — o preço dos 100 de poder.
- **clima**: se a arena sortear Sol/Chuva/Vendaval/Nevasca, ATK/SpA ou
  Velocidade do tipo favorecido são multiplicados **antes** de tudo isso.
  Ver a seção de clima no [LEIA-ME.md](LEIA-ME.md#clima-da-arena).

E o sorteio do golpe é uniforme entre os 4: ninguém escolhe o melhor golpe
para a situação. Isso é de propósito — mantém a arena como aposta em cima de
um sorteio, não em cima de uma IA que joga bem.

---

## Mexer nisso

- **Trocar o efeito de um golpe**: `MOVE_FX` no `index.html`. Cada entrada
  aceita `cast`, `proj`, `beam`, `hit`, com escalas (`csc`, `sc`, `hsc`) e
  `shake`.
- **Ver o catálogo inteiro**: os 667 arquivos estão em
  `https://api.github.com/repos/PMDCollab/RawAsset/contents/Particle` e a
  imagem em
  `https://raw.githubusercontent.com/PMDCollab/RawAsset/master/Particle/<arquivo>`.
- **Trocar poder, tipo ou precisão de um golpe**: `MASTER_MOVES`, no bloco
  do tipo correspondente. Mudou o poder, as odds mudam junto na rodada
  seguinte — elas saem de 20.000 simulações do mesmo motor.
- **Adicionar um golpe novo a um tipo**: acrescenta na lista do tipo em
  `MASTER_MOVES`, com uma entrada correspondente em `MOVE_FX` (ou deixa sem
  — cai automaticamente no estouro procedural).
- **Mudar como os 4 são sorteados**: `assignMoves()`, logo abaixo de
  `MASTER_MOVES`.
