# Registro de lacunas

Trabalho **identificado e deliberadamente adiado**. Diferente de `DEFEITOS.md`,
que registra o que está quebrado: aqui fica o que está faltando, ou o que foi
notado enquanto se fazia outra coisa e não cabia naquele bloco.

## Como usar

Toda lacuna precisa de **dono nomeado**. "Depois" não é dono.

O dono é um **bloco** de `POKEARENA_BUILD_BLOCKS`. Quando nenhum bloco serve, o
dono é uma **trilha fora de bloco** — `documento`, `arte`, `jurídico`, `dados de
produção` — e isso precisa estar escrito, porque trilha fora de bloco não é
resolvida por ninguém escrevendo código e some do radar se não for nomeada.

Se nenhum bloco existente serve e o trabalho é de código, **proponha o bloco no
mesmo commit** — com id, método, portões e sabotagem, igual aos outros.

Uma lacuna sai daqui quando o bloco dono fecha. O bloco dono cita a lacuna no
seu critério de saída.

---

## Elenco e balanceamento

As quatro primeiras foram medidas pelo arnês de F0.1 e têm o **mesmo dono, por
uma razão de economia de esforço**: o elenco Kanto vai embora em F1.12, quando o
ContentPack original passa a ser o pack de lançamento. Rebalancear um elenco que
será substituído é trabalho descartável. O valor está em **projetar o elenco
original já sabendo destes quatro números**.

### L-001 — 14 dos 66 golpes nunca são atribuídos a ninguém

**Dono:** F1.12 · **Medido em:** F0.1

21% do conteúdo de golpes é inalcançável: os 6 Sombrios inteiros, Shadow Ball,
Lick, Iron Head, Iron Tail, Meteor Mash, Dragon Pulse, Focus Blast, Ancient Power.

Causa: `assignMoves` é determinístico por dex, e tipos com um único representante
no elenco sempre tiram os mesmos golpes. Magneton é o único Aço e sempre sai com
Flash Cannon e Bullet Punch. Kanto não tem nenhum Sombrio na tipagem moderna, então
aquele pool inteiro é morto.

`GOLPES.md` promete 66. Alcançáveis: 52.

**Requisito para o elenco original:** nenhum tipo com menos de 3 representantes,
ou pool de golpes dimensionado ao número de representantes.

### L-002 — um lutador vence 4× mais que a média

**Dono:** F1.12 · **Medido em:** F0.1 (baseline: 35,24%)

Gengar vence ~35% das rodadas contra os 8,33% de média esperada em 12 lutadores.

Causa medida: **35,2% de todos os golpes do elenco são do tipo Normal**, contra
5,6% que seria o esperado por acaso entre 18 tipos. Isso acontece porque
`MASTER_MOVES.normal` é o pool de reserva de `assignMoves` — entra em 38% dos
sorteios de preenchimento e sempre como último recurso. Gengar é imune a Normal,
e Kanto não tem Sombrio para puni-lo.

**Requisito para o elenco original:** o pool de reserva não pode ser de um tipo
único. Distribuir a reserva ou torná-la neutra.

### L-003 — 13 dos 76 lutadores não conseguem causar dano a um oponente específico

**Dono:** F1.12 · **Medido em:** F0.1

Raticate, Persian, Primeape, Machamp, Hitmonlee, Hitmonchan, Lickitung, Chansey,
Kangaskhan, Tauros, Ditto, Porygon e Snorlax têm o kit **inteiro** imune contra
Gengar. Não arranham. Quando caem na mesma pool, são alimento.

**Requisito:** nenhum lutador pode ter kit com efetividade zero contra outro
lutador do elenco. É invariante testável e deve virar teste em F1.12.

### L-004 — amplitude de 16,6× entre o melhor e o pior do elenco

**Dono:** F1.12 · **Medido em:** F0.1

Do melhor (35,24%) ao pior (Ditto, ~1,6%). Amplitude grande **não é defeito por
si** — é o que cria o azarão que paga alto e dá graça à aposta. Fica registrada
porque interage com dois outros itens: o teto de exposição de F0.8 e o
dimensionamento do Monte Carlo de F0.7, que é ditado pela cauda.

**Decisão pendente para F1.12:** qual amplitude o elenco original deve ter. Menor
amplitude = odds mais próximas = menos emoção, menos passivo, menos simulações
necessárias. É trade-off de produto, não de engenharia.

---

## Motor e protótipo

### L-005 — animação de entrada não acompanha o controle de velocidade

**Dono:** F0.3 · **Notado em:** leitura do protótipo

`releaseAll()` agenda a abertura das pokébolas com `setTimeout` em tempo real,
enquanto a batalha corre em `battleT`, que é multiplicado por `speed`. Com o
controle de velocidade do painel Dev ativo, a entrada dessincroniza do combate.

Cosmético e restrito ao modo de desenvolvimento, mas vira visível se algum dia
houver replay acelerado.

### L-006 — a rodada depende de `requestAnimationFrame`

**Dono:** F1.5 · **Notado em:** leitura do protótipo

Com a aba em segundo plano o `rAF` não roda, então a janela de aposta de 30 s
estica e a batalha congela. Localmente é irrelevante; com relógio compartilhado é
inaceitável, e é exatamente o que F1.5 resolve ao tornar o servidor dono do
relógio. Registrado para que ninguém "conserte" no cliente antes disso.

### L-007 — sabotagem fácil demais enquanto os goldens forem byte-exatos

**Dono:** F0.2 · **Notado em:** F0.1

Qualquer sabotagem que mude comportamento derruba os golden tests, então Q2 passa
sem esforço. O sinal real é a coluna "pego por" do relatório de sabotagem: se um
defeito só cai no golden e não toca invariantes nem estatística, a cobertura de
propriedade está fraca naquela área mesmo com Q2 verde.

**Refinamento pedido:** sabotagens que **preservem as 20 seeds do golden** e só
desloquem o agregado. São as que provam de verdade a suíte estatística.

---

## Conteúdo e identidade

### L-008 — o jogo não tem trilha sonora própria

**Dono:** F1.12 · **Trilha paralela:** arte

`battle-theme.mp3` é faixa da franquia e não foi versionado — ver
`prototype/README.md`. O jogo roda sem ela. O ContentPack original precisa incluir
áudio original, e áudio é produção externa que precisa começar muito antes de F1.12.

---

## Fora de bloco

Trabalho real que **nenhum bloco resolve**. Fica aqui para não sumir do radar.

### L-009 — os simuladores não incorporam os cenários novos

**Dono:** trilha `documento`

O Estudo Econômico v1.2 e o de Unit Economics v1.2 acrescentaram o cenário
regulatório restritivo (§6.1) e o custo de conformidade (§11.1). Os números estão
calculados nos documentos, mas os `.py` e `.csv` de `support/` continuam sendo os
da v1.1. Enquanto isso não mudar, essas duas seções não são reproduzíveis como o
resto do conjunto.

### L-010 — não existe política de publicidade e afiliados

**Dono:** trilha `jurídico` / produto

Nenhum documento do conjunto cobre. Necessária antes de qualquer aquisição paga, e
interage com o capítulo 28: publicidade de produto de aposta tem restrição própria,
e afiliado remunerado por depósito é um incentivo em rota de colisão com proteção
do jogador.

### L-011 — os limiares de risco são chute educado até haver coorte

**Dono:** trilha `dados de produção` · **Mecanismo:** F1.9

Os sete sinais do §28.6 e seus limiares só ficam úteis depois de meses de dados.
F1.9 entrega o mecanismo e a instrumentação; a calibração é pós-V1 e precisa de
dono declarado quando a V1 estiver em produção, senão o sistema roda para sempre
com os números de exemplo.

### L-012 — a consulta de enquadramento regulatório não foi feita

**Dono:** trilha `jurídico` · **Bloqueia:** Etapa A item 8, Fase 5 inteira

Spec §0.5.1. É a única pendência do projeto capaz de reordenar o roadmap
econômico inteiro. Está listada como entrada de arquitetura da v0.9 e ainda não
tem data.
