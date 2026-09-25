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
| **Idle no servidor** (`server/idle.mjs` já é transacional, sem rota) | antes de o idle render qualquer coisa de valor real, ou se a ST-3.2 não bastar |
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
