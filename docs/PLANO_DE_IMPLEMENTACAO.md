# PokéArena — plano de implementação por stories

**Versão 1 · 25/09/2026.** Substitui, como detalhamento de execução, as filas
espalhadas que o cruzamento de 25/09 achou (`CONTINUAR`, `ORDEM_APOS_O_AVANCO`,
`PAUTA`, as listas antigas do `RETOMAR`). **Não substitui a Spec** — a Spec diz o
QUÊ; isto diz COMO entregar, em pedaços que se fecham sozinhos.

> **Regra de convivência com a GOV-01.** A ORDEM mora só no `ROADMAP.md` (seção
> *O QUE FALTA*), o ESTADO só no `RETOMAR.md`. Este arquivo guarda as **fichas**:
> o que cada story entrega, como se prova, e do que depende. Uma story só começa
> quando o ROADMAP a põe na frente; ao fechar, marca-se aqui `✅ fechada em
> DD/MM, commit X` e o resto do registro vai para o RETOMAR.
>
> A evidência de cada "o código hoje faz" está em
> `CRUZAMENTO_DOCS_CODIGO_2026-09-25.md`, com arquivo e linha.

---

## 0. Como ler uma story

Toda story tem os mesmos campos, e nenhum é opcional:

```text
ID · título                 ST-<épico>.<n>
Porte                       P ≤ 1,5 dia · M 2–4 dias · G 5–10 dias (estimativa, não promessa)
Bloco dono                  o id que DEFEITOS/LACUNAS já usam, para não haver dois nomes
Depende de                  stories e DECs; "nada" é resposta válida
Por que agora               a evidência, em uma ou duas linhas
Escopo                      o que entra
Fora                        o que NÃO entra, mesmo que pareça "rapidinho" (regra central)
Aceite                      critérios verificáveis — cada um vira teste ou captura
Sabotagem                   os defeitos que o bloco planta (Q2); ≥ 1 por critério
Portões                     Q1 e Q2 sempre; os outros conforme a story
Evidência de fecho          o que o relatório do bloco anexa
```

**Definição de pronto, igual para todas** (é o ciclo do `CLAUDE.md`, sem
atalho):

1. testes escritos antes do código, e sabotados à mão (vermelho quando quebra);
2. `npm test` verde **duas vezes** (`npm run repetir`) — hoje ~2 × 1 min 45 s;
3. `npm run sabotagem:bloco` verde (Q2 do bloco — ver E0);
4. se mexeu em tela: capturas em 1920, 1440, 1100 e 420, **lidas**; decisão fora
   do DOM (camada 0) e o relatório diz quantos mutantes ficaram de navegador;
5. um commit, com o que mudou, o que foi medido e o que foi para
   DEFEITOS/LACUNAS; RETOMAR atualizado; link local no ar;
6. três estados distintos (GOV-04): **implementado** (isto), **validado com
   jogadores** (E7) e **pronto para vender** (DEC-01..03). Nenhuma story daqui
   declara os dois últimos.

---

## Mapa dos épicos

| épico | o que resolve | stories | estado |
|---|---|---|---|
| **E0** · testes em minutos | o portão custava horas por bloco | ST-0.1 a ST-0.8 | 0.1–0.5 ✅ neste commit; 0.6–0.8 abertas |
| **E1** · integridade urgente | 3 defeitos novos: teto furado, cosmético grátis, Sair que não sai | ST-1.1 a ST-1.3 | **primeiro da fila** |
| **E2** · climas à vista (1.32b / PROD-134) | L-177, L-183 | ST-2.1 a ST-2.4 | depois do E1 |
| **E3** · economia que não duplica (INT-01) | L-159, colheita idempotente, mapa de emissão, DEC-08/09 | ST-3.1 a ST-3.5 | |
| **E4** · posse confiável (INT-02) | cosmético e traje com autoridade no servidor, 1.26 | ST-4.1 a ST-4.5 | |
| **E5** · ler a luta (1.27g / UX-01) | 404s, banner, `est:` cru, dano, cast/proj, zoom, base visual | ST-5.1 a ST-5.7 | |
| **E6** · higiene documental | GOV-01 valer em todos os arquivos | ST-6.1 a ST-6.4 | pode correr em paralelo (não é código) |
| **E7** · validar com gente | telemetria mínima, piloto sem dinheiro | ST-7.1, ST-7.2 | condicionado a E1–E5 |
| **E8** · condicionados | laboratório, expansão, comercial, idle no servidor | fichas curtas | cada um com gatilho |
| **E9–E13** · o resto da Spec | V2 mútua, V3, V4, idle no servidor, V5 | ver **PARTE 2** no fim deste arquivo | ordem E12 → E9 → E10 → E13 → E11 |

Ordem proposta (a oficial é a do ROADMAP): **E1 → E2 → E3 → E4 → E5**, com E6 em
paralelo e E0.6–0.8 só quando impedirem alguma coisa ou o dono decidir.

**Por que E1 antes do 1.32b, que era o próximo.** A revisão deixou a regra
escrita: *"se a BASE reproduzir perda/duplicação de saldo, quebra de posse ou
impossibilidade de completar a jornada, antecipar a correção antes de
PROD-133"*. O cruzamento reproduziu as três coisas. Os três consertos são P.

---

## E0 · Testes em minutos (bloco T14)

**Pedido do dono, 25/09/2026:** *"os testes do código estão levando horas, isso
precisa resolver e reduzir para minutos"*. Pela regra do `CLAUDE.md` ("o arnês
serve o produto"), isto **impede** trabalho de produto: um bloco de produto
fechava em 2–7 h de portão, e a sessão caía antes (o 1.33 deixou o Q2 em
300/1032, em três commits de cache parcial).

**Orçamento nomeado antes:** um dia, só `test/` e `package.json`, nenhuma
mudança de produto. Achado de arnês que não couber vai para DEFEITOS/LACUNAS.

### ST-0.1 · a suíte `servidor` para de precificar 154 k por teste ✅

- **Causa medida:** 14 servidores × ~5,2 s em `ouvir()` = 92,5 s de 190 s.
- **Feito:** `comServidor` passa `sims: 2000`. O laço continua ligado; só o
  lote da primeira rodada muda. Nenhum teste dela lê aquela rodada.
- **Aceite:** `servidor` ≤ 3 s; os 17 testes seguem verdes. **Medido: ~2 s.**

### ST-0.2 · as suítes de CPU rodam em paralelo ✅

- **Feito:** `test/run.mjs` sobe `núcleos − 1` trabalhadores (teto 4) que puxam
  suítes de uma fila dinâmica, as caras primeiro; o principal dirige o Chromium.
  A decisão mora em `bandeiras.mjs` (`trabalhadoresDaSuite`, `ordemDeEntrega`,
  `agregacaoIncompleta`), com teste e 6 defeitos plantados (S1038–S1043).
- **Nunca em paralelo:** `PARAR_CEDO` (sabotagem), `EM_SANDBOX` (caixa do Q2 —
  o D-100), `--so` (recorte), `TESTE_SERIAL=1` (recusa explícita).
- **Anti-S109:** a agregação confere o que voltou contra o que o principal
  montou, nos dois sentidos, e **aborta** com suíte faltando, repetida, a mais,
  trabalhador morto ou catálogo divergente.

### ST-0.3 · as sondas do Chromium em duas filas ✅

- **Feito:** fora da caixa do Q2, as 8 sondas rodam em 2 filas, a mais cara
  primeiro (base 62 s · semBackend 31 · rodar 29 · luta 25 · …). Pico de 2
  navegadores em vez de 7 — o meio-termo entre o D-023 e o relógio.
- **Aceite do E0.1–0.3 juntos:** `npm test` de 6 min 10 s para **1 min 45 s**;
  `npm run rapido` de 3 min 10 s para **38,6 s**; `npm run repetir` estável
  (2/2, 3 min 27 s as duas). Medido em 25/09.

### ST-0.4 · o Q2 do bloco: `npm run sabotagem:bloco` ✅

- **Feito:** `--bloco` avalia (a) defeitos ancorados em arquivo tocado pelo
  bloco (`git status`, e `--desde=<ref>` depois de commitar) e (b) defeitos sem
  veredito guardado; **reaproveita** os de chave intacta; **adia, contando**, os
  que só mudaram de fecho. Regra em `ancoras.mjs` (`escopoDoBloco`), com teste.
- **Medido:** o 1.33 teria sido 147 mutantes (19 de navegador) em vez de 589.
  O Q2 que fechou o próprio T14: **39 avaliados, 39/39 PEGOU, 13 min 17 s**,
  351 reaproveitados, 648 adiados — quase todos a dívida do Q2 do 1.33, que
  parou em 300/1032. Quitá-la é rodar o Q2 completo uma vez, em fatias (ST-0.5).
- **O que se perde, com todas as letras:** o caso S15 — um bloco que torna
  decorativo um teste **distante** — deixa de aparecer no fecho do bloco e
  aparece no Q2 completo. O `CLAUDE.md` já aceitava esse preço para o cache frio
  ("pode-se ficar alguns blocos sem saber"); ele passa a valer também para o
  fecho de fecho mudado. O relatório do bloco imprime o número de adiados, e
  adiado **nunca** conta como pego.

### ST-0.5 · o Q2 completo em fatias: `--fatia=k/N` ✅

- **Feito:** partição disjunta e estável pelo índice; o cache mescla por id, e
  o índice de captura passa a mesclar em execução parcial (não apaga os outros).
- **Uso:** N sessões/máquinas, cada uma com `node test/sabotagem.mjs
  --fatia=k/N`, e um commit do `q2-veredito.json` de cada. 453 min frios / 4
  máquinas ≈ 2 h; com cache quente, minutos.

### ST-0.6 · CI no GitHub: `npm test` a cada push — ✅ **25/09** (DEC-13: o Q2 noturno NÃO; `.github/workflows/testes.yml` + `test/ci.mjs`)

- **Porte** M · **Depende de** DEC-13 (custo de minutos de Actions num repo
  privado).
- **Escopo:** `.github/workflows/testes.yml` (push/PR: `npm test` com
  playwright-core instalado FORA do projeto, como o `tools/README.md` manda);
  `q2-noturno.yml` com `matrix: fatia [1..8]` e um job final que mescla os
  `q2-veredito.json` e abre PR com o cache.
- **Fora:** mudar o que qualquer teste afirma; dependência no `package.json`.
- **Aceite:** um push com teste quebrado fica vermelho no GitHub em < 5 min; o
  noturno termina em < 1 h com as 8 fatias e publica o número de adiados
  resolvidos.
- **Sabotagem:** um workflow que chama `--so` (recorte) tem de ser recusado —
  mesma regra do `portoes`.

### ST-0.9 · o ensaio do piloto a cada push ✅ 26/09

A suíte inteira estava verde e nenhuma aposta do servidor era paga (D-112).
Quem achou foi o ensaio no navegador. O job `ensaio` da CI sobe o servidor
com banco próprio, espera o `/saude` e roda `tools/ensaio-piloto.mjs`: cria
conta, aposta, espera a LIQUIDAÇÃO (o XP sobe), sai e entra. Reprova a CI.
Rodado localmente com os mesmos comandos: PRONTO PARA CONVIDAR. `test/ci.mjs`
trava o job; S1216.

### ST-0.7 · a sonda `base` em uma passada por largura — **aberta, congelada**

- É o T11 (um navegador vivo reaproveitado). Só entra se a sonda `base` (62 s)
  virar impedimento. Registrado para não ser redescoberto.

### ST-0.8 · o que a DEC-11 compraria na suíte — ✅ **fechada em 25/09 sem mudança: a DEC-11 manteve os 154 k** (a medição abaixo fica como o preço conhecido)

- ~~Cada página precifica 154 k (~5 s por carga), e é o maior custo restante
  das sondas.~~ **Errado — corrigido no mesmo dia, medindo:**

  **MEDIDO em 25/09, numa cópia descartável com `SIMS: 2000`** — as 8 sondas,
  uma fila:

  ```text
  sonda            154 k     2 k      diferença
  base             62,1      37,7     24,4
  rodar            29,3      20,6      8,7
  luta             25,1      15,7      9,4
  semRede          10,2       1,5      8,7
  semBackend       31,3      31,1      0,2
  rodadaCompleta   16,4      15,3      1,1
  as outras duas    1,1       1,0      0,1
  total           175,5     122,9     52,6 s  (30%)
  ```

  Em `npm test`, com as duas filas, isso vale ~20–25 s dos 1 min 45 s. **Os
  outros 70% são carregar a página, avançar quadros e as quatro larguras** —
  não Monte Carlo. Na caixa do Q2, um mutante de navegador pouparia ~50 s de
  ~3 min.

- **Recomendação: desacoplar.** A DEC-11 se decide pela economia (ruído da odd
  contra a margem de 8%), nunca pelo relógio do teste — o teste mede o que o
  jogador recebe. E não vale criar um modo de teste com sims baixo: ele muda o
  que as sondas veem (odds e a marca "154.000" na tela), obriga regravar a base
  visual, e compraria 30% de uma suíte que já não impede nada.

---

## E1 · Integridade urgente

### ST-1.1 · o teto de encontros sente a run colhida (D-107) — ✅ fechada em 25/09

- **Porte** P · **Bloco dono** INT-01 (antecipado) · **Depende de** nada
- **Por que agora:** reproduzido — `30 → 24 → 30` depois de colher 4
  encontros. Avanço atrás de Avanço = captura sem teto (§P5), inclusive de
  chefe evoluído (DEC-08).
- **Escopo:** `encontrosHoje` soma as runs colhidas na janela móvel de 24 h
  (`e.avancos`, pelo `colhidaEm` e pelos encontros que ela de fato rendeu);
  `carregar` preserva `e.avancos`; o histórico é podado fora da janela para não
  crescer para sempre.
- **Fora:** mudar o tamanho do teto, a reserva de 6, ou mover o idle para o
  servidor (E8).
- **Aceite:**
  1. depois de colher uma run com N encontros, `restamEncontros` cai N — e
     **continua** caído depois de `salvar` + `carregar`;
  2. uma run que caiu/recuou lança só os encontros realmente vistos; com o teto
     esgotado, lança 0 e não fica negativo;
  3. 24 h + 1 ms depois, os encontros daquela run voltam (janela móvel);
  4. o teste `D-107 (afirma o defeito)` em `test/avanco-estado.mjs` fica
     vermelho e é **invertido** para o comportamento certo; a ficha em
     `DEFEITOS.md` ganha ✅.
- **Sabotagem:** somar só `expedicoes` de novo; esquecer `avancos` no
  `carregar`; usar `iniciadaEm` em vez de `colhidaEm`; contar a reserva E o
  colhido (dupla contagem).
- **Portões:** Q1 Q2 Q3 (invariante do §P5) · Q6: sem superfície nova.

### ST-1.2 · o botão ⏻ desloga a conta real (D-109) — ✅ fechada em 25/09

- **Porte** P · **Bloco dono** F1.3 (sessão) · **Depende de** DEC-07 só para o
  que o OFF encerra — o Sair não depende de decisão.
- **Escopo:** o Sair chama `api.esquecerSessao()` além de limpar `ar_session`;
  a tela volta ao estado deslogado; **decisão pura** extraída para camada 0 (o
  que limpar, dado o modo), testável em Node.
- **Fora:** revogação de token no servidor (é a ST-1.2b, abaixo, se o dono
  quiser); mudar a duração do token.
- **Aceite:**
  1. com sessão real, depois do Sair, `sessaoAtiva()` é falso e nenhuma
     chamada autenticada sai com o token antigo;
  2. sem sessão real (PIN local), o comportamento é o de hoje;
  3. o teste `D-109 (afirma o defeito)` em `test/modo-servidor.mjs` fica
     vermelho e vira teste de comportamento.
- ~~**ST-1.2b (opcional, M):**~~ ✅ **25/09** · rota `POST /api/sair` que invalida o token no
  servidor (lista de revogados com expiração, migração aditiva `sessao-revogada-st1.2b`). DEC-07 decidida: só o token do Sair; o outro aparelho segue.
- **Sabotagem:** esquecer só o PIN; esquecer só o token; limpar o token e
  manter `S.profile` com os dados da conta.
- **Portões:** Q1 Q2 Q5 (captura do cabeçalho deslogado) Q6 (sessão).

### ST-1.3 · com conta real, a boutique não entrega peça sem cobrar (D-108) — ✅ fechada em 25/09 (mitigação; o conserto é o E4)

- **Porte** P · **Bloco dono** INT-02 (mitigação antecipada)
- **Por que P e não o conserto inteiro:** o conserto é o E4 (posse no
  servidor, M–G). Até lá, o certo é **não vender o que não se consegue cobrar**.
- **Escopo:** em modo servidor, `comprarPeca` recusa com motivo legível
  ("a boutique abre para contas online em breve") e a vitrine mostra o preço sem
  o botão de compra. Modo local: igual a hoje.
- **Fora:** a rota de compra (ST-4.2); devolver peças já "compradas" de graça
  (não há como saber quem — registrar em LACUNAS como dívida do E4).
- **Aceite:** com sessão, clicar em comprar não muda saldo nem posse, e mostra o
  motivo; sem sessão, a compra segue como hoje; o teste `D-108 (afirma o
  defeito)` fica vermelho e é trocado.
- **Sabotagem:** a guarda olhar o PIN em vez do token; a guarda ficar só na tela
  (o botão some, `comprarPeca` ainda compra).
- **Portões:** Q1 Q2 Q5.

---

## E2 · Climas à vista (1.32b / PROD-134)

**Resultado para o jogador:** antes de montar a equipe, ele sabe **que climas
existem** e o que cada um favorece; ao começar a run, sabe **qual caiu** e quem
isso trouxe. O sigilo do clima sorteado (L-177) não se quebra.

### ST-2.1 · a legenda dos climas na escolha — ✅ fechada em 25/09

- **Porte** M · **Depende de** E1 · **Fecha** L-177
- **Escopo:** a legenda sai de `pack.climaIdle` (nome, emoji, tipos
  favorecidos, canal de bônus, e raridade relativa — a Nevasca é rara); a
  decisão (o que mostrar) em módulo de camada 0; a tela só pinta.
- **Fora:** revelar qual clima vai cair; porcentagens exatas no primeiro corte.
- **Aceite:**
  1. a legenda tem **todos** os climas do pack — o teste compara com
     `climaIdle.length`, e clima novo no pack aparece sem tocar na tela;
  2. **sigilo:** o HTML e o estado da sala antes do início são **idênticos**
     para qualquer clima sorteado (o teste semeia três runs com climas
     diferentes e compara);
  3. a legenda **não promete mudar o elenco** para clima que não muda (o Sol:
     0 de 44 estágios) — ou o conteúdo passa a dar a ele ≥ 1 troca (ST-2.3);
  4. Q5: capturas nas 4 larguras, lidas; o texto cabe em 420 px.
- **Sabotagem:** legenda com lista fixa em vez do pack; a sala receber o clima
  da run; o Sol ganhar a frase de "traz novos rostos".

### ST-2.2 · o clima revelado no início, com o elenco efetivo — ✅ fechada em 25/09

- **Porte** P · **Depende de** ST-2.1
- **Aceite:** depois do início, a tela mostra o clima que caiu e o elenco
  efetivo, e ele é **igual** ao de `preferenciasDaRun`; a run que já estava em
  curso não muda (regra do 1.33).

### ST-2.3 · o veterano vê a noite (L-183) e o Sol ganha sentido — ✅ fechada em 25/09 (noite 7·8·3·3; o Sol segue sem troca, e a legenda diz isso)

- **Porte** P–M (conteúdo) · **Depende de** decisão de conteúdo (a tabela de
  preferências é dado do pack)
- **Escopo:** ajustar `preferenciasDaNoite`/`climaIdle[].tipos` no pack até o
  estágio 4 ter ≥ N/11 rotas mudando de noite, com N fixado pelo número medido
  e escrito no teste; decidir se o Sol muda elenco.
- **Aceite:** teste de conteúdo cobra ≥ N/11 no estágio 4; sem condição, os 44
  estágios seguem **idênticos** a `test/fixtures/elenco-base.json`.
- **Fora:** mexer no motor do 1.33 (`REGRA_DO_ELENCO` continua 1).

### ST-2.4 · a fauna de enfeite sabe que é noite (L-184) — ✅ **fechada em 25/09** (o bloco do cenário abriu com a DEC-15): quem a noite desfavorece dorme, com "Zz" por cima do escuro; medido pela esteira (`olhar-hora`: à 01h, 2 de 5 moradores da floresta dormem — Pidgey e Meowth)

- **Porte** P · regra permanente do `CLAUDE.md` ("o cenário do idle nunca está
  pronto"): entra quando um bloco passar pelo cenário, e não antes.

---

## E3 · Economia que não duplica (INT-01)

### ST-3.1 · o baú dá Estilhaço nos estágios iniciais (L-159) — ✅ fechada em 25/09, junto com a L-160 (ST-5.3)

- **Porte** P–M · **Depende de** decisão de produto sobre a curva (a
  recomendação está na L-159)
- **Aceite:** nos estágios 1–3 o baú pode entregar `est:<id>`; o item inteiro
  só a partir do estágio definido; o teste afirma a **distribuição** em 10.000
  sorteios semeados, e ela é reprodutível.

### ST-3.2 · colher duas vezes não credita duas vezes — ✅ fechada em 25/09 (gravação otimista + evento `storage`)

- **Porte** M · **Depende de** ST-1.1
- **Escopo:** a colheita (expedição e run) grava uma **marca de versão** no save
  e recusa colher o que outra aba já colheu (evento `storage` + releitura antes
  de gravar). Enquanto o idle for do navegador, isto é o máximo honesto; a
  garantia de verdade é o E8 (idle no servidor).
- **Aceite:** duas abas simuladas (dois depósitos sobre o mesmo armazém) colhem
  a mesma expedição: **um** crédito; o retry depois de gravar devolve o
  **mesmo** resultado (mesma semente) sem creditar de novo.

### ST-3.3 · o mapa de emissão por recurso — ✅ fechada em 25/09 (`test/emissao-idle.mjs` + fixture; achou a L-185)

- **Porte** M · **Método** INV
- **Escopo:** um gerador (`tools/` ou fixture de medição, como a `margem.json`)
  que produz, por perfil de jogador (casual, diário, maratona), XP, moeda,
  essência e itens **por hora e por conta**, com o teto livre e esgotado.
- **Aceite:** a tabela existe, é regravada só de propósito (regra das fixtures
  de medição), e cada recurso sem teto tem **ou** um limite **ou** uma
  justificativa escrita. É a evidência que o REV-14 pedia.

### ST-3.4 · DEC-08 registrada e travada por teste — ✅ fechada em 25/09 (a espécie mostrada, com teste e S1079)

- **Porte** P · **Depende de** DEC-08
- **Aceite:** se a decisão for "a espécie mostrada" (o que o código já faz), um
  teste afirma isso, incluindo o chefe evoluído; se for "a base", `baseDe` na
  captura, **sem** mexer em posse já capturada.

### ST-3.5 · DEC-09: o custo da nova tentativa aparece antes — ✅ fechada em 25/09 (`falaDoCusto` sob o botão Avançar; o código fica como está)

- **Porte** P · **Depende de** DEC-09
- **Fato do código:** cobra por **wave alcançada**, no fim (2/wave, 5 no chefe,
  23 no total); queda encerra a run; a próxima é run nova.
- **Aceite:** a tela antes de iniciar mostra custo-base e custo de nova
  tentativa; um teste afirma que a cobrança bate com a regra decidida; o texto
  da Spec e da revisão passa a descrever o código (ou o código muda, se o dono
  decidir "por tentativa").


### ST-3.6 · DEC-14: o rendimento do Avanço decresce com as runs do dia — ✅ fechada em 25/09 (fecha a L-185)

- **Feito:** `fatorDoRendimento` no motor — 6 runs cheias por dia, depois ×0,75
  por run, piso de 5%; moeda e Essência (o XP não); arredondamento semeado que
  guarda a média; o dia é o de CALENDÁRIO no relógio do mundo (Brasília,
  DEC-10) — a janela móvel de 24 h foi medida e punia quem joga todo dia no
  mesmo horário. A frase aparece sob o botão Avançar a partir da 7ª run.
- **Medido:** Essência/dia casual 16,29 → 16,29 · diário 40,0 → 37,1 ·
  maratona 199,6 → 57,4 (8,7× → 2,5× os 23 calibrados).
---

## E4 · Posse confiável (INT-02)

**Resultado:** o que o jogador compra é dele em qualquer aparelho, e ninguém
leva de graça. Hoje a posse vive só no navegador (`pa.cosmeticos.v1`,
`pa.outfit.v1`, `ar_profile`), e o servidor não tem tabela nem rota.

> **Parar e perguntar** (regra do `CLAUDE.md`): este épico cria **formato de
> dado com acervo** (tabela nova) e mexe em **valor econômico** (PokéCash). O
> desenho abaixo é a recomendação; a migração só roda com veredito.

### ST-4.1 · a tabela e a leitura — ✅ 25/09 (servidor)

- **Porte** M · **Aceite:** `cosmetic_ownership(user_id, familia, item_id,
  origem, adquirido_em)` com chave primária nas três primeiras; `GET
  /api/cosmeticos` devolve posse e equipados; depois de `localStorage.clear()`,
  com sessão, a posse volta igual.

### ST-4.2 · a compra atômica e idempotente — ✅ 25/09 (servidor e cliente)

- **Porte** M · **Depende de** ST-4.1, ST-4.5
- **Aceite:** `POST /api/cosmeticos/comprar {familia, id, chaveIdem}` numa
  transação só (lançamento no ledger + posse); falha forçada no INSERT deixa
  saldo e ledger intactos; mesma chave ou peça já possuída = mesma resposta, 1
  lançamento; 2 pedidos simultâneos = 1 débito (Q8); preço **do catálogo do
  servidor** — `preco: 1` no corpo é ignorado; peça `padrao`/`npc` recusada.

### ST-4.3 · equipar exige posse, conferida no servidor — ✅ 25/09 (o servidor confere; a tela também, e mostra o trancado com cadeado; `MODO_VITRINE` não vale com conta)

- **Porte** P · **Aceite:** equipar o que não se tem = 4xx com `codigo`, perfil
  intacto; `MODO_VITRINE` deixa de valer em modo servidor.

### ST-4.4 · uma lista de posse só (L-157) — ✅ 25/09 com conta real (sem conta o traje segue no acervo local — L-157 parcial)

- **Porte** P · **Aceite:** a família `outfit` passa pela mesma tabela; um traje
  marcado `loja` no teste, comprado, aparece em `vestiveis()` com
  `MODO_VITRINE=false`. Os 9 trajes seguem `padrao` (DEC-06 fora do escopo).

### ST-4.5 · o balde `comprado` no servidor (fecha o 🟡 do 1.26) — ⏸️ **ADIADA em 25/09, por decisão minha (delegação do dono)**

> **Por quê:** no servidor NADA pode pôr dinheiro no `comprado` — não existe
> rota de compra de PokéCash, e ela é dinheiro real (DEC-02, do dono). Criar o
> balde agora exige reconstruir o `wallet_ledger` (tabela append-only com
> gatilhos) para mudar um CHECK, e o risco dessa migração não compra nada hoje.
> A regra de produto já está decidida (DEC-03: `comprado` herda linhagem e
> nunca paga `poder`) e o motor já a tem (`engine/carteira.mjs`). **Destrava:**
> o bloco que ligar a compra de PokéCash (COM-01).

- **Porte** M · **Depende de** DEC-03
- **Fato:** o motor tem o balde e o propósito `'poder'`; o servidor não
  (`server/banco.mjs:63`), e o lucro de aposta com saldo comprado vira livre.
- **Aceite:** o `CHECK` da tabela aceita `comprado`; um teste afirma que saldo
  comprado não paga nada de propósito `poder`; a linhagem do lucro segue a DEC-03.

---

## E5 · Ler a luta (1.27g / UX-01)

Ordem interna: primeiro o que impede **entender**, depois o que **enfeita**.
Todas mexem em tela: Q5 com as duas metades, decisão em camada 0.

| story | porte | aceite verificável |
|---|---|---|
| **ST-5.1** ⏸️ espera o dono · zero 404 na abertura (L-176) — os dois arquivos existem só no PC dele (`assets/npc/lojas.mp4`, `battle-theme.mp3`); commitá-los de lá é a correção, e a regra do resgate proíbe substituí-los | P | a abertura da run e da loja faz **0** pedidos 404, contados por nome na esteira. Saída: versionar `battle-theme.mp3` e `lojas.mp4` **da mesma fonte** (regra do resgate), ou tirar a referência — nunca trocar por outro arquivo |
| ~~**ST-5.2**~~ ✅ 25/09 · o banner não passa sob o mon (D-082) | P | com vitrine, o retângulo do texto do `.bnRodape` não cruza o do `.bnMon.vitrine` em 420, 768 e 1920, inclusive com "Nenhuma expedição em campo" |
| ~~**ST-5.3**~~ ✅ 25/09, dentro da ST-3.1 · `est:` nunca aparece cru (L-160) | P | toda chave `est:<id>` tem nome e ícone; o teste varre o que a mochila e a loja pintam |
| ~~**ST-5.4**~~ ✅ 25/09 · números de dano não se tocam (L-172) — **0 pares e 0 fora da janela em 3 execuções**; os "1 a 3 pares" eram quase todos a SONDA contando o mesmo número duas vezes (dt 0 ms, mesmo pixel); com ela corrigida, a conta antiga deixava 1 par real em 9 cenas, e a nova 0 em 9 | M | a sonda imprime os pares; meta **0** pares sobrepostos em 420 px em 3 execuções, 0 fora da janela |
| ~~**ST-5.5**~~ ✅ 25/09 · cast e projétil (L-171) — o motor publica os golpes `aCaminho` (900 ms), o projétil sai cedo e chega no instante do dano; 13 lançados numa wave com planta; o `beam` virou a **L-186** — ✅ fechada na **ST-5.5b** no mesmo dia (5–7 jatos por wave com Surf) | M | golpe com `cast`/`proj` no `MOVE_FX` produz folha no atacante e projétil do atacante ao alvo; a cena publica o par; o teste puro confere início e fim da trajetória |
| ~~**ST-5.6**~~ ✅ 25/09 (DEC-15) · a janela de 420 px cabe a luta (L-175) — zoom da run = `min(escolhido, largura ÷ 260)`: 130 → 260 px de mundo a 420, 0 estouros fora da tela; no largo nada muda; o piso (S616) vale por cima | M | em 420 px o bando, companheiro e treinador cabem |
| ~~**ST-5.7**~~ ✅ 25/09 · base visual ausente não conta como verde (D-093) | P | sem a base local, `visual-base` aparece como **NÃO EXECUTADA** no relatório (e o `portoes` reprova), nunca como verde; a base local ganha carimbo de data e commit |
| **ST-5.8** · `sala-cliente` estável (D-086) — **não reproduzido** em 20 execuções sob carga (25/09); fica aberto esperando uma falha lida | P | reproduzir com carga; se for o teto de 3 s, a espera passa a ser por evento com prazo nomeado; `npm run repetir` 5/5 |

**Evidência de fecho do E5:** uma run real jogada de ponta a ponta (entrar,
lutar a wave, chegar ao fim), capturada — não componente isolado.

---

## E6 · Higiene documental

Não é código, não passa pelo portão, e pode correr em paralelo. Cada uma é um
commit de documentação.

| story | aceite |
|---|---|
| ~~**ST-6.1**~~ ✅ 25/09 · arquivar as filas mortas | `CONTINUAR`, `ORDEM_APOS_O_AVANCO`, `PAUTA_2026-09-08`, `LEIA-ME-DO-PACOTE`, `PASSAGEM`, `PORTE_v1.0`, `P1.1_ESCOPO`, `CHECKUP` vão para `docs/historico/` com nota de topo; `COMO_RODAR`, `README` e `COMECE_AQUI` apontam RETOMAR/ROADMAP e perdem contagens velhas. **Antes de mover:** `grep` nos testes (alguns leem `docs/`) |
| ~~**ST-6.2**~~ ✅ 25/09 · um id, um significado | resolver T8 (fichas ✅ × arnês congelado) e T4 (✅ × congelado); linhas 1.28/1.29/1.31 duplicadas no ROADMAP |
| ~~**ST-6.3**~~ ✅ 25/09 · estado padronizado nas fichas — DEFEITOS: 15 abertos; LACUNAS: as 85 fichas sem linha ganharam Estado conferido contra o código (L-029, L-060, L-064, L-065, L-069, L-102… estavam feitas e diziam aberta), L-098 e L-119 deixaram de ser ids duplicados; 185 fichas = 64 fechadas · 16 parciais · 105 abertas, refeito por `node test/fichas.mjs` | toda ficha de DEFEITOS e LACUNAS com a linha `**Estado:** aberto / fechado em DD/MM (bloco)`; L-119 duplicada desfeita; L-138 e L-168 marcadas; a contagem do ROADMAP passa a ser um número verificável |
| ~~**ST-6.4**~~ ✅ 25/09 (seção v1.6 no topo do índice v1.5) · o índice v1.6 | `DOCUMENT_INDEX` v1.6 com RETOMAR, ROADMAP, este plano, o cruzamento e a revisão; o `CLAUDE.md` aponta para ele |

---

## E7 · Validar com gente (condicionado)

| story | gatilho | aceite |
|---|---|---|
| ~~**ST-7.1**~~ ✅ 25/09 · telemetria mínima e restauração (OBS-01) — **a ✅ 25/09**: eventos com chave (índice único por usuário+evento+chave), `bet_placed` e `cosmetic_purchased` anotados pelo servidor, `POST /api/telemetria` com lista fechada (`session_started`, `run_harvested`, `expedition_harvested`), o cliente relata o ESTADO do dia (`telemetria-servidor.mjs`, camada 0), `retencao` D1/D7 no painel de política · S1151–S1163. **b ✅ 25/09**: `server/copia.mjs` (`VACUUM INTO` com o servidor ligado; conferência = integridade + versão + ledger × saldo de toda conta; restauração confere antes, monta ao lado, migra e troca por `rename`) e `tools/banco-copia.mjs`; o teste roda o ciclo inteiro · S1164–S1168 | E1–E5 fechados (o gatilho foi antecipado por delegação: medir o piloto exige a telemetria ANTES dele) | eventos deduplicados de run, colheita, compra, aposta; painel com coorte D1/D7; restauração do banco demonstrada |
| ~~**ST-7.2a**~~ ✅ 25/09 · um endereço: o servidor serve o jogo e a API | DEC-01 (fase privada) decidida pelo dono | `server/estatico.mjs`: por LISTA do que o cliente importa (medido com `grep`), `dados/`/`.git`/`server/`/`test/`/`docs/` nunca saem, `..` cru e codificado barrados, NUL barrado, Range para áudio, CSP própria da página (a do JSON a quebraria), `SERVIR_JOGO=0` desliga · aberto no Chromium pelo backend: 0 `pageerror`, 0 bloqueio de CSP (os dois 404 são a L-176) · S1172–S1178 |
| ~~**ST-7.2b**~~ ✅ 25/09 · conta real na tela (L-189) — `conta-real.mjs` (camada 0), o modal pergunta ao `/saude` ao ABRIR (zero pedido no boot), o perfil devolve o nome · S1179–S1186 | ST-7.2a | com o servidor no ar, o modal cria conta e entra por `/api/auth` (e-mail, senha, nascimento — a barreira de idade é do servidor); sem servidor, a fachada local continua como está; a decisão (qual modo, validação do formulário) em módulo de camada 0; ao entrar, a página recomeça hidratada (carteira, perfil, posse) |
| ~~**ST-7.2c**~~ ✅ 25/09 · o relatório e o roteiro do piloto — `server/piloto.mjs` + `tools/relatorio-piloto.mjs` (cada jogador-dia ao lado do perfil da ST-3.3 em escala log; o dia do fato é o da colheita, nunca no futuro do relato); o cliente passou a relatar moedas, XP e o instante de cada run; `docs/PILOTO.md` · S1187–S1193 | ST-7.2b | `tools/relatorio-piloto.mjs` lê o banco: contas, retenção D1/D7, ativos por dia, runs, expedições, apostas, compras, saldos por balde (mediana, p90, máximo); `docs/PILOTO.md`: como hospedar, convidar, copiar o banco todo dia, ler o relatório, e a regra de triagem por evidência |
| **ST-7.2** · piloto sem dinheiro real (PILOTO-01) | ST-7.1 + ST-7.2a–c + gate de IP compatível com teste privado (DEC-01 ✅ fase privada, 25/09) | 5–10 amigos, 14 dias; problemas priorizados por evidência; saldos e emissão medidos contra a ST-3.3 |

## E8 · Condicionados — cada um com o gatilho que o destrava

| tema | gatilho |
|---|---|
| ~~**Idle no servidor**~~ → virou o épico **E13** (Parte 2, 26/09) | pré-condição dura do E11 |
| Laboratório B1 (LAB-01) | piloto + DEC-03/04 |
| Uma expansão: Torre, Liga, coleção ou mercado (EXP-01) | piloto aponta a necessidade |
| Comercial / RMT (COM-01) | DEC-01/02/03 e operação completa |
| Vulcão sem raro (L-143) | DEC-05 |
| T11 · T8 · T4 · T7 · T12 (arnês) | impedir uma story acima, com orçamento |

---

## Decisões — tomadas por delegação do dono em 25/09

> **A tabela viva é a do `ROADMAP.md`**, com o porquê de cada uma. Esta fica
> como o registro do que cada DEC pedia quando o plano foi escrito. Em 25/09 o
> dono delegou as de produto; com ele ficam só DEC-01, DEC-02 e a L-176.


As DEC-01..10 são da Revisão 2.0 (`docs/revisao-2026-09-24/`). As três últimas
nasceram deste cruzamento.

| DEC | pergunta | o que o código já faz | recomendação | bloqueia |
|---|---|---|---|---|
| DEC-07 | o que o OFF encerra | OFF é local; o Sair está quebrado (D-109, defeito, não decisão) | OFF encerra presença; Sair esquece o token neste aparelho; revogar todos só por pedido explícito | ST-1.2b |
| DEC-08 | captura: mostrada ou base | entrega a mostrada, com chefe evoluído | **aplicada como padrão em 25/09** (recomendação = código): teste trava; mudar vira decisão explícita | ✅ ST-3.4 |
| DEC-09 | stamina por tentativa ou vitória | por wave alcançada, no fim | **aplicada como padrão em 25/09**: código mantido, a Spec já o descreve, e a tela diz o custo da nova tentativa | ✅ ST-3.5 |
| DEC-11 | manter 154.000 sims | ~5 s de CPU por página e por servidor | medir o ruído contra quem calcula `p` fora do jogo antes de mudar; é a ST-0.8 | ST-0.8 |
| **DEC-15** | a câmera da run se afasta sozinha em tela estreita (L-175)? | zoom fixo do jogador; 130 px de mundo em 420 px | **sim, só na RUN e só abaixo do mínimo que a luta pede** (260 px de mundo); no largo e fora da run, nada muda | ST-5.6 |
| **DEC-14** | a emissão de Essência e moeda do Avanço (L-185: o maratona tira 8,7× a Essência calibrada) | sem teto além da stamina | **(b) rendimento decrescente por run no mesmo dia** — o casual fica como está, a maratona morde | ST-3.6 (nova) |
| **DEC-12** | o Q2 do bloco adia o que só mudou de fecho | — | **adotada** pelo pedido do dono de 25/09 ("minutos"); o preço (S15 aparece só no Q2 completo) está escrito na ST-0.4 | — |
| **DEC-13** | CI no GitHub Actions | não há `.github/` | `npm test` por push (barato); Q2 fatiado à noite **só** se couber no plano de minutos do repositório | ST-0.6 |
| DEC-01..06 | tema e direitos · RMT · pagamento e poder · curva do laboratório · Vulcão · outfits à venda | — | como na Revisão 2.0 | E4 (DEC-03), E7, E8 |
# PARTE 2 — o resto da Spec em stories (26/09/2026)

> **Pedido do dono, 26/09:** *"Eu quero finalizar o jogo"* · *"Então, transformar
> isso em storys e vamos seguir"* · *"não to me importando com consulta
> regulatoria agora, isso sera feito quando finalizar o jogo, pode botar o v2
> tbm nos storys"*.
>
> Três consequências, escritas antes de construir (regra "recomendação minha é o
> padrão"):
>
> ```text
> E12 (V2)   entra como trabalho de verdade. A consulta do §0.5.1 continua
>            obrigatória ANTES DE PUBLICAR, e não antes de CONSTRUIR — como a
>            arte (DEC-01). O dinheiro continua simulado; nada aqui toca DEC-02
> GATES      §6.15, §7.21 e §8.16 passam a ser MEDIDOS e registrados, e não
>            trancam a fila: com 5–10 amigos nenhum fecha estatisticamente, e
>            o relatório diz "amostra insuficiente" em vez de fingir que passou
> ORDEM      E12 → E9 → E10 → E13 → E11 (a fila oficial é a do ROADMAP)
> ```
>
> As fichas do E9 ao E11 nasceram de um levantamento conferido no código
> (26/09); os achados dele estão no fim desta parte.

## Mapa dos épicos novos

| épico | o que resolve | stories | depende de |
|---|---|---|---|
| **E12** · V2: mercados mútuos (F2.1–F2.4, F2.8) | o teto de habilidade: hoje EV = 1 − margem em toda aposta (§6.2); no bolo mútuo, ler melhor que os outros paga | ST-12.1 a 12.10 | nada — a Liga de Previsão (F2.5–F2.7) já existe |
| **E9** · V3: fechar a coleção (F3.6–F3.13) | dossiê, escada de informação, doce, moveset e comparador, pesquisa, medalhas e missões, Minha Coleção, laço de retorno | ST-9.1 a 9.18 | E12 na fila (não no código) |
| **E10** · V4: Time e Jornada (F4.1–F4.9) | Trainer Battle Engine, time, probabilidade exibida, presets, jornada, ginásios como aulas | ST-10.1 a 10.20 | E9 |
| **E13** · o idle no servidor | a coleção deixa de morar no navegador — pré-condição dura da Liga de Equipe | ST-13.1 a 13.6 | E9 (o doce e os golpes viram operações do servidor) |
| **E11** · V5: Liga de Equipe (F5.1–F5.9) | snapshot, confronto assíncrono, matchmaking, Liga MMR, temporada, recompensas, anti-win-trading, stake atrás de bandeira | ST-11.1 a 11.11 | E10 e E13 |

---

## E12 · V2: mercados mútuos (F2.1–F2.4, F2.8)

**Resultado para o jogador:** ao lado da aposta de odd fixa, um bolo onde o
preço é formado por quem aposta. Quem lê a Arena melhor que os outros ganha
deles — a casa só retira a taxa e **nunca** toma posição.

**Já existe e é reaproveitado:**
- `server/aposta.mjs` (reserva, lock pelo scheduler, liquidação idempotente) e
  `server/carteira.mjs` / `engine/carteira.mjs` (ledger append-only, buckets,
  proveniência por bucket do §5.5);
- o laço liquida no `aoEncerrar` (D-112) e o servidor paga o pendente ao ligar;
- `server/limites.mjs` e `server/protecao.mjs` (§28.3, pausa, autoexclusão);
- a Liga de Previsão (F2.5–F2.7): `engine/calibracao.mjs`, `server/liga.mjs`,
  `app/modules/liga-*.mjs` — a trilha de calibração da Spec **está feita**; a
  P3.1 do ROADMAP ainda dizia ⏳ (achado B, corrigido neste commit);
- o KillFeed e `engine/colocacao.mjs` (posição e abates por slot);
- `resultadoDaRodada` (`server/scheduler.mjs`) e o Monte Carlo do preço.

**Invariantes do épico** (cada uma vira teste antes do código):

```text
PASSIVO ZERO      soma dos pagamentos + taxa + resíduo == bolo bruto, sempre,
                  em inteiros, sem exceção de arredondamento
PREÇO DEPOIS      o preço do modelo é GRAVADO antes do resultado e PUBLICADO só
                  depois da liquidação; nenhum byte derivado dele sai na janela
PROVENIÊNCIA      entrada em bônus paga em bônus; o bolo não é rota de bônus
                  para transferível (§6.11)
UM LIMITE SÓ      §28.3 soma o mercado principal e TODOS os mútuos
SEM BOT DA CASA   a casa não semeia liquidez: bot que entra no bolo é a casa
                  tomando posição. Bolo vazio é bolo vazio
SÓ COM CONTA      o mútuo existe no modo servidor. Sozinho no navegador não há
                  "outros" para formar preço; a aba local explica isso
```

**Parâmetros propostos (recomendação, valem até o dono dizer outra coisa):**
taxa de 8% (igual à margem medida do mercado principal, para não tornar um dos
dois a escolha óbvia); sem acertador → **devolução proporcional** das entradas
(menos a taxa), exibida antes; resíduo de divisão → `MARKET_RESIDUE` para a
tesouraria, lançado; um mercado aberto por vez (§6.5), começando por abates.

### ~~ST-12.1~~ ✅ 26/09 · O motor de apuração mútua (camada 0) — `engine/mutuo.mjs`, 10 testes (10.000 bolos semeados fecham no bruto) · S1217–S1224
- **Porte** M · **Servidor** não · **Bloco dono** F2.1 · **Spec** §6.4, §6.12 · **Depende de** nada
- **Entrega ao jogador:** nada visível — a regra que torna o bolo honesto.
- **Escopo:** `engine/mutuo.mjs`, puro: `apurar({ entradas, vencedoras, taxa, semAcerto })`
  devolve `{ bruto, taxa, liquido, pagamentos: {id: n}, residuo, destino }`
  em inteiros. Taxa arredonda **para baixo** (a favor do jogador); o rateio é
  proporcional com piso, e o que sobra é resíduo declarado. `semAcerto`:
  `'devolver'` (proporcional, menos a taxa) ou `'tesouraria'`. Uma entrada só
  vale para uma seleção.
- **Fora:** banco, tela, qual mercado.
- **Aceite:**
  1. propriedade em 10.000 bolos semeados (1 a 500 entradas, valores de 1 a 10⁶):
     `Σ pagamentos + taxa + resíduo == bruto`; nenhum pagamento negativo;
     resíduo < número de acertadores;
  2. dois acertadores com a mesma entrada recebem o mesmo;
  3. ninguém acertou: devolução soma `liquido` (menos resíduo), na proporção;
  4. um só apostador que acerta recebe `bruto − taxa`, nunca mais que isso;
  5. entrada zero, negativa, fracionária ou em seleção inexistente é recusada.
- **Sabotagem:** pagar do bruto em vez do líquido; taxa duas vezes; o resíduo
  sumir; arredondar para cima; ignorar `semAcerto`.
- **Portões:** Q1 Q2 Q3 · Q6: sem superfície nova.

### ST-12.2 · O mercado de abates: quem venceu o mercado (camada 0)
- **Porte** P · **Servidor** não · **Bloco dono** F2.2 · **Spec** §6.5 · **Depende de** ST-12.1
- **Entrega ao jogador:** nada visível — a resposta do mercado sai dos eventos da luta.
- **Escopo:** `engine/mercado-abates.mjs`: `selecoesDeAbates(pool)` (os 12
  slots) e `vencedorasDeAbates(eventos)`. A contagem é **a do motor** (a mesma
  de `colocacao.mjs`); abate por tempestade ou por queda não conta. **Empate:**
  todos os empatados no topo vencem, e o bolo se divide pela entrada — regra
  escrita no mercado ao abrir, exibida antes.
- **Aceite:** em 1.000 rodadas semeadas a contagem bate com os eventos, sem
  divergência; empate declarado reproduz; nenhum abate de tempestade conta.
- **Sabotagem:** contar abate de tempestade; contar KO duplicado; empate
  resolvido pelo primeiro; contar pela exibição e não pelo motor.
- **Portões:** Q1 Q2 Q3 · Q6: sem superfície nova.

### ST-12.3 · O bolo no servidor: tabelas, entrada e limite (F2.1, parte a)
- **Porte** M · **Servidor** sim · **Bloco dono** F2.1 · **Spec** §6.10, §6.11, §6.13 · **Depende de** ST-12.1, ST-12.2
- **Entrega ao jogador:** com conta, dá para entrar no bolo de abates pela API.
- **Escopo:** migração aditiva `markets` e `market_entries` (colunas do
  §6.10); os sete tipos do §6.11 em `TIPOS`; o scheduler abre o mercado com a
  rodada (`opens_at`, `locks_at` = os da rodada); `POST /api/mercado/entrar`
  (reserva por bucket, na ordem de consumo), trocar = UPDATE até o lock;
  `GET /api/mercado` devolve a **composição** do bolo (§6.6 permite: o bolo é
  público) e nunca o preço do modelo. **§28.3:** `avaliarAposta` passa a somar
  as entradas mútuas do dia; pausa e autoexclusão recusam.
- **Fora:** a liquidação (12.4), a tela (12.6).
- **Aceite:** entrada depois do lock recusada (fase lida do scheduler);
  entrar num mercado de outra rodada recusado; 100 entradas concorrentes no
  mesmo bolo: o bruto é a soma exata; o limite diário conta Arena + mútuo;
  reservado no ledger = soma das entradas abertas.
- **Sabotagem:** aceitar entrada após o lock; valor vindo do cliente sem
  conferência de saldo; limite contando só o mercado principal; entrada que
  não reserva.
- **Portões:** Q1 Q2 Q3 Q6 Q8.

### ST-12.4 · A liquidação do bolo (F2.1, parte b)
- **Porte** M · **Servidor** sim · **Bloco dono** F2.1 · **Spec** §6.4, §6.11, §6.12 · **Depende de** ST-12.3
- **Entrega ao jogador:** o bolo paga quando a rodada encerra.
- **Escopo:** `liquidarMercado(db, marketId)` na **mesma transação** por
  mercado, chamado pelo `aoEncerrar` do laço ao lado do `liquidarRodada`, e
  pelo `liquidarPendentes` ao ligar. Lança `MARKET_LOSS`, `MARKET_PAYOUT_*`
  (no bucket da entrada), `MARKET_FEE` e `MARKET_RESIDUE`; grava `pot_gross`,
  `pot_net`, `settled_at`. A perda entra no limite de perda do §28.3.
- **Aceite:** liquidar duas vezes liquida uma; falha forçada no meio reverte
  tudo; em 1.000 rodadas com entradas aleatórias: **Σ saída == Σ entrada** por
  mercado e zero divergência; bônus nunca vira transferível; o servidor que
  caiu entre o fim e a liquidação paga ao ligar.
- **Sabotagem:** payout no bucket errado; liquidar fora da transação; não
  lançar o resíduo; liquidar mercado de rodada não encerrada.
- **Portões:** Q1 Q2 Q3 Q6 Q8.

### ST-12.5 · O preço do modelo: carimbado antes, publicado depois
- **Porte** M · **Servidor** sim · **Bloco dono** F2.4 · **Spec** §6.6 · **Depende de** ST-12.4
- **Entrega ao jogador:** depois da rodada, "o bolo pagava 4,1× no Gengar; o
  modelo dava 18% (5,6×)" — onde o mercado errou.
- **Escopo:** o Monte Carlo da abertura passa a contar também o líder de
  abates por simulação (mesmas sementes, **nenhuma** simulação a mais);
  `model_price_json` e `model_priced_at` gravados na abertura; `published_at`
  só na liquidação; `GET /api/mercado/:id/resultado` só para mercado liquidado.
- **Aceite:**
  1. **varredura do payload inteiro** de toda rota e de todo evento da sala
     durante a janela, atrás de qualquer número derivado do preço (o teste do
     §6.6 — é o defeito que anula a fase);
  2. `model_priced_at` < instante do resultado, sempre;
  3. as odds do mercado principal ficam idênticas com e sem a contagem nova
     (goldens e `margem.json` byte a byte).
- **Sabotagem:** publicar o preço antes do lock; vazar no evento da sala;
  calcular o preço depois do resultado; gastar simulações a mais.
- **Portões:** Q1 Q2 Q3 Q4 Q6 Q9.

### ST-12.6 · A tela do bolo
- **Porte** M · **Servidor** não (consome 12.3–12.5) · **Bloco dono** F2.3 · **Spec** §6.3, §6.13, §28.5 · **Depende de** ST-12.5
- **Entrega ao jogador:** uma aba "Bolo" na janela de aposta: quanto há em cada
  lutador, o retorno **estimado** que se move enquanto outros entram, a regra de
  empate e de "ninguém acertou" antes de entrar, e o resultado com o preço do
  modelo ao lado.
- **Escopo:** `app/modules/mutuo-tela.mjs` (camada 0: distribuição, estimativa,
  textos) e a aba. A estimativa diz "se fechasse agora" e nunca "você recebe";
  pagamento menor que a entrada **não comemora** (§28.5); sem conta, a aba
  explica que o bolo precisa de outros jogadores.
- **Aceite:** estimativa nunca maior que o matematicamente possível (bruto −
  taxa); bolo vazio, concentrado e distribuído desenhados; Q5 nas 4 larguras,
  lendo o que está escrito; Q7 com a barra **"tela de um totalizador de
  hipódromo (pari-mutuel), ou de um mercado de previsão nomeado: o jogador
  entende sem ajuda por que o retorno muda?"**.
- **Sabotagem:** retorno exibido como fixo; distribuição congelada; festa com
  pagamento menor que a entrada; aba local fingindo bolo.
- **Portões:** Q1 Q2 Q5 Q7.

### ST-12.7 · O mercado de pódio
- **Porte** P–M · **Servidor** sim · **Bloco dono** F2.2 (extensão) · **Spec** §6.5 · **Depende de** ST-12.6 e a leitura de liquidez do 12.10
- **Escopo:** top 3 **em ordem**, pela ordem de eliminação do motor; empate na
  eliminação (mesmo tique) resolvido por regra declarada — os empatados
  ocupam a mesma posição e o bolo divide entre as combinações que a contêm.
  Seleção = trinca ordenada; a tela mostra as trincas com entrada.
- **Aceite:** 1.000 rodadas sem divergência com `colocacao.mjs`; empate declarado reproduz.
- **Sabotagem:** ordem invertida; empate resolvido pelo slot.
- **Portões:** Q1 Q2 Q3 Q5.

### ST-12.8 · O mercado de faixa de duração
- **Porte** P · **Servidor** sim · **Bloco dono** F2.2 (extensão) · **Spec** §6.5 · **Depende de** ST-12.6
- **Escopo:** 4 faixas fixas de duração (em tiques do motor), com limites
  escolhidos pela mediana medida de 10.000 rodadas para cada faixa ter entre
  15% e 35% de chance; a fixture guarda a medição.
- **Aceite:** as faixas cobrem tudo sem sobrepor; a duração é a do motor.
- **Portões:** Q1 Q2 Q3 Q4 Q5.

### ST-12.9 · O perfil de leitura cobre o bolo
- **Porte** M · **Servidor** sim · **Bloco dono** F2.7 (extensão) · **Spec** §6.9 · **Depende de** ST-12.5
- **Entrega ao jogador:** no perfil de leitura da Liga, "onde você foi contra o
  bolo, e quem estava certo — você, o bolo ou o modelo", com n.
- **Escopo:** agregado por jogador sobre mercados **liquidados**; acerto e erro
  com o mesmo destaque; n sempre visível.
- **Sabotagem:** mostrar só acertos; comparar com o modelo recalculado depois;
  esconder o n.
- **Portões:** Q1 Q2 Q5 Q9.

### ST-12.10 · Telemetria, KPIs e o gate da V2
- **Porte** M · **Servidor** sim · **Bloco dono** F2.8 · **Spec** §6.14, §6.15 · **Depende de** ST-12.4
- **Escopo:** eventos `market_entry`, `market_settled` (anotados pelo
  servidor, sem amostragem); o painel de política ganha participação por
  mercado, entradas por rodada, **concentração do bolo sobre o líquido**,
  calibração média por coorte; `tools/relatorio-piloto.mjs` ganha a seção
  BOLO. O gate do §6.15 sai com número e n, ou "amostra insuficiente".
- **Sabotagem:** amostrar liquidação; concentração sobre o bruto.
- **Portões:** Q1 Q2 Q6 Q9.

## E9 · V3: fechar a coleção (F3.6–F3.13)

**Resultado para o jogador:** o que ele coleciona passa a dizer algo sobre a Arena (o dossiê), e o que ele aposta passa a alimentar o que ele cria (o doce).

**Base que já existe:**
- motor: `engine/evolucao.mjs`, `instancia.mjs`, `nivel-criatura.mjs`, `foco.mjs`, `repertorio.mjs`, `captura.mjs`, `expedicao.mjs`, `emissao.mjs`, `colocacao.mjs`, `engine.mjs` (`atribuirGolpes`);
- servidor: `server/scheduler.mjs` (`resultadoDaRodada`), `server/aposta.mjs` (`liquidarRodada`), `server/protecao.mjs` (`pausaAtiva`, `podeAgir`), `server/telemetria.mjs`;
- tela e save: `app/modules/pokedex*.mjs`, `idle-dados.mjs`, `perfil-dados.mjs` (`mons`, `winMons`, `histBets`), `medalhas.mjs`, `loja-tela.mjs`, `expedicao-resumo.mjs`;
- medição: `test/emissao-idle.mjs` com a fixture `emissao-idle.json`, e `tools/relatorio-piloto.mjs`.

**Depende de:** o E12 na fila. **Não espera o piloto** (decisão do dono, 26/09: terminar o jogo); o piloto, quando rodar, mede o que já estiver construído. Toda story é aditiva: nenhuma tira comportamento de hoje.

### ST-9.1 · O histórico da Arena por espécie
- **Porte** M · **Servidor** não · **Bloco dono** F3.9 · **Spec** §7.12, §22 · **Depende de** nada
- **Entrega ao jogador:** nada visível ainda; o jogo passa a saber o que o dossiê vai mostrar.
- **Escopo:**
  - `engine/dossie.mjs` (camada 0) agrega N rodadas simuladas com o **mesmo** caminho da rodada real: `sortearPool`, clima condicionado à pool, `simular` com eventos, e posição e abates por `colocacao.mjs`.
  - Por espécie: aparições, taxa de vitória, abates (média e variância), distribuição de posição, "cai cedo", taxa por clima, e taxa com e sem rival com vantagem de tipo. **Cada número com o seu n.**
  - `tools/gerar-dossie.mjs` grava `content/dossie_<pack>.mjs` com `engineVersion`, `contentVersion`, raiz e N (recomendado: 200.000 rodadas, semente fixa).
- **Fora:** tela, trancamento, servidor, e qualquer leitura pelo caminho de preço ou de luta.
- **Aceite:**
  1. regerar com a mesma raiz dá arquivo idêntico byte a byte;
  2. um lote curto semeado na suíte bate com o arquivado dentro da tolerância (padrão da `margem.json`);
  3. versão de motor ou de conteúdo divergente reprova a suíte;
  4. goldens e `margem.json` intocados; um teste de grafo prova que nenhum módulo de preço ou de luta importa `dossie`.
- **Sabotagem:** contar abate de tempestade como abate; usar RNG solto em vez de `derivarIndice`; esquecer o clima; calcular posição por travessia própria; omitir o n de um campo.
- **Portões:** Q1 Q2 Q3 Q4 · Q6: sem superfície nova.

### ST-9.2 · A escada de informação da Pokédex
- **Porte** P–M · **Servidor** não · **Bloco dono** F3.10 (motor) · **Spec** §7.4, §6.13 · **Depende de** ST-9.1
- **Entrega ao jogador:** cada espécie da Arena passa a ter um estado (vista, encontrada, capturada, dominada), e o jogo sabe o que falta para o próximo.
- **Escopo:** `pokedex-estado.mjs` (camada 0). Estados:
  - **VISTA:** esteve numa rodada que o jogador recebeu (campo aditivo `vistasArena`);
  - **ENCONTRADA:** conforme R3;
  - **CAPTURADA:** possui ou já possuiu a forma (campo aditivo `jaPossuiu`, inicializado com as criaturas atuais);
  - **DOMINADA:** capturada e com registro completo (fragmentos ≥ alvo da faixa).

  Devolve o que cada estado libera e o que falta.
- **Fora:** tela. Vagas e teto de encontros continuam contando **só** o registro do idle: a escada do 1.19 não muda.
- **Aceite:** estados monotônicos (soltar ou evoluir nunca regride); `vagasPor` e `tetoDeEncontros` dão o mesmo valor antes e depois de 100 rodadas assistidas; save antigo carrega sem perda.
- **Sabotagem:** VISTA entrando em `especiesVistas`; regredir ao soltar; DOMINADA sem captura; ENCONTRADA só por ter aparecido.
- **Portões:** Q1 Q2 Q3 · Q6: sem superfície nova.

### ST-9.3 · O dossiê na ficha da Pokédex
- **Porte** M · **Servidor** não · **Bloco dono** F3.9/F3.10 (tela) · **Spec** §7.4, §7.12, §12 tela 11 · **Depende de** ST-9.2
- **Entrega ao jogador:** a ficha do Charizard mostra o que ele faz na Arena, com o tamanho da amostra, e o que falta para ver mais.
- **Escopo:** seção "Na Arena" com as camadas liberadas pelo estado. A camada trancada diz o requisito ("aposte nele uma vez", "evolua o seu Charmander"). A pré-evolução aponta para a forma que luta. Decisão em camada 0; a tela só pinta.
- **Aceite:** nenhum número sem n (o teste varre o que a ficha devolve); só a camada do estado aparece; Q5 com uma espécie em cada estado nas 4 larguras; Q7 com a barra de F3.10.
- **Sabotagem:** mostrar camada de estado superior; esconder o n; a tela recalcular estatística por conta própria.
- **Portões:** Q1 Q2 Q3 Q5 Q7 · Q6: sem superfície nova (R2).

### ST-9.4 · O dossiê ao lado da aposta
- **Porte** M · **Servidor** não · **Bloco dono** F3.12 (parte) · **Spec** §7.3, §7.15, §22, §28.7 · **Depende de** ST-9.3
- **Entrega ao jogador:** na linha do lutador, "no histórico vence 11% (n=…)" para quem já liberou, sem mexer na odd.
- **Escopo:** linha compacta no painel de odds para espécies ENCONTRADA ou acima; o texto separa "nesta rodada (odd)" de "no histórico".
- **Fora:** dossiê calculado para a pool atual (C1); destacar o clima da rodada.
- **Aceite:**
  1. **informação não é probabilidade:** odds, registro do §4.4.5, semente e eventos idênticos com o dossiê ligado ou desligado e em qualquer estado da Pokédex (3 rodadas semeadas);
  2. o HTML antes do lock é idêntico para climas diferentes (técnica da ST-2.1);
  3. Q5 com 12 linhas a 420 px.
- **Sabotagem:** a linha usar o `p` da rodada; destacar o clima da rodada; a linha aparecer para VISTA.
- **Portões:** Q1 Q2 Q3 Q5 · Q6: sem superfície nova.

### ST-9.5 · O dossiê realizado, do servidor (pode esperar o piloto)
- **Porte** M · **Servidor** sim · **Bloco dono** F3.9 · **Spec** §7.12, §7.17 · **Depende de** ST-9.3
- **Entrega ao jogador:** ao lado do "modelo", o que aconteceu de verdade nas rodadas do servidor.
- **Escopo:** migração aditiva `round_results(round_id, slot, dex, pos, abates, clima)`, gravada na liquidação a partir de `resultadoDaRodada`; `GET /api/dossie` público, só com rodadas `encerrada` e com n; a ficha ganha duas colunas.
- **Aceite:** liquidar duas vezes grava uma (chave primária); rodada aberta ou travada nunca entra; os números batem com `resultadoDaRodada` em 1.000 rodadas.
- **Sabotagem:** incluir a rodada em curso; contar por travessia própria; agregado sem n.
- **Portões:** Q1 Q2 Q3 Q6 (varrer o payload durante a janela) Q8.

### ST-9.6 · A aposta muda quem aparece nas rotas
- **Porte** P · **Servidor** não · **Bloco dono** F3.8 (antecipado) · **Spec** §7.3 · **Depende de** nada
- **Entrega ao jogador:** apostar numa espécie torna a linha dela mais comum nas rotas por 6 h, sem mudar quantos encontros há.
- **Escopo:** religar `pesoComBonus` (achado A). A aposta, local ou com conta, grava `bonusArena {linha, ate}`; o sorteio de encontro aplica o peso à linha presente no bioma.
- **Fora:** teto de encontros e chance de captura.
- **Aceite:** em 10.000 sorteios semeados, a linha sobe cerca de ×4 e o total de encontros é idêntico; apostas de 50 e de 5.000 dão o mesmo bônus; expira em 6 h; não acumula.
- **Sabotagem:** bônus proporcional ao valor; bônus mexendo no teto; bônus que não expira.
- **Portões:** Q1 Q2 Q3 · Q6: sem superfície nova.

### ST-9.7 · O doce: a regra
- **Porte** P · **Servidor** não · **Bloco dono** F3.8 · **Spec** §7.8, §7.6, §22, §28.4 · **Depende de** nada
- **Entrega ao jogador:** nada visível (é a regra pura).
- **Escopo:** `engine/doce.mjs` com `doceDaAposta({venceu, houveAposta, protecaoAtiva, comDoceHoje})` e `doceDaDuplicata(raridade)`.
  - chave por linha (R4);
  - valores recomendados: 3 na vitória, 1 na derrota;
  - teto de 10 apostas por dia que rendem doce (dia de calendário, DEC-10);
  - zero em pausa ou autoexclusão;
  - o teste espia com `Proxy` o que a função lê (padrão de `captura.mjs`).
- **Aceite:** stake de 50 e de 5.000 dão o mesmo doce (teste obrigatório do §7.8); a 11ª aposta do dia rende 0; aposta cancelada rende 0; ler `stake`, `valor` ou `odd` reprova.
- **Sabotagem:** escalar com o valor; escalar com a odd; emitir em pausa; chave pela forma final.
- **Portões:** Q1 Q2 Q3 · Q6: sem superfície nova.

### ST-9.8 · O doce cai na aposta e na duplicata (sem conta)
- **Porte** M · **Servidor** não · **Bloco dono** F3.8 · **Spec** §7.8, §7.6, §28.5 · **Depende de** ST-9.7
- **Entrega ao jogador:** o resultado mostra "+3 doces da linha do Charmander", e soltar uma duplicata vira doce.
- **Escopo:** a liquidação local credita `doces[linha]` no save (campo aditivo, gravação otimista da ST-3.2). Na aposta perdida não há coreografia de vitória. Ação "soltar" na caixa, com confirmação, recusada para criatura na equipe ou em expedição.
- **Aceite:** duas abas creditam uma vez; soltar a última criatura de uma espécie mantém CAPTURADA; Q5 do resultado (vitória e derrota) e da caixa.
- **Sabotagem:** festa no resultado perdido por causa do doce; soltar criatura em campo; crédito duplo.
- **Portões:** Q1 Q2 Q3 Q5 · Q6: sem superfície nova.

### ST-9.9 · O doce da conta real
- **Porte** M · **Servidor** sim · **Bloco dono** F3.8 · **Spec** §7.8, §P2, §16.2 · **Depende de** ST-9.8
- **Entrega ao jogador:** com conta, o doce nasce no servidor junto com a liquidação e chega ao aparelho.
- **Escopo:** migração aditiva `species_candy` e `candy_ledger` (append-only, `idem_key` = id da aposta). O crédito acontece **dentro** da transação de `liquidarRodada`, conferindo a proteção no instante da liquidação. Rotas `GET /api/doces` e `POST /api/doces/resgatar {chaveIdem}` (R5).
- **Aceite:** falha forçada depois do crédito reverte aposta e doce juntos; 2 resgates concorrentes entregam uma vez; a soma do `candy_ledger` é igual ao saldo; aposta cancelada e conta em pausa rendem 0.
- **Sabotagem:** crédito fora da transação; resgate sem idempotência; doce proporcional ao `stake`.
- **Portões:** Q1 Q2 Q3 Q6 (resgatar o de outro, forjar quantidade) Q8 Q9 (`candy_credited`).
- **Nota:** tabela nova aditiva, mesma forma do E4, que foi aprovado por delegação.

### ST-9.10 · Dar doce sobe o nível
- **Porte** M · **Servidor** não · **Bloco dono** F3.4 (resto) · **Spec** §7.9, §7.18 · **Depende de** ST-9.8
- **Entrega ao jogador:** os doces da linha sobem o nível do seu Charmander.
- **Escopo:** ação "dar doce". O XP por doce é fixado pela medição: o máximo de doce de um dia (30) rende no máximo 25% do XP diário do perfil casual da ST-3.3. Só aceita doce da própria linha. A fixture de emissão é regravada de propósito, com o número novo na mensagem.
- **Fora:** doce como requisito de evolução (R7).
- **Aceite:** doce de outra linha recusado; o nível respeita `NIVEL_MAX`; a fixture ganha a coluna do doce; Q5.
- **Sabotagem:** XP acima do teto; aceitar doce de outra linha; não descontar o doce.
- **Portões:** Q1 Q2 Q3 Q4 Q5.

### ST-9.11 · A Arena explica a própria escolha de golpes
- **Porte** P · **Servidor** não · **Bloco dono** F3.7 (pré-requisito) · **Spec** §7.11 · **Depende de** nada
- **Entrega ao jogador:** nada visível (prepara o comparador).
- **Escopo:** `atribuirGolpes` passa a ser `atribuirGolpesExplicado(...).golpes`, que devolve também a razão: ATQ contra ESP, `prefEsp`, `gap` e os torneios decididos pelo viés. `criarMotor` expõe as duas.
- **Aceite:** goldens da Arena e `margem.json` **byte a byte**; nas 76 espécies, `explicado().golpes` é igual ao resultado de hoje.
- **Sabotagem:** reimplementar a razão; viés invertido na razão; consumir o RNG a mais.
- **Portões:** Q1 Q2 Q3 Q4 · Q6: sem superfície nova.

### ST-9.12 · O jogador escolhe os quatro golpes
- **Porte** M · **Servidor** não · **Bloco dono** F3.6 · **Spec** §7.11, §8.6 · **Depende de** nada
- **Entrega ao jogador:** cada criatura usa quatro golpes escolhidos entre os que o nível dela já liberou.
- **Escopo:** campo aditivo `golpes` (padrão: os 4 últimos do `repertorio`); validação em camada 0 (até 4, sem repetir, só do repertório); no Avanço, balões e efeitos usam os escolhidos (R8).
- **Aceite:**
  1. **P4:** um moveset absurdo não muda nada da Arena (goldens e odds de rodada semeada idênticos);
  2. o poder da wave é idêntico com qualquer moveset;
  3. save antigo recebe o padrão.
- **Sabotagem:** aceitar 5 golpes; golpe de outro tipo; golpe acima do nível; moveset vazando para `atribuirGolpes`.
- **Portões:** Q1 Q2 Q3 Q5 · Q6: sem superfície nova.

### ST-9.13 · O comparador
- **Porte** M · **Servidor** não · **Bloco dono** F3.7 · **Spec** §7.11 · **Depende de** ST-9.11, ST-9.12
- **Entrega ao jogador:** ao montar os golpes, ele vê o que a Arena escolheria para a forma que luta, e por quê.
- **Escopo:** "seu X × X da Arena" e a razão em uma frase ("ESP 109 > ATQ 84 → prioriza especial"). Na pré-evolução, compara com a forma da Arena, rotulada.
- **Aceite:** um teste de identidade de referência prova que o comparador importa a função da Arena; cabe numa tela a 420 px; Q7 com a barra de F3.7.
- **Sabotagem:** reimplementar `atribuirGolpes`; razão com viés diferente do real.
- **Portões:** Q1 Q2 Q3 Q5 Q7.

### ST-9.14 · A expedição volta com pesquisa
- **Porte** P · **Servidor** não · **Bloco dono** F3.11 (resto) · **Spec** §7.13 · **Depende de** ST-9.2
- **Entrega ao jogador:** a colheita diz "+1 ficha do Onix: faltam 3 para dominar (libera: por clima)".
- **Escopo:** o resumo da colheita (expedição e Avanço) traduz fragmentos em progresso da escada (R9).
- **Aceite:** o texto bate com `pokedex-estado`; espécie que não luta na Arena não promete dossiê.
- **Sabotagem:** prometer camada que o estado não libera; contar o fragmento duas vezes.
- **Portões:** Q1 Q2 Q5.

### ST-9.15 · Medalhas e missões de coleção, e PokéCoin é o Trainer Coins
- **Porte** M · **Servidor** não · **Spec** §7.15, §7.6, §7.18, §10.4, §22 · **Depende de** ST-9.2
- **Entrega ao jogador:** medalhas por tipo capturado, por % da Pokédex e por "viu todos de um tipo na Arena"; missões semanais que pagam bolas e PokéCoin.
- **Escopo:**
  - medalhas derivadas, sem nada concedido (padrão de `medalhas.mjs`);
  - missões com resgate idempotente, que pagam só PokéCoin e bolas;
  - teste de fronteira: nenhum módulo de idle ou coleção chama a carteira de PokéCash (`banco.mjs`), e nada converte PokéCoin, Essência, Estilhaço ou doce em PokéCash, nem ao contrário;
  - a Spec §10.4 passa a dizer "no código: `pack.moedaPve`".
- **Aceite:** medalha recalculada dá o mesmo; missão resgatada duas vezes credita uma; emissão semanal abaixo do orçamento escrito no teste.
- **Sabotagem:** missão pagando PokéCash; medalha guardada como estado; resgate duplo.
- **Portões:** Q1 Q2 Q3 Q5.

### ST-9.16 · Minha Coleção
Fatiada em duas (a original seria G).

- **Bloco dono** F3.12 · **Spec** §7.15, §12 tela 10 · **Servidor** não · **Depende de** ST-9.4, 9.10, 9.14
- **9.16a · o painel (camada 0), M:** `colecao-dados.mjs` junta equipe, estados da Pokédex, doces, expedições e dossiês, e **cruza a pool da rodada atual com o que o jogador sabe**. Aceite: contagens batem com o save; nunca expõe camada trancada; nada é recalculado fora do dossiê.
- **9.16b · a tela, M:** uma aba da Pokédex (R10), com atalho para apostar. Aceite: dá para decidir em quem apostar sem sair dela (critério do §7.15); Q5 com coleção vazia, parcial e cheia nas 4 larguras; Q7 com a barra de F3.12.
- **Portões:** Q1 Q2 Q5 Q7.

### ST-9.17 · O laço de retorno na Início
- **Porte** P–M · **Servidor** não · **Spec** §7.16, §13 · **Depende de** ST-9.16a
- **Entrega ao jogador:** ao abrir, "desde a sua última visita": expedições prontas, quem subiu de nível, doces ganhos, a ficha a um passo de mudar, e o próximo passo.
- **Escopo:** `retorno-dados.mjs` (camada 0) e um cartão na Início; sem notificação por rodada.
- **Aceite:** na primeira visita não há cartão; relógio do cliente adiantado não inventa colheita; Q5.
- **Sabotagem:** contar a mesma colheita em duas visitas; desenhar cartão vazio.
- **Portões:** Q1 Q2 Q5.

### ST-9.18 · Telemetria e gate da V3
- **Porte** M · **Servidor** sim · **Bloco dono** F3.13 · **Spec** §7.20, §7.21, §17 · **Depende de** as anteriores
- **Entrega ao jogador:** nada visível; dá para saber se a V3 funcionou.
- **Escopo:**
  - eventos novos na lista `DO_CLIENTE`: `dossie_consultado` (com `antesDeApostar`), `moveset_comparado`, `doce_gasto`, `evolucao_feita`, `criatura_solta`;
  - `relatorio-piloto` ganha: diversidade de espécies apostadas antes e depois do dossiê, D7 de quem capturou contra quem não capturou, e % que evoluiu;
  - teste "P4 com tudo ligado".
- **Fora:** antifraude de captura (E8, L-050).
- **Aceite:** evento fora da lista é recusado; reenvio não duplica; o gate 3→4 sai com n, ou com "amostra insuficiente".
- **Sabotagem:** amostrar evento; comparar coortes sem controlar tempo de jogo.
- **Portões:** Q1 Q2 Q3 Q6 Q9.

---

## E10 · V4: Time e Jornada (F4.1–F4.9)

**Resultado para o jogador:** ele monta um time, vê a chance real de vencer mudar a cada troca, e aprende uma interação por ginásio.

**Base que já existe:**
- `engine/engine.mjs`: dano (linha ~195), efetividade, `statAt`, `rng`, `CONF`;
- padrão de Monte Carlo: `engine/preco.mjs` (`derivarIndice`) e o fatiamento por tempo de `app/modules/odds.mjs`;
- `engine/repertorio.mjs`, `instancia.mjs`, `evolucao.mjs`, `app/modules/idle-equipe.mjs` (equipe de seis);
- combate abstrato do idle, que continua: `engine/wave.mjs`, `npc.mjs`;
- `test/golden.mjs`, e golpes do pack com `cat` e `p`.

**Depende de:** o E9. O gate 3→4 (ST-9.18) é medido e registrado, e não tranca a fila (Parte 2, topo).

### ST-10.1 · As primitivas compartilhadas
- **Porte** P–M · **Servidor** não · **Bloco dono** F4.1 · **Spec** §8.2
- **Escopo:** extrair efetividade, fórmula de dano, `statAt` e `rng` para `engine/primitivas.mjs`. A Arena importa de lá; `engine/treino-*.mjs` pode importar `primitivas` e o pack, **nunca** `engine.mjs`.
- **Aceite:** goldens e margem byte a byte; teste de grafo de import.
- **Sabotagem:** o motor de treino importar `engine.mjs`.
- **Portões:** Q1 Q2 Q4 · Q6: sem superfície nova.

### ST-10.2 · A Trainer Battle Engine
- **Porte** M–G (se passar de 4 dias: a = regras, b = eventos e replay) · **Servidor** não · **Bloco dono** F4.1 · **Spec** §8.2, §8.4, §8.9
- **Escopo:** `simular(timeA, timeB, semente, opcoes)` determinístico.
  - times de 1 a 6 em campo (R11);
  - stats de espécie × nível, e ocultos com peso limitado (R12, C4);
  - os 4 golpes escolhidos;
  - físico e especial, imunidade, e velocidade decidindo a ordem;
  - alvo Balanced;
  - sem killstreak, sem tempestade, sem `BALANCE`, sem alvo aleatório;
  - suíte golden própria.
- **Aceite:** mesma semente dá os mesmos eventos; goldens da Arena intocados com o motor carregado; nível maior vence mais em 10.000 combates; efetividade 0 causa 0 de dano.
- **Sabotagem:** importar estado da Arena; ignorar imunidade; velocidade sem efeito; usar `atribuirGolpes` em vez do moveset.
- **Portões:** Q1 Q2 Q3 Q4 · Q6: sem superfície nova.

### ST-10.3 · Evoluir ou esperar
- **Porte** M, com conteúdo · **Servidor** não · **Bloco dono** F3.5 (resto) · **Spec** §7.10
- **Entrega ao jogador:** segurar a evolução passa a render golpes que a forma final não aprende.
- **Escopo:** dado `exclusivos` no pack (1–2 golpes por linha, com nível). Só se aprende na forma pré-evoluída, e o golpe é mantido ao evoluir. A tela de evolução avisa o que se perde.
- **Nota:** fica no E10, e não no E9, porque só tem efeito quando o golpe tem efeito. O `original_v1` ganha uma lacuna (F1.12).
- **Aceite:** evoluir antes do nível torna o golpe inalcançável; depois, o golpe fica; a Arena continua idêntica.
- **Portões:** Q1 Q2 Q3 Q5.

### ST-10.4 · O time de seis e o power score
- **Porte** M · **Servidor** não · **Bloco dono** F4.2, F4.8 (parte) · **Spec** §8.3, §8.13
- **Escopo:** `engine/time.mjs` valida o time (até 6, possuídas, sem repetir, golpes válidos) e calcula um `powerScore` decomposto (nível, espécie, golpes, potencial). A sinergia é só recomendação.
- **Aceite:** a soma das partes dá o total (nada oculto); um espião prova que nem a Trainer Engine nem a Arena leem o power.
- **Sabotagem:** componente não exibido; criatura não possuída aceita.
- **Portões:** Q1 Q2 Q3.

### ST-10.5 · A probabilidade exibida
- **Porte** M–G · **Servidor** não · **Bloco dono** F4.3 · **Spec** §8.1.1
- **Entrega ao jogador:** "seu time vence 23% (±2)", e a maior fraqueza do time.
- **Escopo:** `engine/treino-preco.mjs`, Monte Carlo sobre `simular` com erro, fatiado no cliente. "Maior fraqueza" sai da tabela de tipos. Fixture de medição: `p` exibida contra frequência observada em 20.000 combates por faixa.
- **Aceite:** calibração por faixa dentro da tolerância; parâmetros idênticos aos do combate; arredondamento neutro.
- **Sabotagem:** arredondar a favor do jogador; menos simulações que o declarado; parâmetros divergentes.
- **Portões:** Q1 Q2 Q3 Q4.

### ST-10.6 · O efeito de cada troca
- **Porte** M · **Servidor** não · **Bloco dono** F4.3 (resto) · **Spec** §8.1.1
- **Escopo:** para cada vaga, testar os K melhores candidatos da caixa com as **mesmas sementes** (números aleatórios comuns). Mostra as 3 melhores trocas, só quando a diferença supera o erro.
- **Aceite:** em 20.000 combates independentes, a melhor troca exibida é melhor em pelo menos 95% das vezes; o cálculo é fatiado sem travar o quadro.
- **Portões:** Q1 Q2 Q3 Q4.

### ST-10.7 · Team Builder e Pokémon Build (telas)
- **Porte** M–G · **Servidor** não · **Bloco dono** F4.2 · **Spec** §8.3, §12 telas 20–21
- **Escopo:** tipos, nível, power decomposto, golpes (com link para ST-9.12 e 9.13), fraquezas do time, e a probabilidade contra o adversário escolhido.
- **Aceite:** Q5 com time vazio, parcial e cheio nas 4 larguras; trocar um membro move o número.
- **Portões:** Q1 Q2 Q5 Q7.

### ST-10.8 · Tactical Presets
- **Porte** M · **Servidor** não · **Bloco dono** F4.4 · **Spec** §8.5
- **Escopo:** Aggressive, Balanced, Defensive e Focus Weakness como regras de alvo e de golpe; o preset entra na probabilidade exibida.
- **Aceite:** cada preset tem ao menos um cenário em que move `p` além de 3× o erro; a Arena fica idêntica.
- **Sabotagem:** preset sem efeito; Focus Weakness escolhendo golpe neutro havendo um super-efetivo.
- **Portões:** Q1 Q2 Q3.

### ST-10.9 · A batalha PvE na tela e o resultado
- **Porte** M–G · **Servidor** não · **Spec** §8.9, §12 telas 23–24
- **Escopo:** replay dos eventos com a coreografia e o `MOVE_FX` da Arena; resultado com "`p` antes × o que aconteceu" (fato medido, §28.7); o primeiro adversário é o treinador da Rota 1.
- **Aceite:** tudo derivado dos eventos, por um caminho só; uma luta jogada de ponta a ponta e capturada.
- **Portões:** Q1 Q2 Q5.

### ST-10.10 · O simulador de confrontos
- **Porte** M · **Servidor** não · **Spec** §8.14
- **Escopo:** `tools/simular-builds.mjs` produz a matriz de vitória entre builds, a espécie ou o golpe dominante, e a dificuldade por faixa, gravadas como fixture de medição.
- **Aceite:** reprodutível pela raiz.
- **Portões:** Q1 Q2 Q4.

### ST-10.11 · A jornada: motor e progresso
- **Porte** M · **Servidor** não · **Bloco dono** F4.5 · **Spec** §8.7
- **Escopo:** `engine/jornada.mjs` com nós e ginásios em ordem, insígnia que libera o próximo, e progresso aditivo no save.
- **Aceite:** insígnia fora de ordem recusada; repetir não dá insígnia de novo; o resultado vem sempre da simulação semeada.
- **Portões:** Q1 Q2 Q3.

### ST-10.12 · O mapa de Kanto
- **Porte** M · **Servidor** não · **Bloco dono** F4.5 · **Spec** §12 tela 22
- **Portões:** Q1 Q2 Q5 Q7 (barra de F4.5).

### ST-10.13 a 10.16 · Os ginásios como aulas
Bloco dono F4.6 · §8.1.2, §8.8 · M cada, com conteúdo · portões Q1 Q2 Q3 Q4 Q5 Q7.

| story | ensina | aceite medido pelo simulador (ST-10.10) |
|---|---|---|
| 10.13 · Brock | fraqueza de tipo | time sem golpe super-efetivo contra Pedra perde ≥ 70%; time que aplica a lição vence ≥ 60% |
| 10.14 · Misty | velocidade decide trocas apertadas | mesmo time, só a velocidade invertida: a diferença de `p` passa de 3× o erro |
| 10.15 · Lt. Surge | imunidade | time com imune a Elétrico vence ≥ 60%; sem imune, perde ≥ 70% |
| 10.16 · Sabrina | físico × especial | inverter a categoria do atacante move `p` de lado |

Os percentuais são recomendação. Os valores finais ficam na fixture, e "dificuldade estimada" sem fixture reprova.

### ST-10.17 · Recompensas PvE sem torneira
- **Porte** M · **Servidor** não · **Bloco dono** F4.7 · **Spec** §8.10, §8.11, §10.4
- **Escopo:** a primeira vitória paga cheio (PokéCoin, doce da linha usada, bolas, insígnia, área). Repetição paga reduzido, com teto diário e bônus de diversidade (R13). Nunca PokéCash. O mapa de emissão ganha a coluna PvE.
- **Aceite:** 100 repetições não passam do teto.
- **Sabotagem:** farm por repetição; recompensa virando PokéCash.
- **Portões:** Q1 Q2 Q3 Q4.

### ST-10.18 · Chefes e lendários
- **Porte** M · **Bloco dono** F4.8 · **Spec** §8.12
- **Escopo:** lendário como chefe de campanha ou evento, com recompensa controlada. A regra do idle (uma vaga no mapa, 1,5%) fica escrita no teste como "não é captura comum". Lendário nunca entra no elenco da Arena.
- **Portões:** Q1 Q2 Q3.

### ST-10.19 · O resto da jornada
Erika, Koga, Blaine, Giovanni, Elite Four e Campeão.
- **Porte** G por corte: dois ginásios por story (10.19a a c), com o mesmo aceite dos ginásios acima.
- **IP:** os nomes moram no pack.

### ST-10.20 · A jornada ensina a apostar?
- **Porte** M · **Servidor** sim (telemetria) · **Bloco dono** F4.9 · **Spec** §8.15, §8.16
- **Escopo:** eventos `pve_iniciado`, `ginasio_vencido`, `time_refeito`, `p_exibida`; coortes controlando o tempo de jogo; calibração na Liga de Previsão antes e depois de Brock.
- **Aceite:** a resposta sai com número e n, ou "amostra insuficiente"; nunca mede só quem terminou.
- **Portões:** Q1 Q2 Q6 Q9.

---

## E11 · V5: Liga de Equipe (F5.1–F5.9)

**Resultado para o jogador:** ele tem um motivo para otimizar a coleção e o time por meses.

**Base que já existe:**
- `server/liga.mjs`: modelo de temporada, ranking com amostra mínima, contas ligadas colapsadas;
- `server/protecao.mjs`: `contasLigadas`, limites, `podeAgir`;
- `server/aposta.mjs`: reserva e liquidação atômica e idempotente;
- `wallet_ledger` (append-only, `idem_key`) e os buckets `transferivel`, `pendente`, `bonus`, `competitivo` (`server/banco.mjs:63`);
- `engine/commit.mjs`, `seed.mjs`, `server/criaturas.mjs` (semente auditável), `cosmetic_ownership` (E4).

> **Pré-condição dura: o E13 (idle no servidor).** Um time forjado no `localStorage` tornaria o Liga MMR (e qualquer stake) sem sentido — é o C2 abaixo.

### ST-11.1 · O snapshot de defesa
- **Porte** M · **Servidor** sim · **Bloco dono** F5.1 · **Spec** §9.4
- **Escopo:** tabela imutável `team_snapshots` (versões de motor e de conteúdo, níveis, golpes, preset), com gatilho igual ao do ledger. O servidor valida contra a posse.
- **Aceite:** mudar a criatura depois não altera o snapshot; UPDATE e DELETE são recusados.
- **Portões:** Q1 Q2 Q3 Q6.

### ST-11.2 · O confronto assíncrono e o replay
- **Porte** M · **Servidor** sim · **Bloco dono** F5.1, F5.9 · **Spec** §9.2, §9.13
- **Escopo:** o servidor simula A × B com semente de commit-reveal. `league_matches` guarda semente, versão do motor, snapshots, log de eventos e vencedor. O replay sai do **log**, sem depender da engine antiga, e tem link próprio (I.1).
- **Aceite:** reproduzir pela semente dá o mesmo log; gravar duas vezes grava uma.
- **Sabotagem:** vencedor informado pelo cliente; replay divergente da partida.
- **Portões:** Q1 Q2 Q3 Q6 Q8.

### ST-11.3 · Matchmaking
- **Porte** M · **Servidor** sim · **Bloco dono** F5.1 · **Spec** §9.5
- **Escopo:** MMR, faixa de power, limite de diferença e anti-repetição. Treinadores da jornada preenchem a fila **rotulados como bots**.
- **Aceite:** nunca pareia contas ligadas; o bot aparece rotulado no payload e na tela; 100 pedidos concorrentes criam uma partida.
- **Portões:** Q1 Q2 Q3 Q6 Q8.

### ST-11.4 · O Liga MMR, separado dos outros dois
- **Porte** M · **Servidor** sim · **Bloco dono** F5.2 · **Spec** §9.7, §22
- **Escopo:** Elo simples, com rating oculto e tier visível.
- **Aceite:** teste de grafo: o Liga MMR e a calibração não se leem; Elo de soma zero por partida.
- **Portões:** Q1 Q2 Q3.

### ST-11.5 · A temporada de 28 dias
- **Porte** M · **Servidor** sim · **Bloco dono** F5.2 · **Spec** §9.8
- **Escopo:** colocação, competição e fechamento, com soft reset que só toca o Liga MMR.
- **Aceite:** a virada de temporada é idempotente.
- **Portões:** Q1 Q2 Q3 Q8.

### ST-11.6 · As telas da Liga
- **Porte** M–G, fatiada em Home e Matchmaking / Replay / Placares · **Servidor** sim · **Bloco dono** F5.9 · **Spec** §12 telas 25–28, §9.15
- **Escopo:** nos placares, previsão e Liga MMR nunca ficam na mesma tabela.
- **Portões:** Q1 Q2 Q5 Q7.

### ST-11.7 · Recompensas, League Points e loja
- **Porte** M · **Servidor** sim · **Spec** §9.10, §9.11, §10.1
- **Escopo:** recompensas cosméticas e de prestígio pela `cosmetic_ownership`. League Points é a terceira e **última** moeda (§10.1), com tabela e ledger próprios. A loja nunca vende rating ou pontos.
- **Aceite:** League Points nunca convertem em PokéCash; compra idempotente.
- **Portões:** Q1 Q2 Q3 Q6 Q8.

### ST-11.8 · Anti-win-trading, antes do dinheiro
- **Porte** M · **Servidor** sim · **Bloco dono** F5.8 · **Spec** §9.12, L-050
- **Escopo:** detectar repetição, forfeits e contas ligadas por dispositivo, rede e horário (o gatilho que a L-050 diz faltar). Ações: cooldown entre adversários e partida inelegível, ambas auditadas.
- **Portões:** Q1 Q2 Q6 Q9 (eventos sem amostragem).

### ST-11.9 · Bandeiras de feature no servidor
- **Porte** P · **Servidor** sim · **Spec** §15.3
- **Escopo:** tudo que move valor nasce **desligado**, com auditoria. Ligar exige o marcador do §25.1, no padrão do `ARTE_EMPRESTADA_DE`.
- **Portões:** Q1 Q2 Q6.

### ST-11.10 · Stake de tier na fila de bônus: o dinheiro
- **Porte** M · **Servidor** sim · **Bloco dono** F5.3, F5.4 · **Spec** §9.6, §9.9, §28.3 · **Depende de** D2 para LIGAR (construir não)
- **Escopo:**
  - só PC-B e PC-C; os dois stakes são reservados antes de criar a luta;
  - rake de 10% (queimado e registrado);
  - cancelamento técnico devolve 100%;
  - os limites do §28.3 somam Liga e Arena; pausa bloqueia;
  - fica atrás da bandeira da ST-11.9, **desligada**.
- **Aceite:** pagamentos + rake = pot; `transferivel` nunca é tocado; falha no meio reverte tudo; liquidar duas vezes liquida uma.
- **Sabotagem:** parear bônus com transferível; rake diferente do exibido; stake de conta em pausa.
- **Portões:** Q1 Q2 Q3 Q6 Q8.

### ST-11.11 · Stake: a confirmação honesta
- **Porte** M · **Bloco dono** F5.3 · **Spec** §9.6 (rake explícito antes de confirmar), §28.5
- **Portões:** Q1 Q2 Q5 Q7.

### Condicionadas do E11
Valor real: exigem §25.1, §0.5.1 e DEC-02 (D3).
- F5.4 · fila transferível
- F5.5 · Competitive Profit Account (hurdle e HWM)
- F5.6 · Exchange e Reserve, sem mint
- F5.7 · P2P de PC-T com pendente, holds e 2FA
- §9.14 · espectador (V5.1; recomendo o replay por link)
- §10.9 e §10.10 · guardrails monetários
- §20, item 50 · stress test econômico no CI

---

---

## E13 · O idle no servidor

**Resultado para o jogador:** a coleção, a bolsa e o progresso do idle passam a
valer em qualquer aparelho e a sobreviver a um navegador limpo — hoje só a
conta sobrevive (`docs/PILOTO.md`, seção 1).

**Por que é um épico, e por que aqui.** `server/idle.mjs` e
`server/criaturas.mjs` são transacionais e **não têm rota**. Enquanto o idle
mora no navegador, tudo que ele rende herda a confiança do navegador: aceitável
enquanto nada disso vale nada fora dele (E9, E10), impossível quando um time
enfrenta outro jogador (E11). Vem depois do E9 porque o doce e os golpes
precisam existir antes de virar operação do servidor.

**Regra do épico:** com conta, **o servidor é a fonte de verdade** e o save
local vira cache; sem conta, nada muda.

### ST-13.1 · Rotas da coleção: criaturas, registro e bolsa
- **Porte** M · **Servidor** sim · **Spec** §7.14, §P2 · **Depende de** nada
- **Escopo:** `GET /api/idle` (criaturas, registro, bolsa, estágios) sobre as
  tabelas que `server/idle.mjs` e `criaturas.mjs` já têm; escrita só por
  operação nomeada (nenhum `PUT` do save inteiro).
- **Aceite:** o cliente não consegue escrever criatura, item ou fragmento
  direto; o de outro usuário é invisível.
- **Portões:** Q1 Q2 Q3 Q6.

### ST-13.2 · A colheita é do servidor
- **Porte** M–G · **Servidor** sim · **Spec** §7.14 · **Depende de** ST-13.1
- **Escopo:** expedição e run começam por `POST` (o servidor grava início,
  semente e custo) e se colhem por `POST` idempotente; o servidor recalcula o
  resultado pela semente e pelo relógio **dele**; o teto e a emissão (ST-3.3,
  ST-3.6) valem do lado do servidor.
- **Aceite:** relógio do cliente adiantado não colhe antes; colher duas vezes
  colhe uma; a emissão por jogador-dia bate com a fixture da ST-3.3.
- **Sabotagem:** confiar no instante do cliente; colheita sem idempotência.
- **Portões:** Q1 Q2 Q3 Q4 Q6 Q8.

### ST-13.3 · XP, evolução, golpes e doce como operações
- **Porte** M · **Servidor** sim · **Depende de** ST-13.2, ST-9.9, ST-9.10, ST-9.12
- **Escopo:** dar doce, evoluir, trocar golpes e soltar viram rotas; a regra é
  a mesma função da camada 0 que o cliente usa (um caminho só).
- **Aceite:** o resultado do servidor é idêntico ao do cliente para as mesmas
  entradas (teste de identidade de referência).
- **Portões:** Q1 Q2 Q3 Q6.

### ST-13.4 · Trazer o save local para a conta ⏸️ pergunta ao dono antes
- **Porte** M · **Servidor** sim · **Depende de** ST-13.3
- **Por que pergunta:** é dado com acervo — o caso "caro de desfazer" do
  `CLAUDE.md`. **Recomendação escrita:** importação única por conta, com teto de
  plausibilidade (quantidade por raridade compatível com o tempo de conta e a
  emissão da ST-3.3); o que passa do teto fica de fora e é **dito** ao jogador;
  a importação fica registrada e não se repete.
- **Portões:** Q1 Q2 Q3 Q6.

### ST-13.5 · Com conta, o cliente lê o idle do servidor
- **Porte** M · **Servidor** não (consome 13.1–13.3) · **Depende de** ST-13.4
- **Escopo:** hidratar o idle do servidor no boot com conta; o local vira
  cache; sem rede, a tela diz que está desatualizada em vez de inventar.
- **Aceite:** limpar o navegador e entrar devolve a mesma coleção; o ensaio do
  piloto ganha o passo "limpa o navegador, entra, a coleção está lá".
- **Portões:** Q1 Q2 Q5.

### ST-13.6 · Antifraude mínima da captura (L-050)
- **Porte** M · **Servidor** sim · **Spec** §7.19 · **Depende de** ST-13.2
- **Escopo:** taxa de captura por conta contra a esperada (a semente é do
  servidor); contas ligadas (`contasLigadas`) com o mesmo padrão; ação
  auditada, nunca silenciosa.
- **Portões:** Q1 Q2 Q6 Q9.

---

## Achados do levantamento de 26/09 (registrados neste commit)

- **A.** `pesoComBonus` / `bonusVivo` (`engine/captura.mjs`) — a ponte Arena →
  rotas — é testado e **não tem chamador**. Vai para a LACUNAS como **L-191**,
  dono ST-9.6.
- **B.** A P3.1 do ROADMAP dizia "Liga de Previsão ⏳" com a Liga no ar
  (`server/liga.mjs`, `/api/liga/*`, `viewLiga`). Corrigido neste commit.

## Bandeiras que as fichas acima já respeitam

- **C1 · o dossiê não vaza o preço (§6.6).** Dossiê só de amostra fechada
  (offline ou rodadas encerradas), nunca da pool em curso — teste na 9.1, 9.4 e 9.5.
- **C2 · o idle local.** O E11 é impossível sem o E13.
- **C3 · P5.** Antes do E11, a DEC-03 estende a linhagem `comprado` a mercado
  de criaturas e stake de Liga, escrita e testada.
- **C4 · §21 (IV/EV/natureza).** O código já tem 6 ocultos e natureza
  (aprovados em 30/08); quando entrarem no combate (ST-10.2), a Spec é
  corrigida no mesmo commit.
- **C5 · DEC-08 × §7.10.** CAPTURADA = "possui ou já possuiu a forma, por
  captura ou evolução"; anotar na Spec na ST-9.2.
- **C6 · §28.** O doce não escala com o valor, mas com o número de apostas:
  teto diário (ST-9.7). Stake de Liga soma nos limites, como o bolo (§6.13).
- **C7 · §6.2.** Sem o E12, informação não muda o EV de ninguém — por isso ele
  vem primeiro. Os gates medem comportamento, nunca ganho.
- **C8 · gates.** Medidos e registrados; não trancam a fila (topo desta parte).

## Recomendações que valem como padrão até o dono dizer o contrário

| id | recomendação |
|---|---|
| R1 | dossiê v1 gerado offline por versão de motor e de conteúdo (ST-9.1); o realizado no servidor vem depois (ST-9.5) |
| R2 | o trancamento do dossiê é progressão, não fronteira de segurança, enquanto o idle for local |
| R3 | ENCONTRADA = apostou nela **ou** ela foi a sua escolha de maior peso numa previsão da Liga (a Liga continua sendo caminho de progressão sob limite, §6.13) |
| R4 | o doce é por **linha** (`baseDe`): a Arena só tem formas finais, e a captura rende a base |
| R5 | na conta real, o doce nasce no servidor e é resgatado de forma idempotente |
| R6 | previsão não rende doce na v1 (§7.8 literal) |
| R7 | doce ainda não é requisito de evolução (rebalancearia o 1.21) |
| R8 | moveset só visual em V3; mecânico no E10 |
| R9 | a "pesquisa" da expedição é o registro que já existe, não um recurso novo |
| R10 | Minha Coleção é uma aba da Pokédex |
| R11 | combate PvE com o time inteiro em campo, alvo pelo preset (3v3 cedo, 6v6 depois) |
| R12 | ocultos e natureza entram na Trainer Engine com peso limitado e visível no power score |
| R13 | PvE sem stamina nova: paga cheio na primeira vitória, teto diário e bônus de diversidade |
| R14 | Liga v1 sem stake; espectador trocado por replay por link |
| R15 | bolo: taxa 8%, "ninguém acertou" devolve, resíduo à tesouraria lançado, um mercado por vez (E12) |

## Decisões que continuam do dono

- **D2 · ligar o stake entre jogadores na Liga (E11), mesmo em PC-B.** É pot
  com rake entre usuários (§25.1). Construído atrás de bandeira **desligada**.
- **D3 = DEC-02 · tudo com dinheiro real** (PC-T, PC-C, fila transferível,
  Exchange, P2P). O bolo do E12 roda com a moeda simulada.
- **ST-13.4 · a migração do save local** (dado com acervo).
- **Hospedagem pública** para o piloto e para o teste contínuo: (1) o PC do
  dono com túnel da Cloudflare, ou (2) um VPS/Fly.io na conta dele.
- **Lembrete:** nomes de líderes de ginásio são IP; a DEC-01 cobre a fase
  privada, não a publicação (§0.3.1).
