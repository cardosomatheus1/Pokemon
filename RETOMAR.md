> **⚠ ESTE ARQUIVO É HISTÓRICO desde 15/09/2026.** O estado único do projeto
> (GOV-01) é o **`docs/RETOMAR.md`** — o comando é `leia docs/RETOMAR.md e
> continue de onde paramos`. Este aqui ficou parado em 30/08 e continuou na
> raiz, onde uma aba nova o acharia primeiro. Nota posta no cruzamento de
> 25/09/2026; mover para `docs/historico/` é a ST-6.1.

# Retomar daqui — 30/08/2026, madrugada

A **Fase 0 do roteiro de 29/08 está fechada**, mais um bloco extra. A árvore está
limpa e tudo commitado.

---

## Os seis commits desta sessão

| commit | o que entregou | portão |
|---|---|---|
| `40db110` | **H1** — a suíte de aposta para de depender da odd sorteada (`D-044`) | Q2 505/505 |
| `65000ee` | **H2** — o teste do perfil de leitura para de depender do sorteio (`D-048`) | — |
| `0f54d21` | **0.1** — o circuito da progressão fecha, e o F1.10 fecha de verdade (`D-045`) | Q2 511/511 |
| `f5c2a17` | **0.3a** — o clone limpo passa a subir o banco (`D-030`) | — |
| `5db3856` | **0.3b** — as caixas do Q2 somem quando ele não termina (`D-036`) | Q2 515/515 |
| `c2c62de` | **0.4** — o mascarador enxerga o código dentro de `${…}` (`D-046`) | Q2 517/517 |

Suíte: **1079/1079 verde**. Q2: **517/517**. Nenhuma fixture regravada.

---

## O que o bloco 0.1 achou, e é o que importa desta sessão

O critério de saída do F1.10 — *progressão sobrevive a limpar o navegador* — era
**falso**, e o bloco estava marcado como fechado desde 23/08.

`darXP` e `registrarFeito` existiam em `server/progressao.mjs` com **um chamador
cada: os próprios testes**. E `app/` não citava `/api/perfil` em lugar nenhum. A
máquina estava pronta e isolada nas duas pontas — ligar o cliente na rota não
adiantaria nada, ele leria `xp = 0` para sempre.

**Por que o fechamento anterior não viu:** ele conferiu as SABOTAGENS do bloco —
estavam todas lá e verdes — e ninguém conferiu o CRITÉRIO. Havia até um teste de
"limpar o navegador" verde no repositório; ele mede o **saldo**, que é critério
do F1.14.

Sétima ocorrência do padrão que abre o `ROADMAP.md`.

---

## Três decisões que travam a Fase 1, e nenhuma é técnica

**O bloco 1.1 não pode começar sem a primeira.**

1. **Profundidade da instância** — Potencial + Natureza + Foco (recomendado), ou
   IV/EV/Nature completos? A segunda exige alterar o §21 e o §7.9 da Spec **no
   mesmo commit**: o `CLAUDE.md` não deixa contornar a Spec no código.
2. **A seta do boost** — PokéCash boosta e o boost não acompanha a venda, ou o
   boost sai só de Trainer Coins (recomendado)?
3. **VIP** — conforto + cadência? A recomendação está de pé desde julho.
4. **Política de sinais do antifraude** (`L-050`) — sem ela o mercado não abre.

---

## Defeitos abertos que precisam de decisão, não de código

- **`D-031`** — o backend escuta só em `127.0.0.1`. É por isso que o celular
  nunca abriu.
- **`D-047`** — **o modo servidor não tem caminho até o navegador.** `servir.mjs`
  entrega o app e não tem `/api`; o backend entrega `/api` e não serve o app; o
  cliente pede na mesma origem. Nada do F1.14/F1.16 é alcançável pela tela —
  e é a explicação de por que o `D-045` durou seis dias.
- **`D-032`** — o mascarador ainda se perde em literal de expressão regular com
  aspas. Irmão do `D-046`, que fechou; deixado aberto de propósito, porque
  distinguir regex de divisão exige contexto e é risco diferente.

---

## Lacunas novas

`L-053` (terceira travessia no `conferirAbates`), `L-054` (três dos cinco tipos
de desafio sem quem os alimente — há dias em que o jogador recebe um desafio sem
como progredir), `L-055` (o cosmético não sobrevive a limpar o navegador, e o
F1.10 não o possui), `L-056` (o gancho que limpa as caixas não tem teste direto).

---

## Lições desta rodada, para não repetir

- **Quatro vezes um teste mediu algo ADJACENTE ao que o nome dele prometia**, com
  a suíte verde: o `D-048`, e os `S514`/`S515`/`S516`/`S524`. Em todas, a
  sabotagem mostrou que a asserção não dependia do fato recém-garantido.
  Consertar instabilidade tem duas metades — tornar o fato determinístico, **e**
  conferir que a asserção depende dele.
- **Duas vezes o defeito só apareceu RODANDO.** O `TypeError` no `sabotagem.mjs`
  (a suíte nunca pegaria: aquele arquivo *é* o portão e não roda dentro da
  caixa) e o teste de desafio instável em 42% das execuções.
- **Um defeito que só aparece fora de `:memory:` precisa de um teste que saia de
  `:memory:`.** O `D-030` atravessou cinquenta blocos por isso.
- **Não copiar a regra da carteira para o perfil.** *Com sessão não se escreve* é
  certo lá e teria apagado do R24 ao R43 aqui. A regra é dividida, e o teste
  `com sessão, o cosmético continua sendo gravado localmente` a defende.

---

## Para voltar a rodar

```bash
node tools/servir.mjs
```

`http://localhost:8099/` — o jogo, em modo local. O modo servidor não abre no
navegador: ver `D-047`.
