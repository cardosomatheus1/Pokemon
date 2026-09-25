# Conferência da Revisão 2.0 contra o código real

> **Convenção de nomes.** As decisões desta revisão usam DOIS dígitos — `DEC-01`
> a `DEC-11` — e são uma série própria. As de TRÊS dígitos (`DEC-019`,
> `DEC-075`, `DEC-095`…) são do mapa de decisões do dono, citado em `LACUNAS`.
> Não se confundem: `DEC-10` é o fuso do mundo; `DEC-010` seria outra coisa.
>
> **Nesta pasta:** `REVISAO_POKEARENA.md` (o parecer), `revisado/` (os textos
> novos do revisor), `versoes-reescritas/` (os 27 documentos como ele os
> reescreveu — REFERÊNCIA, não fonte de verdade), `support/` (o script de
> contas e as premissas). O pacote original trazia também cópias dos 27
> originais; elas não entram porque já estão em `docs/`.

**25/09/2026.** A revisão externa de 24/09 (`REVISAO_POKEARENA.md`, nesta pasta)
foi feita **só com documentos** — o revisor avisou: *"o ZIP não continha o código
executável"*. Esta conferência faz a parte que ele não pôde: cada achado contra o
repositório.

**O que eu adoto, o que não adoto, e por quê, está no fim.**

## Achado por achado

| ID | Veredito | Evidência no repositório | Destino |
|---|---|---|---|
| REV-01 | **PROCEDE** | `TAREFA_1.27f_CARTAO.md` dizia "A FAZER" depois do fecho de 16/09 | corrigido |
| REV-02 | **PROCEDE** | ROADMAP e RETOMAR punham o T11 à frente, contra o congelamento do arnês | corrigido: o próximo é o 1.33 |
| REV-03 | **PROCEDE — e eu repeti o erro ao dono** | `engine/preco.mjs` já tinha a conta certa; Spec §4.4.3, Economy §4.1 e `engine/engine.mjs` ainda diziam +19,22% | corrigido nos três. Viés real: 0,31% |
| REV-04 | não conferível no código | é desenho econômico (linhagem paga → poder) | DEC-03, do dono |
| REV-05 | procede nos documentos | vocabulário de moedas espalhado | registrado; entra com o bloco de economia |
| REV-06 | procede | o próprio `CLAUDE.md` lista a arte original como trava | DEC-01, do dono |
| REV-07 | procede nos documentos | RMT tratado como chave de loja | DEC-02, do dono |
| REV-08 | **PROCEDE (janela)** | código `BET_WINDOW: 40`; `API.md` dizia 30 s. Raiz: código `BITS_RAIZ = 128`; não achei "32 bits" na API | janela corrigida |
| REV-09 | **PROCEDE (texto)** | código: `MOBS_POR_WAVE 4`, `MOBS_DO_CHEFE 1`, `STAMINA_DO_AVANCO 23` — já é o que ele recomenda; o §7.22.4 dizia 6/2/35 | Spec corrigida para o código |
| REV-10 | **PROCEDE** | prévia "exata" contra clima oculto (L-177) | resolvido no cartão 1.33 adotado |
| REV-11 | procede | D-093 e L-174 já registrados | seguem com os blocos donos |
| REV-12 | **em parte** | a chave do Q2 JÁ inclui `process.version`; não inclui a versão do Chromium | lacuna nova; arnês congelado |
| REV-13 | procede | já decidido pelo dono em 16/09 ("o arnês serve o produto") | nada a fazer |
| REV-14 a REV-22 | não conferíveis no código | economia, preço, retenção, V2/V5, processo | registrados para os blocos e decisões donos |

**E um achado que não estava na lista, mas saiu da DEC-10:** o `hora-do-dia.mjs`
(1.34) lia o UTC cru. Para o dono, na Bahia, a cena ficava três horas adiantada.
Corrigido, e a decisão foi posta ao dono: **"Brasília para todos"**.

## O que eu adoto

- **as correções conferidas** acima, com a nota "CORRIGIDO em 25/09" no lugar do
  texto errado, e o errado riscado e não apagado;
- **a governança** (GOV-01 a 05): o ROADMAP é a fila única, o RETOMAR é o estado
  único; "implementado", "validado com jogadores" e "pronto para vender" são três
  estados diferentes; o histórico não se apaga;
- **o cartão 1.33 revisado**, conciliado com o código e com a DEC-10 resolvida;
- **a BASE-01**, na forma que eu consigo fazer porque tenho o código.

## O que eu NÃO adoto, e por quê

- **trocar os 27 documentos pelos reescritos** (`revisado/01_PLANO_MESTRE` etc.).
  O revisor marca que escreveu sem o código — "estados reportados, não
  confirmados". Trocar a fonte de verdade é caro de desfazer, e a Spec é a Spec:
  o que estiver errado nela se corrige nela, ponto a ponto, como foi feito aqui;
- **renumerar a fila inteira pela dele.** A ordem dele entra onde concorda com o
  código: o 1.33 é o próximo, e depois as integrações (INT-01/02) e as correções
  de fluxo (UX-01).

## As decisões que ficam com o dono

DEC-01 (tema e direitos) · DEC-02 (RMT) · DEC-03 (pagamento e poder) · DEC-04
(curva do laboratório) · DEC-05 (Vulcão) · DEC-06 (outfits) · DEC-07 (o que o OFF
encerra) · DEC-08 (captura: espécie mostrada ou base) · DEC-09 (stamina por
tentativa) — e uma nova, saída do REV-03:

**DEC-11 — manter os 154.000 sims?** O argumento que os justificava (viés de 19%)
caiu. O que resta é reduzir o RUÍDO contra quem calcula o `p` verdadeiro fora do
jogo. Reduzir barateia o servidor e os testes; é decisão econômica, e não mexo sem
veredito.

**DEC-10 — RESOLVIDA em 25/09/2026:** "Brasília para todos". `FUSO_DO_MUNDO =
'America/Sao_Paulo'`, em `app/modules/hora-do-dia.mjs`.
