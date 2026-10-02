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

### ST-0.10 · a peneira `origem` lê só o PRIMEIRO declarador — **aberta, congelada** (L-204)

- `const a = …, f = x => …` e depois `f(…)`: a `origem` acusa `f` de órfão
  (falso VERMELHO, o lado seguro). Contornado na ST-10.19a com uma declaração
  por linha. Só entra se a forma virar impedimento — é arnês (regra de 16/09).

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

### ST-1.4 · o bolo não busca sem sessão (D-132) — ✅ fechada em 30/09
- **Achado:** a CI (ensaio do piloto, run 122) reprovou com `401 GET /api/mercado/resultado` depois de sair da conta; as três execuções seguintes passaram. "Instável" não era a causa: o `sair()` esquece o token na hora, mas a página só recarrega depois de a revogação responder, e nesse intervalo a nova tentativa do resultado do bolo (1,5 s, até 5) e a busca periódica da lista saíam sem credencial.
- **Feito:** as duas buscas do bolo (e a nova tentativa agendada) não saem sem sessão; a periódica para. `test/bolo-sessao.mjs` · S1937–S1939. O ensaio local depois do conserto: 0 recusas.

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

### ST-2.5 · o clima e o teto valem na run (D-127, D-128) — ✅ fechada em 27/09 (a emissão medida está na linha do ROADMAP)

- **Porte** P · **Método** INV · **Depende de** ST-13.2c1 (a conta única: o
  conserto vale para o aparelho e o servidor de uma vez)
- **Escopo:** `paraOMotor` leva o tipo da espécie (o clima passa a achar quem
  aproveita); `semEncontros` perguntado com a reserva da run contada UMA vez.
- **Aceite:** os dois testes que afirmam os defeitos viram o aceite; a
  fixture `emissao-idle.json` regravada com a diferença medida na mensagem
  (o clima passa a pagar); a identidade da `run-servidor` continua verde.
- **Portões:** Q1 Q2 Q3 Q4.

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
| ~~**ST-5.9**~~ ✅ 30/09 · apostar não tira a arena de vista (L-207) — **medido: o app não rolava sozinho.** Em 1440×900 o cartão da aposta nascia inteiro abaixo da dobra (y 913–1225, sob a lista de doze), e confirmar pedia rolar; o "vídeo" de 27/09 era o clique do Playwright rolando até o alvo. Com lutador escolhido, o cartão fica PRESO ao pé da tela na coluna da lista (a ordem quem → quanto → quando da R33/R39 não muda), e a linha "escolha um lutador" some enquanto a confirmação está aberta. Ao sair da aposta, quem apostou tem a arena de volta se ela estiver mais fora que dentro (`deveVoltarArena`, camada 0, limite 0,75). A confirmação passou a dizer quanto recebe (`linhaDaConfirmacao`), achado do Q7. `tools/olhar-aposta.mjs`: confirmar NA TELA em 1440/1100/420, arena 100% à vista na luta nas três · S1910–S1917 | P | em 1440, 1100 e 420: depois de escolher e confirmar, o campo da arena continua na dobra, ou volta a ela sozinho quando a fase vira AO VIVO; Q5 com vídeo |
| ~~**ST-5.10**~~ ✅ 30/09 · a tabela e os avisos da aposta legíveis (D-131, L-215) — **feita:** entre 1001 e 1300 px a linha vira grade de duas faixas e o teto (§4.4.6, que não sai da tela) desce para baixo da chance e da odd — o nome mais estreito passou de 1 letra para **95 px** em 1100 (117 em 1440, 111 em 420, medidos por `tools/olhar-aposta.mjs`); o aviso da arena diz "Confirme X no cartão da aposta" com o lutador escolhido (`textoDoAviso`, camada 0); o banner diz "na lista"; as fichas de valor somem na contagem · o teste do D-110 lia a primeira `.pick .n{` da folha, e o bloco novo foi posto DEPOIS das regras-base · S1918–S1923 · S99 e S312 realinhados · era: em 1100 o nome de cada lutador na tabela de odds sai cortado numa letra; o aviso da arena manda escolher quem já foi escolhido, o cartão do treinador diz "escolha um lutador na arena", e as fichas de valor seguem ligadas na contagem | P | em 1100 o nome inteiro (ou reticências com pelo menos 6 letras) em toda linha; nenhum texto manda fazer o que já foi feito; Q7 com o teste dos 3 segundos |
| ~~**ST-5.11**~~ ✅ 30/09 · os campos numéricos no tema (L-192) — todo `input[type=number]` (a aposta, o bolo, os limites, o admin) com o fundo do painel, a borda do tema e `color-scheme:dark`, que escurece também as setas nativas (o bolo anda de 10 em 10 por elas); o `#betCustom` saía branco porque mora numa `.row`, e não na `.customBet` que já tinha estilo · S1924–S1925 | P | nenhum campo numérico branco; foco no dourado do tema |
| ~~**ST-5.12**~~ ✅ 30/09 · o Centro fala alto (L-195, a parte que é da ação) — a ação principal da equipe diz o DESTINO ("→ caixa" / "→ equipe", e não "guardar/tirar") numa pílula com borda; **a causa de ela sumir era outra além do tamanho: `color:var(--ac)`, variável que não existe na folha** — a cor caía na herdada, escura; o teste passou a cobrar que a cor exista · o soltar armado ganha um "cancelar" à vista, que desarma · S1926–S1929 · **fica na L-195:** as 2 colunas com ~170 px vazios no largo, as pilhas de botões desiguais, o potencial sem nível no cartão | P | a ação legível no cartão escuro; desistir do soltar sem esperar a tela repintar |
| ~~**ST-5.13**~~ ✅ 30/09 · o cartão de medalhas com teto (L-196) — `vitrineDeMedalhas` (camada 0): as 8 ganhas de degrau mais alto e as 3 mais perto, com "ver todas (+N)"; o subtítulo em texto corrido; as missões numa coluna de 760 px · medido com a coleção inteira (`VETERANO=1 tools/olhar-colecao.mjs`): o cartão em 420 passou de ~2.000 px para **584**, em 1920 para 242 · o "ver todas" esticava pela faixa inteira porque o `.btn{flex:1}` vem depois na folha — dois seletores · S1930–S1934 | P | o veterano vê a coleção sem rolar um cartão de 2.000 px |
| ~~**ST-5.14**~~ ✅ 30/09 · o selo do degrau ao lado do título (L-194, a parte do arranjo) — na ficha da Arena o título empurrava o selo ("CAPTURADA") com `space-between` pela largura inteira: a 1920, a ~800 px do texto; agora ao lado do título, numa pílula · S1935–S1936 · **fica na L-194:** os emojis de sistema do clima (☀️ 🌬️ ⛅ ❄️ 🌧️), que pedem ícone do tema — arte, e a mesma nas duas telas (a legenda dos climas e a ficha) | P | o selo lido junto do título em toda largura |
| ~~**ST-5.15**~~ ✅ 30/09 · o Centro enche a largura e diz o nível (o resto da L-195) — a linha do Centro vira grade `auto-fill` (três colunas no painel largo, duas no celular) em vez de fichas de 176 px fixos com ~170 px vazios; o cartão diz "nv 24 · potencial 65", e o botão do doce não repete o nível (repetido, quebrava em duas linhas) · as pilhas de botões seguem desiguais de propósito: cada criatura mostra só as ações que tem · S1940–S1943 | P | o painel largo sem coluna vazia à toa; o nível lido no cartão |
| ~~**ST-5.16**~~ ✅ 30/09 · o clima com ícone nosso (o resto da L-194) — oito ícones 12 × 12 em `arte/clima/` (Tempo Firme, Sol, Chuva, Vento, Neve, Tempestade, Névoa, Pólen), arte NOSSA gerada pela `tools/pixel-arte.mjs` (a grade é a fonte; a arte do mapa regravada sai idêntica); `iconeDoClima` (camada 0) com o emoji do pack de reserva; na ficha ("Por clima"), na legenda dos climas e no selo de clima da Arena · olhados a 16, 22 e 48 px: a primeira tempestade sumia no fundo escuro e o primeiro pólen lia como moeda — corrigidos · S1944–S1947 | P | nenhum emoji de sistema nos climas das três telas |

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

### ~~ST-12.2~~ ✅ 26/09 · O mercado de abates: quem venceu o mercado (camada 0) — `engine/mercado-abates.mjs`; zero abate = ninguém vence (vale o "sem acerto"); 1.000 rodadas da árvore de sementes sem divergência · S1225–S1229
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

### ~~ST-12.3~~ ✅ 26/09 · O bolo no servidor: tabelas, entrada e limite (F2.1, parte a) — `server/mercado.mjs` + `mercado-rotas.mjs`, migração `mercados-mutuos-st12.3`; uma posição por jogador por bolo · S1230–S1242
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

### ~~ST-12.4~~ ✅ 26/09 · A liquidação do bolo (F2.1, parte b) — uma transação por bolo (`emTransacao` + SAVEPOINT na carteira), paga pela raiz revelada, `treasury_ledger` para taxa, resíduo e sem acerto; 1.000 rodadas sem divergência · S1243–S1254
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

### ~~ST-12.5~~ ✅ 26/09 · O preço do modelo: carimbado antes, publicado depois — lote PRÓPRIO de 20.000 simulações no ramo `mercado` (e não "nenhuma simulação a mais": reusar o lote principal exigiria mexer no Monte Carlo que os goldens fotografam); `GET /api/mercado/resultado` · S1255–S1260
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

### ~~ST-12.6~~ ✅ 26/09 · A tela do bolo — `bolo-dados.mjs` (camada 0) + `bolo-tela.mjs`; Q5 em 4 larguras + sem conta; Q7 cego com a barra do tote board / Polymarket (achados corrigidos; o resto em L-192, L-193) · S1261–S1271
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

### ~~ST-12.7~~ ✅ 26/09 · O mercado de pódio — `engine/mercado-podio.mjs`, registro de tipos (`server/mercado-tipos.mjs`), aberto por `MERCADOS=abates,podio` (fechado por padrão, §6.5), abas na tela · achou o D-118 · S1285–S1291
- **Ordem (26/09):** vem DEPOIS da ST-12.10 — o §6.5 manda abrir um mercado por vez e a ficha já dependia da leitura de liquidez; fila: 12.9 → 12.10 → 12.7 → 12.8.
- **Porte** P–M · **Servidor** sim · **Bloco dono** F2.2 (extensão) · **Spec** §6.5 · **Depende de** ST-12.6 e a leitura de liquidez do 12.10
- **Escopo:** top 3 **em ordem**, pela ordem de eliminação do motor; empate na
  eliminação (mesmo tique) resolvido por regra declarada — os empatados
  ocupam a mesma posição e o bolo divide entre as combinações que a contêm.
  Seleção = trinca ordenada; a tela mostra as trincas com entrada.
- **Aceite:** 1.000 rodadas sem divergência com `colocacao.mjs`; empate declarado reproduz.
- **Sabotagem:** ordem invertida; empate resolvido pelo slot.
- **Portões:** Q1 Q2 Q3 Q5.

### ~~ST-12.8~~ ✅ 26/09 · O mercado de faixa de duração — `engine/mercado-duracao.mjs`, limites 28 · 30 · 33 s medidos (fixture `duracao.json`), `MERCADOS=…,duracao` abre · S1294–S1298
- **Porte** P · **Servidor** sim · **Bloco dono** F2.2 (extensão) · **Spec** §6.5 · **Depende de** ST-12.6
- **Escopo:** 4 faixas fixas de duração (em tiques do motor), com limites
  escolhidos pela mediana medida de 10.000 rodadas para cada faixa ter entre
  15% e 35% de chance; a fixture guarda a medição.
- **Aceite:** as faixas cobrem tudo sem sobrepor; a duração é a do motor.
- **Portões:** Q1 Q2 Q3 Q4 Q5.

### ~~ST-12.9~~ ✅ 26/09 · O perfil de leitura cobre o bolo — `engine/leitura-bolo.mjs`, `GET /api/mercado/leitura`, cartão na aba Liga · S1272–S1276
- **Porte** M · **Servidor** sim · **Bloco dono** F2.7 (extensão) · **Spec** §6.9 · **Depende de** ST-12.5
- **Entrega ao jogador:** no perfil de leitura da Liga, "onde você foi contra o
  bolo, e quem estava certo — você, o bolo ou o modelo", com n.
- **Escopo:** agregado por jogador sobre mercados **liquidados**; acerto e erro
  com o mesmo destaque; n sempre visível.
- **Sabotagem:** mostrar só acertos; comparar com o modelo recalculado depois;
  esconder o n.
- **Portões:** Q1 Q2 Q5 Q9.

### ~~ST-12.10~~ ✅ 26/09 · Telemetria, KPIs e o gate da V2 — `engine/gate-v2.mjs` (metas declaradas: 5 pessoas/bolo sobre 30 bolos; Brier depois da 1ª semana < o da 1ª, 30 de cada; divergência zero), `server/gate-v2.mjs` no painel e no relatório do piloto · S1277–S1283
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

### ~~ST-9.1~~ ✅ 26/09 · O histórico da Arena por espécie — `engine/dossie.mjs` + `content/dossie_pokemon_kanto_v1.mjs` (200.000 rodadas, 13,7 s), pela luta paga (`lutaDaRodada`) · S1299–S1303
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

### ~~ST-9.2~~ ✅ 26/09 · A escada de informação da Pokédex — `app/modules/pokedex-estado.mjs`; marcas da Arena em chave própria (`ar_escada_arena`), `jaPossuiu` aditivo no save; DOMINADA pelo registro da LINHA · S1304–S1309
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

### ~~ST-9.3~~ ✅ 26/09 · O dossiê na ficha da Pokédex — seção "Na Arena" (`dossie-ficha.mjs`, camada 0), veredito em palavra ao lado de todo número, n pequeno marcado; a rodada marca vista, a aposta e a Liga marcam encontrada · Q7 aplicado · S1310–S1320, S1348
- **Porte** M · **Servidor** não · **Bloco dono** F3.9/F3.10 (tela) · **Spec** §7.4, §7.12, §12 tela 11 · **Depende de** ST-9.2
- **Entrega ao jogador:** a ficha do Charizard mostra o que ele faz na Arena, com o tamanho da amostra, e o que falta para ver mais.
- **Escopo:** seção "Na Arena" com as camadas liberadas pelo estado. A camada trancada diz o requisito ("aposte nele uma vez", "evolua o seu Charmander"). A pré-evolução aponta para a forma que luta. Decisão em camada 0; a tela só pinta.
- **Aceite:** nenhum número sem n (o teste varre o que a ficha devolve); só a camada do estado aparece; Q5 com uma espécie em cada estado nas 4 larguras; Q7 com a barra de F3.10.
- **Sabotagem:** mostrar camada de estado superior; esconder o n; a tela recalcular estatística por conta própria.
- **Portões:** Q1 Q2 Q3 Q5 Q7 · Q6: sem superfície nova (R2).

### ~~ST-9.4~~ ✅ 26/09 · O dossiê ao lado da aposta — "histórico 12%" sob o nome, a legenda com o n uma vez; entra no painel por gancho (o módulo que precifica não importa a escada) · S1321–S1327
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

### ~~ST-9.5~~ ✅ 26/09 · O dossiê realizado, do servidor — `round_results` gravado da raiz revelada depois do fim; `GET /api/rodada/dossie` público (o nome segue a regra das rotas públicas: só `rodada/*`); a ficha mostra "Neste servidor" em cor própria · S1328–S1335
- **Porte** M · **Servidor** sim · **Bloco dono** F3.9 · **Spec** §7.12, §7.17 · **Depende de** ST-9.3
- **Entrega ao jogador:** ao lado do "modelo", o que aconteceu de verdade nas rodadas do servidor.
- **Escopo:** migração aditiva `round_results(round_id, slot, dex, pos, abates, clima)`, gravada na liquidação a partir de `resultadoDaRodada`; `GET /api/dossie` público, só com rodadas `encerrada` e com n; a ficha ganha duas colunas.
- **Aceite:** liquidar duas vezes grava uma (chave primária); rodada aberta ou travada nunca entra; os números batem com `resultadoDaRodada` em 1.000 rodadas.
- **Sabotagem:** incluir a rodada em curso; contar por travessia própria; agregado sem n.
- **Portões:** Q1 Q2 Q3 Q6 (varrer o payload durante a janela) Q8.

### ~~ST-9.6~~ ✅ 26/09 · A aposta muda quem aparece nas rotas — `pesoComBonus` religado por `pesosDoSorteio` (sorteio E prévia), ×4 na LINHA por 6 h, chave própria no cliente, última aposta no servidor · S1336–S1342
- **Porte** P · **Servidor** não · **Bloco dono** F3.8 (antecipado) · **Spec** §7.3 · **Depende de** nada
- **Entrega ao jogador:** apostar numa espécie torna a linha dela mais comum nas rotas por 6 h, sem mudar quantos encontros há.
- **Escopo:** religar `pesoComBonus` (achado A). A aposta, local ou com conta, grava `bonusArena {linha, ate}`; o sorteio de encontro aplica o peso à linha presente no bioma.
- **Fora:** teto de encontros e chance de captura.
- **Aceite:** em 10.000 sorteios semeados, a linha sobe cerca de ×4 e o total de encontros é idêntico; apostas de 50 e de 5.000 dão o mesmo bônus; expira em 6 h; não acumula.
- **Sabotagem:** bônus proporcional ao valor; bônus mexendo no teto; bônus que não expira.
- **Portões:** Q1 Q2 Q3 · Q6: sem superfície nova.

### ~~ST-9.7~~ ✅ 26/09 · O doce: a regra — `engine/doce.mjs`: 3 na vitória, 1 na derrota, teto de 10 por dia de Brasília, 0 em pausa, chave pela linha; espião `Proxy` reprova ler stake/valor/odd · S1343–S1347
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

### ~~ST-9.8~~ ✅ 26/09 · O doce cai na aposta e na duplicata (sem conta) — `doce-dados.mjs` (camada 0) + gravação otimista com releitura; "+3 doces da linha do X" neutro nos três desfechos; soltar da caixa em dois cliques · S1349–S1354, S1379
- **Porte** M · **Servidor** não · **Bloco dono** F3.8 · **Spec** §7.8, §7.6, §28.5 · **Depende de** ST-9.7
- **Entrega ao jogador:** o resultado mostra "+3 doces da linha do Charmander", e soltar uma duplicata vira doce.
- **Escopo:** a liquidação local credita `doces[linha]` no save (campo aditivo, gravação otimista da ST-3.2). Na aposta perdida não há coreografia de vitória. Ação "soltar" na caixa, com confirmação, recusada para criatura na equipe ou em expedição.
- **Aceite:** duas abas creditam uma vez; soltar a última criatura de uma espécie mantém CAPTURADA; Q5 do resultado (vitória e derrota) e da caixa.
- **Sabotagem:** festa no resultado perdido por causa do doce; soltar criatura em campo; crédito duplo.
- **Portões:** Q1 Q2 Q3 Q5 · Q6: sem superfície nova.

### ~~ST-9.9~~ ✅ 26/09 · O doce da conta real — `candy_ledger` + `species_candy`, crédito DENTRO da transação do bilhete, resgate idempotente por chave guardada antes do pedido · S1355–S1360
- **Porte** M · **Servidor** sim · **Bloco dono** F3.8 · **Spec** §7.8, §P2, §16.2 · **Depende de** ST-9.8
- **Entrega ao jogador:** com conta, o doce nasce no servidor junto com a liquidação e chega ao aparelho.
- **Escopo:** migração aditiva `species_candy` e `candy_ledger` (append-only, `idem_key` = id da aposta). O crédito acontece **dentro** da transação de `liquidarRodada`, conferindo a proteção no instante da liquidação. Rotas `GET /api/doces` e `POST /api/doces/resgatar {chaveIdem}` (R5).
- **Aceite:** falha forçada depois do crédito reverte aposta e doce juntos; 2 resgates concorrentes entregam uma vez; a soma do `candy_ledger` é igual ao saldo; aposta cancelada e conta em pausa rendem 0.
- **Sabotagem:** crédito fora da transação; resgate sem idempotência; doce proporcional ao `stake`.
- **Portões:** Q1 Q2 Q3 Q6 (resgatar o de outro, forjar quantidade) Q8 Q9 (`candy_credited`).
- **Nota:** tabela nova aditiva, mesma forma do E4, que foi aprovado por delegação.

### ~~ST-9.10~~ ✅ 26/09 · Dar doce sobe o nível — `XP_POR_DOCE = 2` pela medição (30 doces/dia = 60 XP = 19,8% do casual); fixture `emissao-idle.json` com a coluna `xpDoce` · S1361–S1364
- **Porte** M · **Servidor** não · **Bloco dono** F3.4 (resto) · **Spec** §7.9, §7.18 · **Depende de** ST-9.8
- **Entrega ao jogador:** os doces da linha sobem o nível do seu Charmander.
- **Escopo:** ação "dar doce". O XP por doce é fixado pela medição: o máximo de doce de um dia (30) rende no máximo 25% do XP diário do perfil casual da ST-3.3. Só aceita doce da própria linha. A fixture de emissão é regravada de propósito, com o número novo na mensagem.
- **Fora:** doce como requisito de evolução (R7).
- **Aceite:** doce de outra linha recusado; o nível respeita `NIVEL_MAX`; a fixture ganha a coluna do doce; Q5.
- **Sabotagem:** XP acima do teto; aceitar doce de outra linha; não descontar o doce.
- **Portões:** Q1 Q2 Q3 Q4 Q5.

### ~~ST-9.11~~ ✅ 26/09 · A Arena explica a própria escolha de golpes — `atribuirGolpes` é `atribuirGolpesExplicado(...).golpes`; goldens e margem byte a byte · S1365–S1367
- **Porte** P · **Servidor** não · **Bloco dono** F3.7 (pré-requisito) · **Spec** §7.11 · **Depende de** nada
- **Entrega ao jogador:** nada visível (prepara o comparador).
- **Escopo:** `atribuirGolpes` passa a ser `atribuirGolpesExplicado(...).golpes`, que devolve também a razão: ATQ contra ESP, `prefEsp`, `gap` e os torneios decididos pelo viés. `criarMotor` expõe as duas.
- **Aceite:** goldens da Arena e `margem.json` **byte a byte**; nas 76 espécies, `explicado().golpes` é igual ao resultado de hoje.
- **Sabotagem:** reimplementar a razão; viés invertido na razão; consumir o RNG a mais.
- **Portões:** Q1 Q2 Q3 Q4 · Q6: sem superfície nova.

### ~~ST-9.12~~ ✅ 26/09 · O jogador escolhe os quatro golpes — `moveset-dados.mjs`: até 4, sem repetir, das listas da Arena (tipos + reserva) filtradas pelo nível; o Avanço sorteia no tamanho do moveset; P4 medido · S1368–S1372
- **Porte** M · **Servidor** não · **Bloco dono** F3.6 · **Spec** §7.11, §8.6 · **Depende de** nada
- **Entrega ao jogador:** cada criatura usa quatro golpes escolhidos entre os que o nível dela já liberou.
- **Escopo:** campo aditivo `golpes` (padrão: os 4 últimos do `repertorio`); validação em camada 0 (até 4, sem repetir, só do repertório); no Avanço, balões e efeitos usam os escolhidos (R8).
- **Aceite:**
  1. **P4:** um moveset absurdo não muda nada da Arena (goldens e odds de rodada semeada idênticos);
  2. o poder da wave é idêntico com qualquer moveset;
  3. save antigo recebe o padrão.
- **Sabotagem:** aceitar 5 golpes; golpe de outro tipo; golpe acima do nível; moveset vazando para `atribuirGolpes`.
- **Portões:** Q1 Q2 Q3 Q5 · Q6: sem superfície nova.

### ~~ST-9.13~~ ✅ 26/09 · O comparador — `comparador-golpes.mjs` usa `atribuirGolpesExplicado` por REFERÊNCIA (teste de identidade); Q7 aplicado · S1373–S1375
- **Porte** M · **Servidor** não · **Bloco dono** F3.7 · **Spec** §7.11 · **Depende de** ST-9.11, ST-9.12
- **Entrega ao jogador:** ao montar os golpes, ele vê o que a Arena escolheria para a forma que luta, e por quê.
- **Escopo:** "seu X × X da Arena" e a razão em uma frase ("ESP 109 > ATQ 84 → prioriza especial"). Na pré-evolução, compara com a forma da Arena, rotulada.
- **Aceite:** um teste de identidade de referência prova que o comparador importa a função da Arena; cabe numa tela a 420 px; Q7 com a barra de F3.7.
- **Sabotagem:** reimplementar `atribuirGolpes`; razão com viés diferente do real.
- **Portões:** Q1 Q2 Q3 Q5 Q7.

### ~~ST-9.14~~ ✅ 26/09 · A expedição volta com pesquisa — `pesquisa-dados.mjs`: "+2 fichas da linha do Bulbasaur (Venusaur na Arena): faltam 6…", pela escada · S1376–S1378
- **Porte** P · **Servidor** não · **Bloco dono** F3.11 (resto) · **Spec** §7.13 · **Depende de** ST-9.2
- **Entrega ao jogador:** a colheita diz "+1 ficha do Onix: faltam 3 para dominar (libera: por clima)".
- **Escopo:** o resumo da colheita (expedição e Avanço) traduz fragmentos em progresso da escada (R9).
- **Aceite:** o texto bate com `pokedex-estado`; espécie que não luta na Arena não promete dossiê.
- **Sabotagem:** prometer camada que o estado não libera; contar o fragmento duas vezes.
- **Portões:** Q1 Q2 Q5.

### ~~ST-9.15~~ ✅ 26/09 · Medalhas e missões de coleção, e PokéCoin é o Trainer Coins — `colecao-dados.mjs`: medalhas derivadas, 3 missões semanais (orçamento 1.200 PokéCoin + 7 bolas), fronteira contra a carteira de PokéCash; Spec §10.4 diz `pack.moedaPve` · S1380–S1384
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

### ST-9.16 · Minha Coleção ✅ 26/09
Fatiada em duas (a original seria G).

- **Bloco dono** F3.12 · **Spec** §7.15, §12 tela 10 · **Servidor** não · **Depende de** ST-9.4, 9.10, 9.14
- ✅ 26/09 **9.16a · o painel (camada 0), M:** (feito em `app/modules/minha-colecao.mjs` — o nome `colecao-dados.mjs` já era das medalhas da ST-9.15; S1385–S1387) `colecao-dados.mjs` junta equipe, estados da Pokédex, doces, expedições e dossiês, e **cruza a pool da rodada atual com o que o jogador sabe**. Aceite: contagens batem com o save; nunca expõe camada trancada; nada é recalculado fora do dossiê.
- ✅ 26/09 **9.16b · a tela, M:** (aba lembrada; atalho escolhe o lutador e rola até a confirmação; texto da linha em camada 0; Q7 aplicado, L-196, D-123; S1389–S1395) uma aba da Pokédex (R10), com atalho para apostar. Aceite: dá para decidir em quem apostar sem sair dela (critério do §7.15); Q5 com coleção vazia, parcial e cheia nas 4 larguras; Q7 com a barra de F3.12.
- **Portões:** Q1 Q2 Q5 Q7.

### ST-9.17 · O laço de retorno na Início ✅ 26/09
> Feito: só NOVIDADE abre o cartão (a expedição que já esperava e a ficha perto de dominar são contexto); quem volta com novidade abre na Início, sem novidade vai à Arena; S1396–S1404.
- **Porte** P–M · **Servidor** não · **Spec** §7.16, §13 · **Depende de** ST-9.16a
- **Entrega ao jogador:** ao abrir, "desde a sua última visita": expedições prontas, quem subiu de nível, doces ganhos, a ficha a um passo de mudar, e o próximo passo.
- **Escopo:** `retorno-dados.mjs` (camada 0) e um cartão na Início; sem notificação por rodada.
- **Aceite:** na primeira visita não há cartão; relógio do cliente adiantado não inventa colheita; Q5.
- **Sabotagem:** contar a mesma colheita em duas visitas; desenhar cartão vazio.
- **Portões:** Q1 Q2 Q5.

### ST-9.18 · Telemetria e gate da V3 ✅ 26/09
> Feito: + `creature_captured` (sem ele o D7 não tem lado); gestos pela diferença do save; P4 em `test/p4-v3.mjs`; banda de captura sem meta (L-197); S1405–S1418. **O E9 fechou.**
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

### ST-10.1 · As primitivas compartilhadas ✅ 26/09
> Feito: `engine/primitivas.mjs`, nível e crítico por parâmetro; goldens byte a byte; S1419–S1423.
- **Porte** P–M · **Servidor** não · **Bloco dono** F4.1 · **Spec** §8.2
- **Escopo:** extrair efetividade, fórmula de dano, `statAt` e `rng` para `engine/primitivas.mjs`. A Arena importa de lá; `engine/treino-*.mjs` pode importar `primitivas` e o pack, **nunca** `engine.mjs`.
- **Aceite:** goldens e margem byte a byte; teste de grafo de import.
- **Sabotagem:** o motor de treino importar `engine.mjs`.
- **Portões:** Q1 Q2 Q4 · Q6: sem superfície nova.

### ST-10.2 · A Trainer Battle Engine ✅ 26/09
> Feito inteira (não precisou do corte a/b): `engine/treino-batalha.mjs`, eventos por turno como formato de replay; ocultos e natureza ±5% (Spec §21 corrigida, C4); S1424–S1430.
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

### ST-10.3 · Evoluir ou esperar ✅ 26/09
> Feito: 58 formas com exclusivo (nível da evolução + 6), guardado ao evoluir, selo âmbar e clique em dois tempos; S1431–S1438; L-198 (o pack original).
- **Porte** M, com conteúdo · **Servidor** não · **Bloco dono** F3.5 (resto) · **Spec** §7.10
- **Entrega ao jogador:** segurar a evolução passa a render golpes que a forma final não aprende.
- **Escopo:** dado `exclusivos` no pack (1–2 golpes por linha, com nível). Só se aprende na forma pré-evoluída, e o golpe é mantido ao evoluir. A tela de evolução avisa o que se perde.
- **Nota:** fica no E10, e não no E9, porque só tem efeito quando o golpe tem efeito. O `original_v1` ganha uma lacuna (F1.12).
- **Aceite:** evoluir antes do nível torna o golpe inalcançável; depois, o golpe fica; a Arena continua idêntica.
- **Portões:** Q1 Q2 Q3 Q5.

### ST-10.4 · O time de seis e o power score ✅ 26/09
> Feito: `engine/time.mjs` (validar, paraTreino, power em quatro partes somadas, fraquezas do time); espião prova que nenhum motor lê o power; S1439–S1443.
- **Porte** M · **Servidor** não · **Bloco dono** F4.2, F4.8 (parte) · **Spec** §8.3, §8.13
- **Escopo:** `engine/time.mjs` valida o time (até 6, possuídas, sem repetir, golpes válidos) e calcula um `powerScore` decomposto (nível, espécie, golpes, potencial). A sinergia é só recomendação.
- **Aceite:** a soma das partes dá o total (nada oculto); um espião prova que nem a Trainer Engine nem a Arena leem o power.
- **Sabotagem:** componente não exibido; criatura não possuída aceita.
- **Portões:** Q1 Q2 Q3.

### ST-10.5 · A probabilidade exibida ✅ 26/09
> Feito: `engine/treino-preco.mjs` + calibração (fixture `treino-calibracao.json`, 20.000 confrontos, 0 faixas fora); S1444–S1448.
- **Porte** M–G · **Servidor** não · **Bloco dono** F4.3 · **Spec** §8.1.1
- **Entrega ao jogador:** "seu time vence 23% (±2)", e a maior fraqueza do time.
- **Escopo:** `engine/treino-preco.mjs`, Monte Carlo sobre `simular` com erro, fatiado no cliente. "Maior fraqueza" sai da tabela de tipos. Fixture de medição: `p` exibida contra frequência observada em 20.000 combates por faixa.
- **Aceite:** calibração por faixa dentro da tolerância; parâmetros idênticos aos do combate; arredondamento neutro.
- **Sabotagem:** arredondar a favor do jogador; menos simulações que o declarado; parâmetros divergentes.
- **Portões:** Q1 Q2 Q3 Q4.

### ST-10.6 · O efeito de cada troca ✅ 26/09
> Feito: `engine/treino-trocas.mjs`, números aleatórios comuns e erro pareado; ≥95% em combates independentes; S1449–S1452.
- **Porte** M · **Servidor** não · **Bloco dono** F4.3 (resto) · **Spec** §8.1.1
- **Escopo:** para cada vaga, testar os K melhores candidatos da caixa com as **mesmas sementes** (números aleatórios comuns). Mostra as 3 melhores trocas, só quando a diferença supera o erro.
- **Aceite:** em 20.000 combates independentes, a melhor troca exibida é melhor em pelo menos 95% das vezes; o cálculo é fatiado sem travar o quadro.
- **Portões:** Q1 Q2 Q3 Q4.

### ST-10.7 · Team Builder e Pokémon Build (telas) ✅ 27/09
> Feito: vista Time (número, rival, trocas, membros com poder e build, caixa); 4 rivais de treino; Q5 + Q7 aplicado; S1453–S1457.
- **Porte** M–G · **Servidor** não · **Bloco dono** F4.2 · **Spec** §8.3, §12 telas 20–21
- **Escopo:** tipos, nível, power decomposto, golpes (com link para ST-9.12 e 9.13), fraquezas do time, e a probabilidade contra o adversário escolhido.
- **Aceite:** Q5 com time vazio, parcial e cheio nas 4 larguras; trocar um membro move o número.
- **Portões:** Q1 Q2 Q5 Q7.

### ST-10.7b · A ordem do time (L-237) — proposta
- Subir e descer no Team Builder, gravando uma `ordem` na conta (local e
  servidor), sem reordenar a coleção. Decidir antes se a ordem entra no
  snapshot da Liga.

### ST-10.8 · Tactical Presets ✅ 27/09
> Feito: quatro presets na Trainer Engine, na chance e nas trocas; seletor no Team Builder; S1458–S1461.
- **Porte** M · **Servidor** não · **Bloco dono** F4.4 · **Spec** §8.5
- **Escopo:** Aggressive, Balanced, Defensive e Focus Weakness como regras de alvo e de golpe; o preset entra na probabilidade exibida.
- **Aceite:** cada preset tem ao menos um cenário em que move `p` além de 3× o erro; a Arena fica idêntica.
- **Sabotagem:** preset sem efeito; Focus Weakness escolhendo golpe neutro havendo um super-efetivo.
- **Portões:** Q1 Q2 Q3.

### ST-10.9 · A batalha PvE na tela e o resultado ✅ 27/09
> Feito: linha do tempo em camada 0 só dos eventos; palco GBA com o estouro da Arena; resultado como fato medido; S1462–S1465.
- **Porte** M–G · **Servidor** não · **Spec** §8.9, §12 telas 23–24
- **Escopo:** replay dos eventos com a coreografia e o `MOVE_FX` da Arena; resultado com "`p` antes × o que aconteceu" (fato medido, §28.7); o primeiro adversário é o treinador da Rota 1.
- **Aceite:** tudo derivado dos eventos, por um caminho só; uma luta jogada de ponta a ponta e capturada.
- **Portões:** Q1 Q2 Q5.

### ST-10.10 · O simulador de confrontos ✅ 27/09
> Feito: matriz do elenco, dominantes e dificuldade por faixa, fixture reprodutível pela raiz; L-200, L-201; S1466–S1468.
- **Porte** M · **Servidor** não · **Spec** §8.14
- **Escopo:** `tools/simular-builds.mjs` produz a matriz de vitória entre builds, a espécie ou o golpe dominante, e a dificuldade por faixa, gravadas como fixture de medição.
- **Aceite:** reprodutível pela raiz.
- **Portões:** Q1 Q2 Q4.

### ST-10.11 · A jornada: motor e progresso ✅ 27/09
> Feito: `engine/jornada.mjs`, nós em ordem, insígnia uma vez, progresso aditivo; `jornada-local.mjs` com a semente antes da gravação; S1469–S1473.
- **Porte** M · **Servidor** não · **Bloco dono** F4.5 · **Spec** §8.7
- **Escopo:** `engine/jornada.mjs` com nós e ginásios em ordem, insígnia que libera o próximo, e progresso aditivo no save.
- **Aceite:** insígnia fora de ordem recusada; repetir não dá insígnia de novo; o resultado vem sempre da simulação semeada.
- **Portões:** Q1 Q2 Q3.

### ST-10.12 · O mapa de Kanto ✅ 27/09
- **Porte** M · **Servidor** não · **Bloco dono** F4.5 · **Spec** §12 tela 22
- **Portões:** Q1 Q2 Q5 Q7 (barra de F4.5).

### ST-10.13 a 10.16 · Os ginásios como aulas ✅ 27/09
Bloco dono F4.6 · §8.1.2, §8.8 · M cada, com conteúdo · portões Q1 Q2 Q3 Q4 Q5 Q7.

| story | ensina | aceite medido pelo simulador (ST-10.10) |
|---|---|---|
| 10.13 · Brock ✅ 27/09 | fraqueza de tipo | time sem golpe super-efetivo contra Pedra perde ≥ 70%; time que aplica a lição vence ≥ 60% — **medido: ignora 0%, aplica 99,95%** (`test/fixtures/ginasios.json`) |
| 10.14 · Misty ✅ 27/09 | velocidade decide trocas apertadas | mesmo time, só a velocidade invertida: a diferença de `p` passa de 3× o erro — **medido: 6,0% × 75,0%, ≈ 40× o erro** (o mesmo Raichu 22, oculto de velocidade 0 × 31) |
| 10.15 · Lt. Surge ✅ 27/09 | imunidade | time com imune a Elétrico vence ≥ 60%; sem imune, perde ≥ 70% — **medido: 90,3% × 13,6%** (Rhyhorn × Arcanine, o mesmo Raticate ao lado) |
| 10.16 · Sabrina ✅ 27/09 | físico × especial | inverter a categoria do atacante move `p` de lado — **medido: 12,2% × 80,0%** (o mesmo Arcanine 42, equilibrado, só especiais × só físicos) |

Os percentuais são recomendação. Os valores finais ficam na fixture, e "dificuldade estimada" sem fixture reprova.

### ST-10.17 · Recompensas PvE sem torneira ✅ 27/09
- **Porte** M · **Servidor** não · **Bloco dono** F4.7 · **Spec** §8.10, §8.11, §10.4
- **Escopo:** a primeira vitória paga cheio (PokéCoin, doce da linha usada, bolas, insígnia, área). Repetição paga reduzido, com teto diário e bônus de diversidade (R13). Nunca PokéCash. O mapa de emissão ganha a coluna PvE.
- **Aceite:** 100 repetições não passam do teto.
- **Sabotagem:** farm por repetição; recompensa virando PokéCash.
- **Portões:** Q1 Q2 Q3 Q4.

### ST-10.18 · Chefes e lendários ✅ 27/09
- **Porte** M · **Bloco dono** F4.8 · **Spec** §8.12
- **Escopo:** lendário como chefe de campanha ou evento, com recompensa controlada. A regra do idle (uma vaga no mapa, 1,5%) fica escrita no teste como "não é captura comum". Lendário nunca entra no elenco da Arena.
- **Portões:** Q1 Q2 Q3.

### ST-10.19 · O resto da jornada ✅ 27/09
Erika, Koga, Blaine, Giovanni, Elite Four e Campeão.
- **Porte** G por corte: dois ginásios por story (10.19a a c), com o mesmo aceite dos ginásios acima.
- **IP:** os nomes moram no pack.
- **10.19a ✅ 27/09** — Erika (resistência: quem apanha pouco, `licao.tiposGolpe`) e Koga (o preset certo: derrube a ameaça primeiro, `licao.presetCerto`). Medido: Celadon 21,6% × 87,0% (Tauros × Arbok), Fuchsia 14,8% × 71,4% (Equilibrado × Defensivo, o mesmo time).
- **10.19b ✅ 27/09** — Blaine (o preset Agressivo: um a menos bate a menos) e Giovanni (o tipo duplo: os dois tipos contam). Medido: Cinnabar 24,3% × 76,4% (Equilibrado × Agressivo, o mesmo Blastoise e Starmie 44), Viridian 6,1% × 98,0% (Machamp × Golduck 50).
- **10.19c ✅ 27/09** — a Liga: Lorelei, Bruno, Agatha e Lance REVISAM uma lição de ginásio cada (o preset Defensivo, a imunidade, físico × especial, a resistência), e o Campeão dá a última: o preset não é receita (o Agressivo que venceu o Blaine perde aqui). L-201 fechada (o rival é especialista: Skull Bash de 17,6% a 3,1% do dano dos rivais da jornada), L-203 fechada (o caminho em duas voltas; 0 rótulos cobertos por sprite nas quatro larguras).
- **10.19d ✅ 27/09** — a correção da lição como botão com a chance projetada (L-205): preset certo ou troca da caixa, decidida na camada 0 (`jornada-correcao.mjs`), com o clique entregando o número prometido; a faixa do caminho em 420, as setas da trilha, a coluna da chance ancorada, a cena e você longe dos nomes.

### ST-10.21 · O acabamento do mapa da jornada (L-206) ✅ 27/09
- **Porte** P–M · **Bloco dono** F4.5 · **Spec** §8.7, §12 tela 22 · **Portões:** Q1 Q2 Q5 Q7.
- **Escopo:** o nó atual com anel e o ícone do tipo; as setas legíveis sobre a trilha por andar; você fora dos lagos; em 1920, a chance perto da frase que a explica; o título da aba; o aviso de risco que diz o tamanho do risco.
- **Aceite:** o crítico cego com a mesma barra da 10.19d dá ≥ 8 às quatro perguntas nas quatro larguras.

### ST-10.22 · O mundo do mapa (L-209)
- **Porte** M · **Bloco dono** F4.5 · **Spec** §8.7, §12 tela 22 · **Portões:** Q1 Q2 Q5 Q7.
- **Escopo:** regiões no mapa (a água de Cerulean, a lava de Cinnabar, a floresta, a pedra), props variados, água que parece água, a etiqueta "PRÓXIMO", o fundo da tela comprida (a casca: `html,body{height:100%}`) que acaba no meio do mapa em 420, o bloco de leitura do chefe, a faixa do celular com o mini-trecho, e o título.
- **Aceite:** o crítico cego com a barra do Super Mario World dá ≥ 8 ao acabamento nas quatro larguras.
- **Dividida em 28/09:** a LEITURA (a) e o MUNDO (b) são trabalhos diferentes — um é texto e marcação, o outro é arte com Q7 próprio.

#### ST-10.22a · A leitura do mapa ✅ 28/09
- **Feito:** a etiqueta "próximo" no nó que falta vencer (embaixo do nome — em
  cima fica você); o bloco de leitura do CHEFE, que era o único nó sem ela —
  `leituraDoChefe` (camada 0) tira dos golpes que ele usa os tipos, a vida de
  chefe e quanto machuca cada um seu, sem inventar lição não medida; a faixa
  do celular virou um mini-trecho (o marco de cada nó na cor do estado, a
  insígnia do ginásio aberto, a trilha tracejada por trás); o título da vista
  com o lema ao lado, e não no canto oposto.
- **Medido: "o fundo acaba no meio do mapa" não é da tela.** O fundo da casca
  é `fixed`; capturado ALÉM da janela (o cartão de 2.200 px numa janela de
  1.300), ele se repete a cada altura de janela, e a emenda aparece na
  imagem. Num aparelho, rolando, não existe (capturado em 420 × 900 em três
  pontos da rolagem). O conserto foi na ferramenta: `olhar-jornada` abre a
  janela do tamanho do cartão.
- `test/jornada-tela.mjs` · S1680–S1686 (todos pegos em Node).

#### ST-10.22b · O mundo do mapa — feito, ACEITE NÃO ATINGIDO (28/09)
- **Escopo:** o que sobra da L-209 — regiões (a água de Cerulean e do porto,
  a lava de Cinnabar, a floresta, a pedra, a cidade), props variados no lugar
  da mesma árvore em fileira, água que parece água.
- **Aceite e portões:** os da ST-10.22.
- **Feito:** o chão das REGIÕES (`regiao` no pack, `regioesDoMapa` na camada
  0: os nós seguidos da mesma região viram uma mancha só, e a grande ganha um
  segundo degrau) como TERRENO — borda em degraus de pixel e face de penhasco
  em estratos onde o lugar é alto; onze materiais (campo, floresta de copa,
  bosque de pinheiro, pedra, praia, jardim, brejo de água parada, paralelepípedo,
  vulcão, usina, planalto); a cena em lista, um anel por tipo; arte NOSSA em
  `arte/mapa/` (`tools/pixel-arte.mjs`): casas em quatro cores que mudam por
  cidade, flores, junco, árvore, pinheiro, torre, braseiro, e um MARCO por
  cidade (museu, farol, loja, portão do safári, torre de Saffron, vulcão,
  palácio da Liga); as poças em pixel (água que anda, lava que respira e solta
  fumaça, brejo com vitória-régia); a parede em duas fileiras e três árvores;
  o trancado esmaece em vez de sumir em cinza; o rótulo do trancado é só o
  nome.
- **O Q7, rodada a rodada** (crítico cego, barra do Super Mario World, notas
  1920 / 1440 / 1100 / 420 / começo):
  ```text
  1ª  mancha de cor esmaecida              5 / 5 / 4,5 / 4 / 5
  2ª  terreno em degraus, arte nossa       5 / 5,5 / 5,5 / 4,5 / 4,5
  3ª  marcos, estratos, materiais          7 / 6,5 / 5,5 / 5 / 6
  4ª  patamar, rótulo curto, poça maior    6 / 6 / 5 / 4 / 6
  ```
  A 3ª e a 4ª ficaram dentro do ruído de um crítico para outro: **o que falta
  deixou de ser acabamento e passou a ser estrutura** — virou a ST-10.22c.
  "A identidade das regiões está no nível do SMW" (3ª rodada) é o que esta
  story entregou.
- **Achados no caminho:** o `<img>` do marco passava pelo afastamento com 0 × 0
  e ficava em cima de um nome (o afastamento roda de novo no `load`); a nossa
  arte herdava a folha de 128 px do `.jnProp` e aparecia esticada ×4.
- `test/jornada-tela.mjs` · S1687–S1707; S1480 e S1691 realvados.

#### ST-10.22c · O mapa como mapa de jogo (L-209, o que a ST-10.22b não fechou)
- **Porte** M · **Bloco dono** F4.5 · **Portões:** Q1 Q2 Q5 Q7.
- **Por quê:** quatro rodadas do Q7 pararam em 6 nas larguras largas e 4–5 no
  celular, e as quatro apontaram as mesmas coisas — que não se resolvem com
  mais uma camada de CSS:
  ```text
  o celular     o mapa abaixo do painel (decisão da ST-10.15, para a lição
                ficar na dobra) e o caminho em duas colunas que não se segue
                com o olho — pedir: o mapa primeiro, recortado no próximo nó,
                e UMA estrada de cima a baixo
  os rótulos    18 fichas fixas cobrem a arte; o SMW tem uma faixa de nome no
                HUD — o nome no mapa só no atual, no escolhido e no vencido
  a água        poças; pedir uma costa ou um rio que ligue Cerulean a Vermilion
  o trancado    o mesmo disco cinza em todo nó: o ponto do nível na cor da região
  o terreno     manchas sobre um gramado; o SMW emenda terreno com terreno
                (autotile) — a borda de cada material casando com a vizinha
  ```
- **Aceite:** o da ST-10.22 (≥ 8 nas quatro larguras).
- **Fatiada em 30/09:** c1 (a leitura: celular, nomes, trancado, trilha) e c2
  (a geografia: terreno, água, a Liga, o fim).
- **10.22c1 ✅ 30/09 — feita, com o aceite NÃO atingido.** No celular, UMA
  estrada de cima a baixo (`mapaDaJornada(…, { emPe: true })` força uma volta
  — com duas, em pé, eram duas colunas), numa JANELA de altura limitada que
  abre no nó escolhido ou no próximo, e o mapa vem antes do painel (a ordem da
  ST-10.15 existia para a lição caber na dobra; a janela resolve o mesmo sem
  esconder o mapa). O nome só no atual, no escolhido e nos vencidos
  (`mostraNome`; o trancado mostra ao passar o dedo). O trancado é o PONTO DO
  NÍVEL na cor da região (`corDoNo`), e não o mesmo disco cinza. A trilha por
  andar virou a fileira de pontos do SMW, com contorno para ler sobre qualquer
  chão. Em pé, a cena do nó vai para os lados (os lagos caíam na estrada).
  `test/jornada-tela.mjs` (23) · S1888–S1891 · S1505 realinhado.
- **Q7 da 10.22c1 (barra: o mapa do SMW):** caminho 6/6/5/2 → a estrada única
  e a janela; onde estou 8/8/7/6; o trancado 4/4/3/3 → a cor da região; mundo
  conectado 4/4/3/3; publicado 5/5/4/3 (1920/1440/1100/420). O que a c1
  resolveu foi medido na captura (os nomes, a cor, a estrada, a janela, a
  trilha pontilhada); a nota de mundo e de "publicado" é da c2.

#### ST-10.22c2 · A geografia do mapa ✅ 30/09 (dos achados do Q7 da c1)
- **Porte** M · **Método** GL (barra: o mapa do SMW) · **Portões:** Q1 Q2 Q5 Q7.
- **Escopo, na ordem do crítico:**
  ```text
  o fim         a Liga termina num losango igual aos outros — um MARCO de
                fim (o palácio da Liga), como o castelo do SMW
  a Liga        a mesa lilás lisa ocupa 40% do mapa para 5 de 18 passos, fora
                da paleta GBA — textura de pedra, penhasco, e menor
  a água        Vermilion é porto e Cinnabar é ilha, e não há mar — uma costa
                embaixo, e um rio que ligue Cerulean a Vermilion
  o terreno     manchas sobre grama; a borda de cada chão casando com a vizinha
  o contraste   no celular a trilha bege some sobre a areia — a borda da trilha
                por chão
  a 1100        a lava invade o platô vizinho; nomes sobre o caminho no chefe
  ```
- **Aceite:** ≥ 8 nas quatro larguras (o da ST-10.22).
- **Sabotagem:** a Liga sem marco de fim; o rio que não liga as duas cidades.
- **10.22c2 ✅ 30/09 — feita, com o aceite ≥8 NÃO atingido** (Q7 abaixo). O
  FIM tem marco: o palácio da Liga grande e centrado sobre o nó do Campeão
  (`jnFinal`), e o nome dele fica sempre, num rótulo dourado com 🏆 que não
  herda o apagado do trancado — o crítico da c1 leu a Usina como mais
  importante que o Campeão. O platô da Liga virou pedra GBA, Cinnabar ganhou
  o fosso de mar, a trilha andada no celular ganhou borda escura, e os lagos
  encolhem entre 521 e 1200 px. E dois achados do crítico da própria c2,
  construídos na hora por serem baratos: o VENCIDO perde o nome no mapa
  (`mostraNome` = atual, escolhido, fim — cinco nomes de por onde passei
  enterravam o trecho andado; quem nomeia o passado é a faixa do caminho), e
  o GINÁSIO FUTURO mostra a insígnia que dá, APAGADA em cinza — silhueta preta
  não serve, a arte de toda insígnia tem placa redonda e as oito sombras saíam
  o mesmo disco escuro (medido na captura). `test/jornada-tela.mjs` (23) ·
  S1892–S1896 · S1889 realinhado.
- **Q7 da 10.22c2 (barra: o mapa do SMW)**, caminho/onde/futuro/mundo/publicado:
  ```text
  1920   antes 6/8/4/3/5   depois 7/8/6/5/6
  1440   antes 6/8/4/4/6   depois 7/8/6/5/6
  1100   antes 5/7/4/5/6   depois 6/8/6/5/6
  420    antes 4/8/3/5/5   depois 3/8/4/4/5
  chefe  antes 4/7/5/5/5   depois 7/8/5/5/6   (1100)
  ```
  Subiu em tudo menos o 420, e nenhuma nota chegou a 8 fora do "onde estou".
  O que ficou vai para a **10.22c3**, na ordem do crítico.

#### ST-10.22c3 · O mundo do mapa ✅ 30/09 (dos achados do Q7 da c2)
- **Porte** M · **Método** GL (barra: o mapa do SMW) · **Portões:** Q1 Q2 Q5 Q7.
- **Escopo, na ordem do crítico:**
  ```text
  o fim         em 1920 o palácio fica logo abaixo da Rota 1 — a jornada acaba
                onde começou; no 420 ele nunca entra na janela
  o platô       a pedra da Liga ainda é uma laje cinza com cinco losangos e
                fontes iguais — cada membro da Elite com um marco próprio
  as pontes     a estrada entra nos lagos sem ponte (1920, 1440, 1100)
  o rio         o que ligaria Cerulean a Vermilion — escopo da c2, NÃO
                construído (o mar de Cinnabar foi; o rio ficou)
  a trilha      os pontos brancos somem sobre pedra clara e grama florida
  o terreno     manchas em degrau sobre grama genérica; casas sem papel
  o vencido     o líder vencido continua de pé no ginásio — nada diz "batido"
  a 1920        o painel para em ~1250 e deixa um bloco morto à direita
  ```
- **Aceite:** ≥ 8 nas quatro larguras (o da ST-10.22).
- **Sabotagem:** a ponte que some; o palácio fora da janela do celular.
- **10.22c3 ✅ 30/09 — feita em parte, com o aceite ≥8 NÃO atingido.**
  Construído:
  - A estrada não atravessa lago nem casa. `cruzaOCaminho` (camada 0) mede a
    caixa da peça contra a linha entre os nós, contando a meia largura da
    estrada. A tela troca a peça de lado ou a tira. Construir ponte seria
    arte nova; tirar o lago da estrada resolve a leitura.
  - A Elite trancada mostra, apagada, a insígnia do ginásio que ela REVISA.
    Os cinco losangos iguais passaram a dizer que lição volta ali.
  - O rival do nó futuro aparece em SILHUETA, na regra do Zapdos. Colorido,
    ele entregava quem espera em cada nó.
  - O rival vencido sai de cena. Apagado pela metade, o crítico leu como
    defeito de pintura.
  - A trilha por andar ganhou contorno dobrado.
  - `test/jornada-tela.mjs` (24) · S1897–S1902.
  - O Q2 do bloco achou um teste decorativo: a regex do ginásio casava com o
    ramo novo da Elite. O teste foi apertado.
- **Q7 da 10.22c3** (caminho/onde/futuro/mundo/publicado), medido ANTES da
  silhueta e do vencido fora de cena. O "futuro" foi exatamente o que essas
  duas mudanças atacaram, e ainda não tem nota nova:
  ```text
  1920 7/7/4/5/5 · 1440 7/7/4/5/5 · 1100 7/8/4/6/6 · 420 3/8/3/3/4
  chefe 1100 8/8/4/6/6 · chefe 420 4/8/3/4/5
  ```
  O caminho chegou a 7–8 nas larguras largas. O que segura o resto é
  ESTRUTURA, e não acabamento: o celular é uma fechadura (a janela mostra 5
  de 18 nós, sem começo nem fim), o mundo é colcha de manchas, e 1920 é uma
  faixa de 4:1. Isso vira a **10.22c4**. Quatro rodadas de acabamento sobre a
  mesma estrutura mostraram que ele não chega a 8.
- **O rio de Cerulean a Vermilion** passa para a c4, junto com o terreno que
  emenda: é a mesma pergunta, "um lugar só".

#### ST-10.22c4 · A estrutura do mapa ✅ 30/09 (dos achados do Q7 da c3)
- **Porte** L · **Método** GL (barra: o mapa do SMW) · **Portões:** Q1 Q2 Q5 Q7.
- **Por que é outra story:** as c1–c3 foram acabamento, e as notas de mundo e
  de "publicado" pararam em 5–6. O que falta muda o arranjo:
  ```text
  o celular     a janela mostra 5 de 18 nós — um MINIMAPA fixo do caminho
                inteiro (começo, você, fim), como a tela de mundo do SMW
  o mundo       um chão contínuo por baixo das regiões (as bordas casando),
                o rio Cerulean–Vermilion e a costa embaixo
  a 1920        a faixa de 4:1: altura mínima maior, ou três voltas
  o fim         o palácio maior que o museu, e longe do começo
  ```
- **Aceite:** ≥ 8 nas quatro larguras (o da ST-10.22).
- **Sabotagem:** o minimapa sem o nó atual; o rio que não liga as duas cidades.
- **10.22c4 ✅ 30/09 — feita, com o aceite ≥8 NÃO atingido. E o mapa SAI da
  fila de acabamento aqui.** Construído:
  - O MINIMAPA do celular (`miniMapa`, camada 0, em `jornada-mundo.mjs`): o
    caminho inteiro numa linha, com o início, os vencidos em ouro, você
    pulsando e o troféu na ponta. Um anel branco marca os nós que a janela
    mostra agora (`marcarJanela`). Tocar um ponto leva a janela até ele.
  - O RIO (`rioDoMapa`, declarado no pack com `rio` no nó de Cerulean): nasce
    na borda, passa por BAIXO da estrada (que lê como ponte) e deságua num
    lago entre as duas voltas. A cena fica longe dele, como da estrada.
  - Em 1920, o mapa de duas voltas ficou mais alto (`clamp(470px,31vw,620px)`).
    A primeira captura não mudou nada: a regra vinha ANTES da altura fixa e
    perdia para ela. O teste passou a cobrar a ordem.
  - `test/jornada-mundo.mjs` (3) · S1903–S1909 · S1899 realinhado. O S1906
    passava no primeiro teste (a regex aceitava duas formas); foi apertado.
- **Q7 da 10.22c4** (caminho/onde/futuro/mundo/publicado):
  ```text
  1920 7/7/6/4/5 · 1440 7/7/6/4/5 · 1100 6/6/5/3/4 · 420 5/8/5/4/5
  chefe 1920 7/8/6/4/5 · chefe 420 5/8/5/4/5
  ```
  O celular subiu no caminho (3 → 5) com o minimapa. O "mundo" não passou de
  3–4 em QUATRO rodadas (c1 a c4), com o chão re-arrumado a cada uma. O que o
  crítico descreve em todas é a mesma coisa: cada região é uma ilha de borda
  em degrau sobre um tapete de árvores. Isso é a ARTE do chão, e não o
  arranjo, e mais acabamento sobre ela não muda a nota. O mapa sai da fila
  de acabamento e vira a **L-214** (o chão em tiles contínuos, com transição
  entre regiões), que pede arte e tem bloco dono próprio.

#### ST-10.22d · O chão do mapa em tiles ✅ 30/09 (L-214)
- **Porte** L · **Método** GL (barra: o mapa do SMW) · **Portões:** Q1 Q2 Q5 Q7.
- **Escopo:** um conjunto de tiles de chão NOSSO (`tools/pixel-arte.mjs`), com
  as bordas de transição entre regiões (grama→areia, areia→pedra, pedra→lava,
  terra→água), e o mapa pintado numa grade em vez de manchas soltas em
  `clip-path`. As decisões de hoje (onde fica cada região, o rio, o minimapa)
  não mudam: muda o que as desenha.
- **Fora:** o arranjo do caminho, os nós, o painel.
- **Aceite:** ≥ 8 em "mundo conectado" e em "publicado" nas quatro larguras.
- **Sabotagem:** a transição que some (duas regiões vizinhas com borda dura);
  o tile que não casa com o vizinho.
- **Feito, com o aceite ≥8 NÃO atingido:**
  - onze tiles 16 × 16 NOSSOS em `arte/chao/` (grama, campo, floresta,
    bosque, pedra, praia, jardim, pântano, cidade, vulcão, planalto), gerados
    pela `tools/pixel-arte.mjs` a partir de grades que um gerador de ruído
    determinístico montou; usados em 2× no lugar dos pontinhos em gradiente.
    A usina fica com as faixas de perigo;
  - a FRANJA: o contorno de cada região 6 px maior, num xadrez de 2 px na
    cor do chão dela, atrás do chão — a transição de tile do GBA. A primeira
    versão saiu um pontilhado escuro: o `drop-shadow` da região sombreava
    cada casa do xadrez. A sombra passou a ser a face de 3 px, e
    `isolation:isolate` mantém a franja acima do fundo do mapa;
  - a PONTE onde o rio cruza a estrada (`rioDoMapa` diz onde), a BANDEIRA do
    início (arte nossa) e o losango do Campeão dourado e maior.
  - `test/jornada-mundo.mjs` (5) · S1948–S1954 · S1904 realinhado.
- **Q7 (barra SMW), antes da ponte, da bandeira e do fim em ouro:** caminho
  7–9, onde estou 7–8, futuro 5–7, mundo 5–6, publicado 5–6 (era 3–4 no
  mundo e 4–5 no publicado na c4). O que o crítico ainda descreve: regiões
  como manchas separadas sobre a grama, o celular com a rota numa faixa
  estreita. O mapa fica aqui: a próxima melhora de "mundo" pede redesenhar o
  mapa como grade de tiles inteira, e não regiões sobre um fundo — é um
  projeto de arte, e não acabamento.

#### ST-10.22e · O mapa como grade de tiles ✅ 30/09
- **Porte** L · **Método** GL (barra: o mapa do SMW) · **Portões:** Q1 Q2 Q5 Q7.
- **Pedido do dono:** *"Pode criar, ou buscar plugins externos, faça o mais
  bonito possível"*. A arte é NOSSA (`tools/pixel-arte.mjs`): arte de
  terceiros não entra num produto com stake (§0.3.1).
- **Escopo:** o chão inteiro deixa de ser manchas em `clip-path` e vira uma
  grade num `<canvas>`, por baixo do caminho e dos nós. As decisões ficam em
  camada 0 (`jornada-chao.mjs`); a tela (`jornada-chao-tela.mjs`, camada 4)
  mede os nós, pede a grade e pinta.
- **Fora:** o arranjo do caminho, os nós, os props, o painel (→ L-216, ST-10.22f).
- **Feito:**
  - a GRADE: célula de 16 px, um quarto do tile de 32 (o 16 × 16 em 2×), e
    cada célula pinta o quarto do tile que lhe cabe — a textura corre
    contínua. O chão de cada célula é o do nó mais perto dentro de um raio
    (0,7 da distância típica entre nós seguidos); a distância leva ruído de
    valor interpolado numa rede de 64 px, e a fronteira sai em curva;
  - a TRANSIÇÃO em quatro peças: a franja em xadrez onde o chão de mais
    precedência invade o vizinho; o CANTO em rampa de 2 px onde os dois
    vizinhos são o mesmo chão (o degrau vira diagonal); a ESPUMA onde a água
    encosta na terra (a água não pontilha a grama); a FACE de penhasco onde o
    chão mais alto está sobre o mais baixo;
  - a grama fora de todo raio liga as regiões; o mar em volta do vulcão; a
    poça de lava que a cena põe no mapa reclama o chão de vulcão em volta;
  - arte nossa: o planalto redesenhado (rocha solta e capim seco — as lajes
    liam como muro de tijolo sobre meio mapa), e dois tiles novos (usina,
    água). `regioesDoMapa` e as ~90 linhas de CSS das manchas saíram — morto
    não fica; a grama do fundo do `.jnMapa` fica de reserva;
  - o que a 10.22b pedia das manchas passa a valer sobre a grade: a Liga é
    um planalto de uma peça só, Pewter e a pedra são um chão, todo nó pisa
    no próprio chão (componente conexa no teste);
  - `test/jornada-chao.mjs` (5) · S1955–S1966 novos · S1687, S1691, S1696,
    S1697, S1700, S1707, S1948, S1950, S1951 realvados na grade — os 21
    mordem à mão.
- **Mutantes de navegador:** nenhum. S1700 e S1959 (a medida e o
  redimensionamento) são pegos pela fonte do pintor, em Node.
- **Q7 (barra SMW), três rodadas:**
  - 1ª, célula de 32 px e o planalto em lajes: mundo 3–4, publicado 3–5 —
    PIOR que a 10.22d. "Muro de tijolo sobre meio mapa", "retângulos em
    escada", "lava boiando";
  - 2ª, célula de 16 px, o planalto de rocha, a espuma e a lava no chão:
    mundo 4–5, publicado 4–6; caminho 6–7, onde estou 5–9, futuro 6–8;
  - 3ª, com o canto em rampa: caminho 6–8, onde estou 6–9, futuro 6–7,
    mundo 3–4, publicado 4–5.
  - **Aceite ≥8 NÃO atingido, e o "mundo" não subiu** sobre a 10.22d (5–6
    naquela rodada; 3–5 nas três desta). Dito sem atenuar: o crítico parou de
    falar de "ilhas sobre um tapete" e passou a falar das TEXTURAS e dos
    NÓS — a usina lê como grade de interface, a cidade como muro de tijolo,
    a floresta como domo de escamas, a silhueta do trancado como mancha de
    tinta, o rio que acaba num lago. É a L-216 (ST-10.22f). A grade fica
    porque é a base em que essas correções se fazem — cada uma é um tile ou
    uma peça, e não mais um recorte em `clip-path`. O veredito do dono sobre
    a troca vai no relatório, com as capturas de antes e depois.

#### ST-10.22f · Os nós e a água no mapa em grade ✅ 30/09 (L-216)
- **Porte** M · **Método** GL (barra: o mapa do SMW) · **Portões:** Q1 Q2 Q5 Q7.
- **Escopo:** o que o Q7 da 10.22e apontou nos nós e na água, e três texturas.
- **Fora:** o chão da grade (10.22e), o arranjo do caminho.
- **Feito:**
  - o rival do nó futuro vira HOLOGRAMA (sem cor, pálido, translúcido, contorno
    no neon); o lendário, no ouro do chefe. A silhueta preta lia como mancha;
  - a PRAÇA do ginásio é chão da grade (`praca`, calçamento quente com borda e
    canto), medida pela tela como a lava — o pedestal oval em CSS saiu;
  - quatro tiles nossos: a cidade em lajes frias irregulares (era tijolo em
    fileira), a praça, a usina em concreto rachado com óleo e ferrugem (era
    chapa em grade), a floresta em copas de tamanhos diferentes com vão e
    tronco (era domo de escamas);
  - o mar do vulcão desce até a borda de baixo, e a água sem vizinha d'água
    vira grama (os "tiles órfãos" medidos no celular);
  - o painel acompanha o mapa em 1920 (tirado o teto de 1240 px; a leitura
    segue com 820);
  - `test/jornada-chao.mjs` (6), `jornada-mundo` e `jornada-tela` · S1971 a
    S1977 · S1902 e S1956 realvados.
- **Tentado e desfeito:** o rótulo subir quando o caminho desce do nó. Nos nós
  com rótulo — o atual, o escolhido, o fim — mora a pessoa em pé em cima (o
  rival, você), e a captura mediu rótulos cobertos de 0 para 1–2 por largura.
  Saiu inteiro (função, classe, CSS, testes, defeitos) — vai para a L-217.
- **Q7 (barra SMW):** caminho 5–7, onde estou 6–8, futuro 5–7, mundo 3,
  publicado 4. **O "mundo" está em 3–5 há cinco rodadas.** O crítico não
  fala mais de textura nem de silhueta: fala de COMPOSIÇÃO — "retalhos de
  Voronoi", "gerado". É o teto de um chão decidido por proximidade; subir dele
  é desenhar o mapa à mão (L-217, ST-10.23), e a recomendação é não furar a
  fila com isso.

#### ST-10.23 · O mapa desenhado à mão ✅ 30/09 (L-217)
- **Porte** L · **Método** GL (barra: o mapa do SMW) · **Portões:** Q1 Q2 Q5 Q7.
- **Pedido do dono:** *"Utilize ferramentas necessárias pra isso, ctza tem
  varias de programação, pesquise melhor"*. Pesquisado: o autotile por cantos
  (grade dupla / marching squares — Red Blob Games, Boris the Brave,
  Excalibur.js), o formato JSON do Tiled (.tmj) e as regras de auto-camada do
  LDtk. Escolhido: autotile por cantos na tela, desenho em texto no pack, e o
  Tiled como editor.
- **Feito:**
  - o DESENHO no ContentPack (`content/mapa_kanto_v1.mjs`): deitado 96×24 e
    em pé 24×120, em três camadas de texto (chão, altura 0–3, obra: ponte e
    escada), mais o traço do rio. A serra ao norte, a floresta no morro, a mesa
    de terra do Caminho da Pedra, o rio que nasce na serra, cruza a estrada por
    ponte, corre pelo vale e chega ao mar de Cinnabar; o vulcão em cone na
    beira do mar, com praia; Celadon e Saffron no alto; a mata do vale ligando
    o norte ao planalto; a Liga em dois degraus;
  - a camada 0 (`jornada-desenho.mjs`): a legenda, a ordem estrita dos chãos
    (a água por baixo de tudo), a AMOSTRA SUAVE (bilinear, a borda segue a
    curva de 0,5 entre as casas) com a OSCILAÇÃO do traço (ruído de valor de
    2,5 casas), a máscara arredondada por cantos com contorno, as camadas de
    cada peça, a altura por cantos;
  - a tela (`jornada-desenho-tela.mjs`): a grade dupla de peças de 8 px com o
    tile nosso em padrão ancorado no mundo; o contorno escuro, e ESPUMA onde a
    terra encosta na água; o penhasco (a máscara de cada altura deslocada
    menos ela mesma) em estratos, com quina e sombra; ponte e escada. O rio
    antigo (SVG, foz, ponte) só existe sem desenho; a cena desvia do rio
    desenhado pelo traço dele. O chão por proximidade fica para o pack sem
    desenho;
  - `tools/mapa-tiled.mjs`: exporta o desenho para o Tiled (.tmj com três
    camadas de tile e o rio como polilinha, tileset de cores em PNG feito com o
    zlib do Node) e importa de volta — a volta é byte a byte. Os .tmj ficam em
    `mapa-tiled/`, e o teste recusa .tmj velho;
  - `test/jornada-desenho.mjs` (6) · S1978–S1990 · S1691 e S1959 realvados ·
    nenhum mutante de navegador.
- **Q7 (barra SMW), três rodadas:** mundo 3–4 → 3–4 → 3–5 (em pé, 5),
  publicado 4–5 → 4–5 → 4–6; caminho 5–8, onde estou 7–9, futuro 5–7.
  **Aceite ≥8 não atingido.** O que o crítico diz agora mudou de natureza: não
  fala mais de ilhas nem de degrau em serrote; fala da ESTRADA desenhada por
  cima do chão (linha reta sobre a mata, contas brancas no futuro), do
  penhasco fino demais para ler (9 px), e do arranjo dos nós (a metade da
  esquerda vazia, a direita apertada em 1100). É a L-218.

#### ST-10.24 · A estrada no chão (L-218) ✅ 30/09 — aceite ≥7 NÃO atingido
- **Porte** M · **Método** GL (barra: o mapa do SMW).
- **Feito:** `jornada-estrada.mjs` (camada 0) — o andado e SÓ o trecho próximo
  (o resto do futuro não é desenhado), a curva que passa pelos nós e ondula
  entre eles, as casas da grade que ela cobre, a ponte e a escada perguntadas
  ao chão pela curva, a largura e o penhasco pela escala, a seta só do trecho
  próximo. A tela pinta a estrada pelo MESMO autotile do chão (borda em dois
  tons), as obras por cima, o penhasco com face (colunas, quina, base,
  sombra); a seta do futuro é cinza; o marco não some mais (o palácio do
  Campeão sumia no fim). Com o desenho, o traço SVG sai.
- **Q7 cego, quatro rodadas** (mundo / publicado / estrada / altura, a pior e a
  melhor largura): 1ª 5·4·3–5·4–5 → 2ª 5·4–5·4–5·4–5 → 3ª 5–6·5·5–6·5–7 →
  4ª 4–5·4–5·4–5·5–6. **O aceite ≥7 não foi atingido**: o que segura mundo e
  publicado passou a ser o chão e a composição — **L-219**, dono **ST-10.25**.
- **Tentado e desfeito:** o rótulo em cima do nó quando a estrada desce (caía
  sobre o treinador — a sonda do Q5 acusou em 1100).
- **Sabotagem:** S2055–S2066.

#### ST-10.25 · A composição do mundo (L-219) ✅ 30/09 — aceite ≥7 NÃO atingido
- **Porte** M · **Método** GL (barra: o mapa do SMW).
- **Feito:** o contorno das regiões em duas oitavas de ruído (`oscila` 0,75 e
  `grao` 0,3) e a peça do chão de 4 px (era 8 — a curva saía em degraus
  regulares, lidos como hexágono); o nó trancado é só o ponto no chão (o rival
  e o lendário aparecem quando o caminho abre); a mata abre clareira em grama
  onde a estrada passa; pedras em pixel no miolo dos planaltos (densidade e
  margem em pixels); a lava em faixas chapadas e passos; a escala (jogador
  0,78, treinador 0,8, palácio 1,6 — era 2,1 —, lendário 0,75); a estrada um
  degrau mais larga.
- **Q7 cego, duas rodadas** (mundo / publicado / estrada / altura): 1ª 3–4 ·
  3–4 · 5 · 4–5 → 2ª 4–5 · 4–5 · 6 · 5–6. **O aceite ≥7 não foi atingido**: o
  que segura agora é o DESENHO do mapa — **L-220**, dono **ST-10.26**.
- **Sabotagem:** S2067–S2073; S1902, S1971, S1972 e S1987 realvados.

#### ST-10.26 · O desenho do mapa (L-220) — proposta, ADIADA pela DEC-20 (o dono: "só segue com desenvolvimento")
- **Porte** G · **Método** GL (barra: o mapa do SMW) · **Ferramenta:** o Tiled.
- **Escopo:** redesenhar a geografia em poucas massas grandes com transição
  (a metade direita deixa de ser colcha de biomas); a regra de revelação — o
  nó futuro aparece junto com o trecho que leva a ele, e não solto; o topo dos
  planaltos limpo, com a textura na borda; a hierarquia de altura (poucas
  elevações altas, o resto plano).
- **Aceite:** ≥ 7 em "mundo" e "publicado" no Q7 cego nas quatro larguras.
- **Sabotagem:** o nó futuro volta a aparecer sem estrada; o desenho volta aos
  retalhos (o teste de área mínima por região).

### ST-10.20 · A jornada ensina a apostar? ✅ 27/09
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

### ST-11.1 · O snapshot de defesa ✅ 28/09
- **Porte** M · **Servidor** sim · **Bloco dono** F5.1 · **Spec** §9.4
- **Escopo:** tabela imutável `team_snapshots` (versões de motor e de conteúdo, níveis, golpes, preset), com gatilho igual ao do ledger. O servidor valida contra a posse.
- **Aceite:** mudar a criatura depois não altera o snapshot; UPDATE e DELETE são recusados.
- **Portões:** Q1 Q2 Q3 Q6.
- **Feito:** `app/modules/snapshot-dados.mjs` (camada 0): `snapshotDoTime` monta
  o time pela MESMA montagem da luta da jornada (`paraTreino` com os golpes
  escolhidos, o IV e a natureza), com o power e as duas versões —
  `VERSAO_TBE` (as regras, nova em `engine/treino-batalha.mjs`) e
  `conteudoDaLuta` (FNV-1a do que a luta lê: tipos, espécies, lendários e
  golpes). Migração `equipe-st11.1`: `team_snapshots` com os dois gatilhos do
  livro da carteira. `server/equipe.mjs`: a posse vem da conta de quem pede
  (`criaturasParaLuta`, extraída da jornada); `POST /api/equipe/snapshot` e
  `GET /api/equipe/snapshots`. O time da Liga é ESCOLHIDO — a caixa pode
  entrar. `test/equipe-snapshot.mjs` · S1708–S1716; S1666 realvado.

### ST-11.2 · O confronto assíncrono e o replay ✅ 28/09
- **Porte** M · **Servidor** sim · **Bloco dono** F5.1, F5.9 · **Spec** §9.2, §9.13
- **Escopo:** o servidor simula A × B com semente de commit-reveal. `league_matches` guarda semente, versão do motor, snapshots, log de eventos e vencedor. O replay sai do **log**, sem depender da engine antiga, e tem link próprio (I.1).
- **Aceite:** reproduzir pela semente dá o mesmo log; gravar duas vezes grava uma.
- **Sabotagem:** vencedor informado pelo cliente; replay divergente da partida.
- **Portões:** Q1 Q2 Q3 Q6 Q8.
- **Feito:** `app/modules/partida-dados.mjs` (camada 0): `confrontoDaLiga` luta o
  DEFENSOR (o time publicado, A) contra o DESAFIANTE (B), cada um com o preset
  que congelou, pela semente do ramo `liga` da raiz; recusa o time congelado
  com outras regras ou outro conteúdo; o LOG leva o começo de cada lutador
  (espécie, nível, vida) e os eventos. `replayDoLog` refaz a partida SÓ do log,
  sem motor nem pack. Migração `liga-st11.2`: `league_matches` com a raiz, o
  sal e o compromisso (o esquema da Arena, `mensagemCommit`), a chave do pedido
  única e os gatilhos do livro. `server/partida.mjs`: `POST /api/equipe/partida`
  (a raiz, a semente e o vencedor do corpo são ignorados; o próprio time é
  recusado) e `GET /api/equipe/partida?id=` (o link próprio, com o reveal).
  `test/liga-partida.mjs` · S1717–S1726.

### ST-11.3 · Matchmaking ✅ 28/09 (a TELA do rótulo é da ST-11.6)
- **Porte** M · **Servidor** sim · **Bloco dono** F5.1 · **Spec** §9.5
- **Escopo:** MMR, faixa de power, limite de diferença e anti-repetição. Treinadores da jornada preenchem a fila **rotulados como bots**.
- **Aceite:** nunca pareia contas ligadas; o bot aparece rotulado no payload e na tela; 100 pedidos concorrentes criam uma partida.
- **Portões:** Q1 Q2 Q3 Q6 Q8.
- **Feito:** `app/modules/pareamento-dados.mjs` (camada 0): corta eu, as contas
  ligadas, o time de regras velhas, a diferença de rating acima de 300, o power
  fora de ±35% e os três últimos adversários; do que sobra, o mais perto em
  rating, depois em power, depois pelo id (determinístico). O BOT: o treinador
  da jornada de power mais perto — o chefe lendário não entra — rotulado no
  payload (`bot`, o nome, "não é um jogador"). Migração `bots-st11.3`:
  `league_bot_matches` à parte, e a partida contra o bot NÃO mexe no Liga MMR
  (`rated: false` — farmar bot inflaria o rating). `POST /api/equipe/buscar`;
  o desafio DIRETO também recusa conta ligada (sem isso, a rota direta era o
  atalho). Cem pedidos concorrentes com a mesma chave: uma partida.
  `test/liga-pareamento.mjs` · S1735–S1745.
- **O que fica:** o rótulo do bot NA TELA é da ST-11.6 (as telas da Liga); o
  payload já o carrega.

### ST-11.4 · O Liga MMR, separado dos outros dois ✅ 28/09
- **Porte** M · **Servidor** sim · **Bloco dono** F5.2 · **Spec** §9.7, §22
- **Escopo:** Elo simples, com rating oculto e tier visível.
- **Aceite:** teste de grafo: o Liga MMR e a calibração não se leem; Elo de soma zero por partida.
- **Portões:** Q1 Q2 Q3.
- **Feita ANTES da 11.3**, de propósito: o matchmaking pareia pelo MMR.
- **Feito:** `engine/liga-mmr.mjs` (Elo, K 32, inicial 1000, sem piso — um piso
  criaria rating do nada; o delta arredondado UMA vez, e o que um ganha o
  outro perde exatamente) e os tiers do §9.6 por faixa. Migração
  `liga-mmr-st11.4`: `liga_mmr` (o de hoje) e `liga_mmr_eventos` (o livro,
  um evento por PARTIDA — aplicar duas vezes aplica uma — só de inserção).
  O rating muda na MESMA transação que grava a partida (a partida que falha
  no rating não fica gravada). A tela recebe o TIER, nunca o número
  (`GET /api/equipe/tier`). O teste de grafo lê as fontes: nada que fala de
  calibração ou previsões toca o Liga MMR, e vice-versa.
  `test/liga-mmr.mjs` · S1727–S1734.

### ST-11.5 · A temporada de 28 dias ✅ 28/09
- **Porte** M · **Servidor** sim · **Bloco dono** F5.2 · **Spec** §9.8
- **Escopo:** colocação, competição e fechamento, com soft reset que só toca o Liga MMR.
- **Aceite:** a virada de temporada é idempotente.
- **Portões:** Q1 Q2 Q3 Q8.
- **Feito:** `engine/temporada.mjs`: a temporada é do RELÓGIO — número, dia, fase
  (1–7 colocação, 8–21 competição, 22–28 fechamento), início e fim —, virando
  no dia do mundo (3 h), com a temporada 1 na segunda 28/09/2026; o soft reset
  puxa o rating ao inicial pela metade da distância. Migração `temporada-st11.5`:
  `liga_estado` (a temporada corrente), `liga_temporadas` (o ranking FINAL de
  cada uma — tier e posição, nunca o número) e `liga_mmr_resets` (o reset de
  cada conta, o antes e o depois), os dois só de inserção. `server/temporada.mjs`:
  a virada é PREGUIÇOSA (quem lê ou joga a Liga sincroniza; sem agendador que
  possa não rodar) e IDEMPOTENTE pela guarda na cláusula (o valor lido velho
  não fecha de novo); fecha em ordem as temporadas que o relógio deixou para
  trás. A partida sincroniza ANTES — conta no rating resetado. O rating de hoje
  é a soma dos dois livros. `GET /api/equipe/temporada`.
  `test/liga-temporada.mjs` · S1746–S1752.
- **O que fica:** a colocação é só a FASE (rótulo para a ST-11.6); K maior nas
  partidas de colocação, se o piloto pedir, é balanceamento da ST-11.7.

### ST-11.6 · As telas da Liga ✅ 30/09
- **Porte** M–G, fatiada em Home e Matchmaking / Replay / Placares · **Servidor** sim · **Bloco dono** F5.9 · **Spec** §12 telas 25–28, §9.15
- **Escopo:** nos placares, previsão e Liga MMR nunca ficam na mesma tabela.
- **Portões:** Q1 Q2 Q5 Q7.
- **Fatiada em 30/09:** **11.6a** a League Home e a busca (telas 25–26) ✅ ·
  **11.6b** o replay da partida (tela 27) ✅ · **11.6c** os placares (tela 28) ✅ ·
  **11.6d** a partida no palco da Arena (pedido do dono) ✅.
- **11.6c feita (30/09):** `rankingDaLiga` (`server/liga-equipe.mjs`):
  - a temporada de agora é VIVA, na mesma ordem que a virada grava (rating,
    depois a conta), só com quem jogou;
  - a fechada é a gravada na virada, e não se recalcula;
  - sai a posição, o nome, o tier e as partidas, nunca o número;
  - `GET /api/equipe/ranking?temporada=`, com 400 para temporada inválida e
    404 para a que não existe.
  Na tela (`rankingNaTela`): o pódio com medalha, "você" aceso, o "…" antes
  da minha linha quando estou fora do topo de 20, "você: 23º de 24", e as
  abas da temporada de agora e das fechadas. Fica ao lado das últimas
  partidas nas telas largas (ocupa a lateral que o Q7 da 11.6d apontou) e
  embaixo no celular. A tabela é SÓ da Liga de times: a previsão tem a
  dela (§9.15). `test/liga-ranking.mjs` · S1820–S1825.
- **11.6a feita:** a aba "Liga de times" no Time (`app/modules/liga-equipe-dados.mjs`,
  camada 0: tudo o que a tela diz; `liga-equipe-tela.mjs`, camada 4: pinta e
  fala com o servidor). `server/liga-equipe.mjs`: `GET /api/equipe/liga` (a
  temporada, o tier, o time publicado, o time da conta e as cinco últimas
  partidas do MEU lado, com o efeito no tier em NOMES) e `POST
  /api/equipe/publicar` (congela o time da conta, fora da caixa; recusa com a
  Liga desligada). `tools/olhar-liga.mjs` sobe o servidor no próprio processo,
  semeia contas e captura seis estados em quatro larguras.
  `test/liga-home.mjs` · S1774–S1797 · **mutantes de navegador: 0** (as
  decisões moram na camada 0 e no servidor; a tela tem uma asserção estática).
- **O que fica:** com conta real, o time do aparelho não chega à conta — a
  aba para em "sem time na conta" até a ST-13.4 (L-211, com o dono). O botão
  "ver replay" nas linhas é da 11.6b.
- **11.6b feita (30/09):** `linhaDoLog` e `provaDaPartida` em
  `partida-dados.mjs` (camada 0, sem motor no caminho), `replayNaTela` em
  `liga-equipe-dados.mjs`; a encenação da jornada (`encenar`) aceita a linha
  pronta, o fim escrito e os rótulos dos lados. `test/liga-replay.mjs` ·
  S1798–S1804 · mutantes de navegador: 0 (a correção do `aplicar` que acha a
  vida máxima pelo slot nos dois lados só aparece no navegador, e não tem
  mutante próprio — registrado aqui). Notas do Q7 que ficaram: o conteúdo trava
  em 1180 px (de propósito: a linha longa separava o resultado do efeito), e
  sem conta a temporada não aparece (a leitura é da conta).

### ST-11.6d · A partida da Liga NA ARENA — 6 contra 6 no palco da aposta ✅ 30/09
- **Origem:** o dono, 30/09/2026: *"a liga de times deveria ter a imagem e
  estilo de jogo da arena dos 6 vs 6 lutando na arena, estilo o da aposta"*.
  Muda a forma da 11.6b (o replay saiu no painel de cartões da jornada), e por
  isso entra antes da 11.6c.
- **Porte** M–G · **Bloco dono** F5.9 · **Spec** §12 tela 27, §9.13 · **Método** GL
  (barra nomeada: *"parece a luta da Arena que o apostador assiste?"*), com
  as capturas da Arena lado a lado com as da Liga.
- **Escopo:**
  - a partida (a que acabou de ser buscada e o replay pelo link) encenada no
    MESMO palco da Arena: o mapa, os sprites, o movimento, o projétil ou o
    jato de cada golpe (ST-5.5), os números de dano (ST-5.4), a queda, o clima
    se houver. Os dois times de seis em lados opostos do mapa, com as cores
    dos lados;
  - a fonte continua o LOG do servidor (`linhaDoLog`). O que se acrescenta é
    uma coreografia na camada 0 que transforma cada evento (quem, em quem,
    golpe, dano, caiu) em quadros do palco da Arena (posição, alvo, efeito).
    A tela só pinta o que ela devolver. Um caminho só: o dano, a vida e quem
    cai são os do log, nunca os do palco;
  - o que já existe fica: a prova ("resultado travado antes da luta —
    conferido"), o selo do fim (contou · subiu/desceu/tier mantido), o
    rótulo do bot, "pular" e "fechar";
  - o painel de cartões deixa de ser o palco da Liga. A jornada continua com
    o dela.
- **Aceite:**
  - identidade: a vida de cada lutador no fim do palco é a do `replayDoLog`,
    golpe a golpe;
  - Q5 nas quatro larguras, com a Arena da aposta ao lado;
  - Q7 cego com a barra acima e as capturas das duas lado a lado.
- **Como (levantamento de 30/09, decisão minha):** o palco da Arena NÃO pode
  ser emprestado como está. Ele lê o `S` global e os ids `#mapCanvas`,
  `#fxCanvas`, `#monLayer`, `#hud` e `#arena`, e a rodada da aposta continua
  rodando por baixo. Pegar o `S` para a Liga quebraria a rodada viva. O
  caminho é o do Avanço, que já reusa os efeitos da Arena fora dela:
  - um palco próprio da Liga, desacoplado, que recebe um alvo e desenha;
  - a PINTURA do mapa da Arena (`arenas.mjs`: a ilha, o anel e o cenário);
  - os sprites PMD e as animações (`sprites.mjs`: parado, andando, atacando
    e levando);
  - o `MOVE_FX` com o carregador `fxSheet` e a cadência do `avanco-efeito`
    (carga, projétil a 420 px/s e jato), e as placas de vida da Arena;
  - a coreografia do evento, na camada 0: quem avança, o tempo do golpe e
    quando o dano cai. É a mesma ordem do `applyEvent` da Arena, só que lida
    do log da Liga.
- **Sabotagem:** o palco tira o dano de outra conta que não o log; o lado do
  jogador trocado; o golpe desenhado em outro alvo.
- **Portões:** Q1 Q2 Q5 Q7.
- **Feito (30/09):**
  - `liga-palco-dados.mjs` (camada 0): a formação (o jogador embaixo), os
    golpes sobrepostos na ordem do log (um começa a cada 620 ms e dura
    1.100), e a POSE de cada lutador como função do tempo (avanço de
    contato, passo de longe, ataque no impacto, o tremor de quem leva, a
    queda, o balanço de quem espera). Também o balão, o mini log, o placar
    de quem está de pé e os impactos entre dois instantes;
  - `liga-palco.mjs` (camada 4): a ilha pela pintura da Arena
    (`pinturaDa`; o `fundo` do mar passou a receber o contexto, e a linha de
    base visual da Arena não mudou), as folhas PMD pré-carregadas, os anéis
    do lado no chão, as placas da Arena em cima, o selo da arena (sorteada
    pela semente da partida), o `MOVE_FX` com o carregador da Arena (carga,
    projétil e jato; estouro procedural na cor do tipo para o golpe sem
    folha), os números `.dmg`, o banner do fim sobre a ilha, e "pular" que
    fica no fim;
  - a partida que a busca acabou de jogar ABRE no palco;
  - `test/liga-palco.mjs` · S1806–S1819.
- **Q7 (barra do dono, com a Arena da aposta ao lado):** 1ª rodada 4–5 (o
  esqueleto da Arena sem o espetáculo). O que entrou por causa dela:
  - golpes sobrepostos;
  - o estouro procedural;
  - o placar vivo;
  - o banner do fim;
  - os anéis soltos do quadro;
  - as folhas pré-carregadas.

  2ª rodada: 6–6,5 ("a mesma família da Arena, mas a versão calma"). O que
  entrou por causa dela:
  - as folhas dos EFEITOS pedidas na abertura (o jato acabava antes de a
    imagem chegar);
  - o número de dano do tamanho da Arena, com contorno;
  - o caído sai da ilha;
  - o nome da placa em branco com contorno;
  - a linha do nocaute que não corta mais.
- **O que fica (registrado, não construído):**
  - nas larguras de 1440 para cima, as laterais do bloco ficam vazias. A
    Arena usa esse espaço com a colocação; na Liga seriam os dois times e o
    log. É acabamento de arranjo, e fica para a 11.6c, que já mexe nessa
    tela;
  - o balão não desvia de outro balão nem de outro lutador. A Arena também
    não desvia;
  - nove balões contra dois: o 6×6 tem metade dos lutadores e a luta é por
    turnos, e isso não se força.

### ST-11.6e · O acabamento do palco da Liga ✅ 30/09
- **Porte** P · **Servidor** não · **Método** GL (a barra: a luta da aposta ao lado) · **Nasce de** L-212 e do Q7 da 11.6d
- **Escopo:** o banner do fim do palco carrega o selo E os pontos da partida
  ("+30 LP"), para a resposta a "o que rendeu" não ficar abaixo da dobra; as
  laterais vazias acima de 1440.
- **Portões:** Q1 Q2 Q5 Q7. **Sabotagem:** o banner sem os pontos, o banner
  com os pontos da partida errada.
- **Posição na fila:** depois da 11.7c — ela é acabamento, e a loja é o gasto
  que a moeda ainda não tem.
- **✅ 30/09.** O fim do replay (`replayNaTela`) carrega os pontos da linha
  ("+30 LP", "0 LP · a defesa não segurou"), e o banner do palco os pinta
  junto do selo — a pergunta "o que eu ganhei" responde no fim da luta, sem
  rolar. A ordem ficou (o palco antes da linha): pôr o resultado ACIMA do palco
  entregaria o desfecho antes da luta, e o pedido do dono é assistir. Acima de
  1600 px a Liga passa a 1520 px de largura (sobravam 700 px em 1920).
  `test/liga-replay.mjs` · S1862. Q5 em 1920 e 420.

### ST-11.7 · Recompensas, League Points e loja ✅ 30/09
- **Porte** M · **Servidor** sim · **Spec** §9.10, §9.11, §10.1
- **Escopo:** recompensas cosméticas e de prestígio pela `cosmetic_ownership`. League Points é a terceira e **última** moeda (§10.1), com tabela e ledger próprios. A loja nunca vende rating ou pontos.
- **Aceite:** League Points nunca convertem em PokéCash; compra idempotente.
- **Portões:** Q1 Q2 Q3 Q6 Q8.
- **Fatiada em 30/09** em três, cada uma fechando com o jogo jogável:
  **11.7a** a moeda (livro, fonte, teto, virada) · **11.7b** o prêmio de
  prestígio da temporada (insígnia por tier, pela `cosmetic_ownership`) ·
  **11.7c** a League Shop na tela, com o saldo e a compra idempotente.
- **11.7a ✅ 30/09 — a moeda.** `engine/pontos-liga.mjs` (puro): quem DESAFIA
  ganha 30/15/10 (vitória/empate/derrota), quem DEFENDE ganha 10 só quando o
  time segura (a conta parada não rende por ser atacada); teto de 200 por dia
  do mundo no que vem de partida; na virada só 10% atravessa (§10.12 sugere
  0–20%) e o prêmio do tier em que a temporada FECHOU entra para quem jogou 5
  ou mais nela (Bronze 50 … Champion 750). Nenhuma taxa, paridade ou "vale X"
  no motor — seria a conversão esperando alguém escrevê-la.
  `server/pontos-liga.mjs`: o livro `liga_pontos` (migração
  `pontos-liga-st11.7a`, só de inserção, `idem` único, `CHECK` no tipo), o
  crédito DENTRO da transação da partida contada (a fora do ranking e a do bot
  não pagam) e a virada DENTRO da virada da temporada, antes do soft reset.
  O arquivo não importa a carteira e não abre transação — as duas ausências
  têm teste. Rota `GET /api/equipe/pontos` (saldo, extrato, regras e prêmios do
  motor); o saldo também sai no `GET /api/equipe/liga`.
  `test/liga-pontos.mjs` · S1826–S1838 (13, todos pegos). S1733/S1758
  continuam ancorados: o crédito entrou numa linha própria.
- **Q6 da 11.7a:** uma rota de leitura, atrás da sessão; nenhuma escrita nova
  vinda do cliente — a moeda só entra pelo servidor.
- **11.7b ✅ 30/09 — os pontos e as insígnias na tela.** A INSÍGNIA da
  temporada (`liga_insignias`, migração `insignias-st11.7b`, só de inserção):
  na virada, quem jogou o mínimo recebe o tier em que a temporada fechou e a
  posição, na mesma régua do prêmio (`temPremio`). **Decisão escrita:** ela
  NÃO é peça da `cosmetic_ownership` — a posse guarda o que se compra ou se
  ganha para USAR; a insígnia não se equipa nem se vende, é o registro do que
  aconteceu. As peças equipáveis da Liga entram pela loja (11.7c). Na tela, o
  cartão "League Points" (camada 0 `pontosNaTela`, as regras vindas do
  servidor): o saldo, os quatro ganhos, o teto, os três últimos lançamentos,
  a virada dita sem conta implícita ("o saldo zera — só 10% passa") e as
  insígnias em hexágono na cor do tier. A cor da moeda é violeta, longe do
  dourado da Arena: duas moedas que nunca se trocam. Cada partida diz o que
  rendeu: "+30 LP", "+10 LP · defesa", "0 LP · a defesa não segurou".
  `test/liga-pontos.mjs` (12) · S1839–S1847.
- **Q5/Q7 da 11.7b:** capturas 1920/1440/1100/420. A 1ª leitura achou a
  insígnia Gold pintada de Bronze (o padrão cobria a classe do tier) e, na
  1100, o nome do adversário por cima dos turnos (o "+LP" alargou a 1ª
  coluna) — os dois corrigidos. O crítico cego (Q1 saldo 8–9, Q2 ganho 6, Q3
  virada 5, Q4 última partida 5, Q5 moeda distinta 6) achou a "Vitória +10
  LP" contra a tabela de +30 (era a DEFESA, e a linha não dizia) e a virada
  que só implicava a perda — corrigidos. Ficou, fora do escopo: a partida que
  a busca acabou de jogar abre o palco e empurra o resultado para baixo da
  dobra e as laterais vazias acima de 1440 — as duas na ST-11.6e (L-212).
- **11.7c ✅ 30/09 — a League Shop.** `engine/loja-liga.mjs` (puro): as duas
  bolas logo acima da comum, escolhidas pela FORÇA (`mult`) e não pelo nome
  (3× por 40 LP, limite 5; 2× por 90 LP, limite 3), nunca a comum e nunca a
  garantida (§P5); e o Doce da Liga (3 por 60 LP, limite 5) de uma linha que a
  conta TEM. **Todo item tem limite por temporada** — sem ele, a Liga viraria a
  torneira de bolas do jogo. `server/loja-liga.mjs`: a compra numa transação
  (débito em `liga_pontos` tipo `compra` + crédito na bolsa, ou no doce com
  motivo próprio `liga` — migração `loja-liga-st11.7c`, a tabela do doce
  copiada como na colecao-st13.3a), a chave do cliente (a mesma chave devolve
  a mesma resposta), o preço só do servidor, a bandeira `league_enabled`, o
  evento `liga_loja_compra`. Rotas `GET /api/equipe/loja` e `POST
  /api/equipe/loja/comprar` (400/404/409). Não importa a carteira. Na tela, a
  faixa "Loja da Liga" embaixo do painel: o ícone do item, o que se leva, o
  que ele FAZ, o limite em compras, "Comprar · 40 LP" no botão e a confirmação
  DENTRO do cartão comprado, dizendo onde o item foi parar.
  `test/liga-loja.mjs` (9) · S1848–S1861. A 1ª versão da migração copiou a lista de motivos da 13.3a e perdeu o `pve` da 13.7 — a suíte pegou (a jornada parou de pagar doce); o teste agora cobra que a lista nova contenha a anterior (S1861).
- **Q5/Q7 da 11.7c:** 1440/1100/420. A 1ª leitura achou o botão escuro (o
  `.btn` vencia por ordem) e o retrato do doce minúsculo (o `dexImg` sem o
  nome caía no ícone reserva; e o sprite estático tem muita borda — entra
  ampliado). O crítico cego (o que compro 5, preço 5–6, limite 4, deu certo
  5–7, doce de quem 4–5) pediu: o verbo no botão, a unidade do limite
  ("compras"), o que o item faz, a confirmação perto do botão e onde o item
  foi — todos feitos. O cartão de pontos em 1100 passou a colunas corridas (a
  grade por posição se desarranjava sem insígnia).
- **Q6 da 11.7c:** duas rotas atrás da sessão; o corpo só escolhe o item, a
  linha e a chave — preço e quantidade são do servidor; a linha é validada
  contra as criaturas da conta.
- **O que fica:** a prateleira de COSMÉTICO da Liga (§9.11), que precisa de
  arte própria — L-213.
- **Mutantes de navegador da 11.7b:** a pintura do cartão
  (`pintarPontos`) é de navegador e não foi plantada; toda decisão está em
  `pontosNaTela`/`linhaDaPartida`, pegas em Node.

### ST-11.7d · A prateleira de cosmético da Liga ✅ 30/09
- **Porte** M · **Servidor** sim · **Método** GL para a arte, INV para a compra · **Nasce de** L-213
- **Escopo:** peças de cosmético EXCLUSIVAS da Liga (molduras e banners de
  temporada, arte nossa) à venda por League Points, gravadas na
  `cosmetic_ownership` com procedência própria; nunca a mesma peça da
  boutique (seria câmbio implícito com a moeda da Arena).
- **Portões:** Q1 Q2 Q5 Q7. **Sabotagem:** a peça da Liga à venda na
  boutique; a peça da boutique à venda na Liga; a compra sem posse.
- **Posição na fila:** depois da 11.6e.
- **Feito:** duas molduras NOSSAS, só da Liga — a **Órbita da Liga** (seis
  luzes violeta girando em volta do retrato, o hexágono dos League Points
  aberto; devagar, porque no banner ela fica horas na tela) e o **Estandarte
  da Temporada** (listras violeta e ouro correndo na diagonal, miolo liso). A
  vitrine ganhou a procedência `liga`: a boutique não as vende (seria câmbio
  implícito entre as moedas), e a loja da Liga as vende por 400 LP, uma vez,
  gravando a posse com `origem = 'liga'` (migração `cosmetico-liga-st11.7d`,
  a tabela copiada com todas as origens — o teste cobra o superconjunto). Na
  prateleira, a peça VIVA com o retrato do jogador dentro. Equipa-se no
  Perfil, como as outras. `test/liga-loja.mjs` (11) · S1883–S1887.
- **Q5:** olhado no CSS real, a 66 px e 38 px, ao lado de Ouro, Aurora,
  Trovão e Campeão. A 1ª Órbita lia como borda tracejada quebrada — virou
  luzes com cauda e brilho. O 1º Estandarte punha as listras ATRÁS do retrato
  transparente (virava estampa) — o miolo ficou liso e a faixa passou a 4 px.
  Na loja, o fundo da prévia apagava as listras — a prévia passou a levar o
  retrato. A diferença nomeada: são as únicas molduras que dizem DE ONDE
  vieram — quem vê uma no banner sabe que ela foi ganha na Liga.

### ST-11.8 · Anti-win-trading, antes do dinheiro ✅ 28/09 (dispositivo e rede esperam a L-050)
- **Porte** M · **Servidor** sim · **Bloco dono** F5.8 · **Spec** §9.12, L-050
- **Escopo:** detectar repetição, forfeits e contas ligadas por dispositivo, rede e horário (o gatilho que a L-050 diz faltar). Ações: cooldown entre adversários e partida inelegível, ambas auditadas.
- **Portões:** Q1 Q2 Q6 Q9 (eventos sem amostragem).
- **Feito:** `engine/integridade-liga.mjs` (puro): REPETIÇÃO (o par 5 vezes ou
  mais em 7 dias), ALTERNÂNCIA (4 vitórias trocando de lado, pela CONTA — os
  lados da gravação não enganam; o empate quebra a corrente) e CONCENTRAÇÃO
  (60% das partidas de uma conta contra um só, com 8 ou mais); o COOLDOWN de
  6 h entre o par. No servidor: o desafio direto recusa a revanche em
  cooldown, e a busca não pareia quem está nele; os sinais contam a partida
  de agora e saem na MESMA transação — a partida com sinal fica gravada e
  revista, FORA DO RANKING (não mexe no Liga MMR), com o registro em
  `liga_sinais` (só de inserção) e o evento `liga_partida_fora_do_ranking`
  inteiro para o operador. O jogador vê que ficou fora, e não os números.
  `test/liga-integridade.mjs` · S1753–S1761.
- **Forfeits:** não existem — a partida é automática, sem desistência. Se a
  ST-11.6 criar "abandonar", o sinal entra aqui.
- **O que fica:** os sinais de DISPOSITIVO e REDE esperam a política do dono
  (L-050); o horário já é o detector da ST-13.6.

### ST-11.9 · Bandeiras de feature no servidor ✅ 28/09
- **Porte** P · **Servidor** sim · **Spec** §15.3
- **Escopo:** tudo que move valor nasce **desligado**, com auditoria. Ligar exige o marcador do §25.1, no padrão do `ARTE_EMPRESTADA_DE`.
- **Portões:** Q1 Q2 Q6.
- **Feito:** `engine/feature-flags.mjs` (puro): o catálogo do §15.3 — quatro
  de produto (ligadas) e seis de VALOR (desligadas) —, `CHECKPOINT_25_1 =
  null` e a regra: ligar valor exige o marcador nomeando um `DEC-##`, desligar
  nunca exige; a linha gravada ligada sem o marcador lê desligada. O teste
  recusa um marcador que não esteja no ROADMAP com o §25.1.
  `server/feature-flags.mjs`: o estado em `feature_flags` (migração
  `bandeiras-st11.9`), a mudança pelo `agir` (papel `dono`, motivo,
  confirmação, registro de/para antes — a recusa fica registrada), e
  `exigirBandeira`. Rotas `GET /api/admin/bandeiras` e `POST
  /api/admin/bandeira` (409 sem o §25.1). `league_enabled` desligada recusa a
  partida e a busca com 503. `test/feature-flags.mjs` · S1762–S1773.
- **Q6:** superfície nova = duas rotas admin, atrás da sessão de operador
  com segundo fator; mudar exige o papel mais alto e confirmação. Sem rota
  de jogador nova.
- **O que fica:** o cliente não lê as bandeiras ainda — a tela que esconde a
  feature desligada é da ST-11.6 (a Liga) e de cada feature de valor quando
  nascer (a ST-11.10 consulta `league_stake_enabled`).

### ST-11.10 · Stake de tier na fila de bônus: o dinheiro ✅ 30/09 (LIGADO em 30/09 pela DEC-16 — moeda simulada)
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
- **✅ 30/09 — construída, DESLIGADA.** `engine/stake-liga.mjs` (puro): o
  stake do tier MAIS BAIXO dos dois (ninguém aposta acima do próprio tier), o
  pot e o rake de 10% do §9.6, o plano só de bônus e competitivo (bônus
  primeiro), e a liquidação — o vencedor recebe o próprio stake de volta
  pelos baldes de onde saiu e o ganho (stake − rake) como BÔNUS; a partida
  fora do ranking é o cancelamento técnico e devolve 100%; **o empate também
  devolve, sem rake** (decisão minha, escrita aqui: não houve vencedor de quem
  cobrar). O teste varre todo tier × resultado: recebido + rake = pot.
  `server/stake-liga.mjs`: a INSCRIÇÃO (`liga_stake_inscricoes` — o defensor
  não está lá na hora, e o consentimento dele existe antes), os portões dos
  DOIS lados antes de qualquer escrita (bandeira com o checkpoint, inscrição,
  pausa `stake_liga` do §28.4, `avaliarAposta` — os limites somam com a Arena
  e o bolo porque a perda cai na mesma janela —, saldo), e a reserva e a
  liquidação DENTRO da transação da partida (a partida passou a usar a
  `emTransacao` da carteira, que aninha). `liga_stakes` só de inserção guarda
  o rake queimado. Tipos novos na carteira: `LEAGUE_STAKE`,
  `LEAGUE_STAKE_RETURN`, `LEAGUE_PAYOUT_BONUS`. Rotas `GET /api/equipe/stake`,
  `POST /api/equipe/stake/inscricao`; `POST /api/equipe/partida` aceita
  `stake: true`. `test/liga-stake.mjs` (9) · S1863–S1874.
- **Q6:** duas rotas novas atrás da sessão e da bandeira (503 desligada); o
  corpo só diz "com stake" — valor, baldes e rake são do servidor.
- **Q8:** a transação é `BEGIN IMMEDIATE` (a da carteira): dois desafios ao
  mesmo defensor ao mesmo tempo serializam, e o segundo lê o saldo que o
  primeiro deixou. Falha no meio (testada com um gatilho que aborta o
  registro) desfaz a partida e o dinheiro juntos.
- **O que fica:** a busca com stake (parear só inscritos) entra com a tela,
  na 11.11.

### ST-11.11 · Stake: a confirmação honesta ✅ 30/09 (no ar desde a DEC-16)
- **Porte** M · **Bloco dono** F5.3 · **Spec** §9.6 (rake explícito antes de confirmar), §28.5
- **Portões:** Q1 Q2 Q5 Q7.
- **Feito:** a BUSCA com stake no servidor — só entre inscritos, e sem
  ninguém na fila ela recusa (409) em vez de cair no bot, que não põe
  dinheiro. Na tela, a seção "Partida com stake" (camada 0
  `liga-stake-dados.mjs`) só existe com a bandeira ligada: o ESTADO da fila
  no alto e grande ("Você ESTÁ na fila com stake — quem te desafiar com stake
  joga valendo contra o seu time publicado, mesmo com você fora do jogo"),
  os quatro números com o líquido ao lado (põe 50 · recebe 90, lucro de 40 ·
  perde 50 · a casa leva 10, 10% do pot, tirado do prêmio), a conta do pot,
  as regras, o saldo por balde, e a CONFIRMAÇÃO que repete tudo numa frase
  antes do clique — com a taxa dentro dela. Os botões que valem dinheiro são
  âmbar, nunca o ciano do "Buscar partida" comum. O lema da aba deixa de
  dizer "sem aposta" quando o stake existe. Cada partida diz o que o stake
  moveu ("+40 de stake", "−50 de stake", "stake devolvido · empate").
  `test/liga-stake.mjs` (11) · S1875–S1882.
- **Q5/Q7:** a bandeira está DESLIGADA de verdade; a captura intercepta só a
  leitura `/api/equipe/stake` no navegador (o servidor não ganha porta). 1ª
  leitura: o "−50" na fonte pixelada parecia um 50 riscado — a perda foi
  para o rótulo. O crítico cego (põe 7, ganha 6, perde 9, casa 8, empate 6,
  risco de apertar sem querer 3–4) achou: a frase de estar na fila como a
  menor da seção, "sem aposta" no lema em cima do stake, o bruto sem o
  líquido, o botão de stake igual ao comum, a confirmação sem a origem do
  dinheiro — todos corrigidos. Ficou: "desconexão/abandono" não existem na
  Liga (a partida é resolvida na hora, sem sessão).

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

### ST-13.1 · Rotas da coleção: criaturas, registro e bolsa ✅ 27/09
- **Porte** M · **Servidor** sim · **Spec** §7.14, §P2 · **Depende de** nada
- **Escopo:** `GET /api/idle` (criaturas, registro, bolsa, estágios) sobre as
  tabelas que `server/idle.mjs` e `criaturas.mjs` já têm; escrita só por
  operação nomeada (nenhum `PUT` do save inteiro).
- **Aceite:** o cliente não consegue escrever criatura, item ou fragmento
  direto; o de outro usuário é invisível.
- **Portões:** Q1 Q2 Q3 Q6.
- **Feito:** `server/colecao-rotas.mjs` · `GET /api/idle` (sessão; o de outro
  invisível) · `OPERACOES_DO_IDLE`, a lista fechada das escritas (vazia) · sem
  semente, sem dono, só o pack carregado · stamina, expedição pronta e estágio
  no relógio do servidor · `test/colecao-servidor.mjs` · S1582–S1589. O save
  local guarda `xp` e golpes escolhidos e o servidor não — as colunas entram
  com as operações da ST-13.3, que é quem as escreve.

### ST-13.2 · A colheita é do servidor ✅ 27/09
- **Porte** M–G · **Servidor** sim · **Spec** §7.14 · **Depende de** ST-13.1
- **Escopo:** expedição e run começam por `POST` (o servidor grava início,
  semente e custo) e se colhem por `POST` idempotente; o servidor recalcula o
  resultado pela semente e pelo relógio **dele**; o teto e a emissão (ST-3.3,
  ST-3.6) valem do lado do servidor.
- **Aceite:** relógio do cliente adiantado não colhe antes; colher duas vezes
  colhe uma; a emissão por jogador-dia bate com a fixture da ST-3.3.
- **Sabotagem:** confiar no instante do cliente; colheita sem idempotência.
- **Portões:** Q1 Q2 Q3 Q4 Q6 Q8.
- **Dividida em três (27/09, na abertura):** o levantamento mostrou que o
  servidor do idle parou no 1.2d — sorteava sem equipe, estágio e foco, e não
  pagava moeda, XP, vínculo, treino nem batalha. Rota sobre aquela colheita
  seria uma segunda regra.

#### ST-13.2a · A colheita é uma conta só ✅ 27/09
- `engine/colheita.mjs` (`contaDaColheita`, pura): o que a colheita paga. O
  cliente (`idle-colheita.mjs`) e o servidor (`server/idle.mjs`) a chamam; o
  `test/colheita.mjs` afirma identidade (30 colheitas, cinco perfis de
  equipe/estágio/foco, a resposta e o que foi escrito, byte a byte).
- Migração `colheita-st13.2a` (aditiva): `criaturas.xp`, `treinado_ate`,
  `expedicoes.estagio`, `resultado_json`, a tabela `encontros_pendentes`.
- O servidor passa a conferir o estágio no início e a medir o teto como o
  cliente (a reserva pelo tamanho da equipe, L-140; o registro, 1.19).
- `creditarTreino` (cliente) removido: sem chamador depois da extração.

#### ST-13.2b · As rotas da expedição e o lance pelo servidor ✅ 27/09
- **Escopo:** `POST /api/idle/expedicao` (iniciar), `POST /api/idle/colher`
  (idempotente: a mesma expedição devolve a resposta gravada), `POST
  /api/idle/lancar` pela CHAVE do encontro pendente — o dex e a raridade vêm
  do banco, e não do pedido (hoje `lancar` os recebe do chamador); um
  encontro, um lance. O relógio é o do servidor.
- **Aceite:** o da ficha acima; e a emissão por jogador-dia do servidor bate
  com a fixture da ST-3.3.
- **Feito:** `POST /api/idle/inicial` (uma vez por conta, só as do pack —
  sem ela a conta nova não tem quem mandar), `/expedicao` (as vagas do
  registro do servidor), `/colher` (a segunda devolve a resposta gravada,
  `repetido`), `/lancar` (`lancarPendente`: a chave, a raiz NOVA do servidor —
  derivar da semente da colheita, que vai na resposta, deixaria saber antes
  qual bola acerta). O relógio é o do servidor em todas; um instante no corpo
  é ignorado. Guardas novas no `iniciar`: a mesma criatura duas vezes, e
  quem já está em campo. `GET /api/idle` passa a listar os pendentes.
- **A emissão:** um dia de 36 h com raízes fixas — o servidor e o aparelho
  aceitam e recusam as MESMAS saídas (5, com recusas de teto e stamina) e
  terminam com a mesma bolsa e os mesmos encontros no teto. Como a fixture da
  ST-3.3 é medida pelas funções do aparelho, bater com o aparelho é bater com
  ela. `test/colheita-rotas.mjs` · S1601–S1612.

#### ST-13.2c · A run do Avanço no servidor — dividida (27/09) ✅
A luta da jornada saiu daqui: ela precisa do time de seis e dos golpes
escolhidos, que o servidor só terá com a ST-13.3 — virou a **ST-13.7**.

##### ST-13.2c1 · A run é uma conta só ✅ 27/09
- `app/modules/avanco-conta.mjs` (camada 0): `runComecada`, `runNoInstante`,
  `runCurada`, `contaDaRun`, `equipeDoMotor`. O aparelho (`avanco-estado.mjs`,
  593 → 343 linhas) e o servidor (`server/run.mjs`) chamam as mesmas.
- Migração `run-st13.2c1`: a tabela `runs` (uma ABERTA por conta, pelo índice
  parcial) e `encontros_pendentes` com a origem (`expedicao` | `avanco`).
- O servidor avança a run a cada pedido que a toca, e ANTES de toda escrita
  que muda o que ela lê (a colheita de uma expedição treina quem está nela);
  o teto conta a run aberta e a colhida; "ocupada" vale nos dois sentidos.
- Diferença escrita: o aparelho deixa começar outra run por cima de uma
  terminada e não colhida (o saque some); o servidor recusa e manda colher.
- `test/run-servidor.mjs`: 20 runs (caiu, limpou, recuou, com poção), sete
  no mesmo dia, e a expedição colhida no meio da run — iguais a cada passo.
- Achados: **D-127** (o clima nunca vale no Avanço) e **D-128** (a reserva da
  run conta duas vezes), dona a nova **ST-2.5**.

##### ST-13.2c2 · As rotas da run ✅ 27/09
- **Escopo:** `POST /api/idle/run` (começar), `/run/pocao`, `/run/recuar`,
  `/run/colher` (idempotente: a colhida devolve a resposta gravada); o `GET
  /api/idle` avança e devolve a run; o lance aceita os pendentes da run.
- **Portões:** Q1 Q2 Q3 Q6 Q8.
- **Feito:** as quatro rotas em `OPERACOES_DO_IDLE`; o corpo traz a intenção,
  e raiz, instante, wave e contrato do teto são do servidor; a leitura avança
  a run e a devolve com a raiz (o aparelho encena as waves a partir dela — o
  que ela decide já estava decidido; o saque sai da raiz da colheita);
  `test/run-rotas.mjs` · S1628–S1632.

#### ST-13.7 · A luta da jornada no servidor (L-208) ✅ 28/09
- **Porte** M · **Servidor** sim · **Depende de** ST-13.3 (o time e os golpes)
- **Escopo:** a luta de nó é refeita no servidor pela semente dele, com o time
  que o servidor conhece; o progresso da jornada e a recompensa PvE passam a
  ser do servidor; `ginasio_vencido` e `pve_iniciado` deixam de vir do
  cliente e passam a nascer da luta (fecha a **L-208**).
- **Portões:** Q1 Q2 Q3 Q6 Q9.
- **Feito:** `app/modules/jornada-conta.mjs` (camada 0): `contaDaLuta` (a luta,
  o progresso e o que ela credita, sem gravar) e `chanceDaLuta` (a chance da
  tela, pela mesma raiz — `RAIZ_DA_CHANCE`, que a tela passou a importar). O
  aparelho (`jornada-local`) e o servidor (`server/jornada.mjs`) chamam as
  mesmas. Migração `jornada-st13.7`: `jornadas` (o progresso, com a revisão),
  `lutas_jornada` (cada luta pela chave do pedido, com a semente do servidor)
  e o livro do doce com o motivo `pve`. `POST /api/idle/jornada/lutar` (o nó,
  o preset e a chave; a semente do corpo é ignorada); `GET /api/idle` traz a
  jornada. Os fatos `pve_iniciado` e `ginasio_vencido` nascem da luta com
  `origem: 'servidor'` e chave própria (`srv:`), e a chance vai junto,
  refeita pelo servidor — a calibração do §8.15 deixa de depender do número
  que o cliente declara. O gate da V4 prefere o fato ao relato, por jogador e
  por nome (`fatosDaJornada`), e diz quantas lutas são de cada lado.
  `test/jornada-servidor.mjs` (12 lutas iguais nos dois lados, com repetição,
  fora de ordem e virada do dia; o reenvio; a revisão; os fatos; o chefe) ·
  S1662–S1679; S1472, S1478, S1515, S1523 e S1546 realvados para a conta.
- **O que fica para a ST-13.5:** o aparelho de quem tem conta passar a lutar
  pela rota (hoje ele ainda luta no save e RELATA); aí `pve_iniciado` e
  `ginasio_vencido` saem da lista `DO_CLIENTE` e a L-208 fecha inteira.

### ST-13.3 · XP, evolução, golpes e doce como operações — dividida (27/09) ✅
O levantamento achou seis operações (caixa, soltar, foco, golpes, evolução,
doce), cada uma com a identidade contra o aparelho; e o doce mexe no livro
do servidor. Três partes:

#### ST-13.3a · Caixa, soltar e foco ✅ 27/09 (fecha a L-210)
- `app/modules/colecao-regras.mjs` (camada 0): o teto de seis, a equipe
  nunca vazia, a ordem da troca e quem pode ser solto — o aparelho
  (`idle-dados`, `time-local`, `doce-dados`) e o servidor perguntam ali.
- Migração `colecao-st13.3a`: `na_caixa` (quem passava de seis ativas vai
  para a caixa pela ordem de chegada), `foco_em`, `descansa_ate`; o livro do
  doce aceita `soltar` e `uso`.
- `server/colecao.mjs` + `POST /api/idle/mover`, `/trocar`, `/soltar`,
  `/foco`; a captura com a equipe cheia cai na caixa; a expedição e a run
  recusam quem está nela. `test/colecao-ops.mjs` · S1633–S1642.

#### ST-13.3b · Golpes e evolução ✅ 27/09
- **Escopo:** o moveset escolhido (`golpes`, `exclusivos`) e a evolução (com
  o item consumido e os exclusivos que vão junto) como rotas, pelas funções
  do aparelho (`moveset-dados`, `evolucao-idle`); identidade.
- **Feito:** `POST /api/idle/golpe` e `/evoluir`, pelas funções do aparelho;
  migração `golpes-st13.3b` (os golpes escolhidos e os exclusivos guardados);
  **a pedra consumida desceu da tela para a camada 0** (`aplicar` diz o que
  consome — a regra morava na `idle-tela`); o furo do golpe vazio no
  `movesetValido` fechado (o `find` devolvia o próprio vazio). `test/colecao-ops`
  · S1643–S1648.

#### ST-13.3c · Dar doce ✅ 27/09
- **Escopo:** gastar o doce da linha no servidor (motivo `uso` no livro), a
  mesma regra do `darDoce`; e o que muda no resgate quando o servidor é a
  fonte (o doce deixa de descer ao aparelho de quem tem conta — a ST-13.5).
- **Feito:** `usoDoDoce` (camada 0, em `doce-dados`) decide; `POST
  /api/idle/doce` gasta do saldo da conta com a guarda na cláusula e a chave
  do pedido no livro (`uso:<conta>:<chave>` — o reenvio devolve o que o
  primeiro gastou); a linha nunca vem do corpo. `test/colecao-ops` ·
  S1649–S1653. O resgate que desce o doce ao aparelho fica como está até a
  ST-13.5, que decide quem é a fonte com conta.

### ST-13.3 · (a ficha original) ✅ 27/09, pelas 13.3a–c
- **Porte** M · **Servidor** sim · **Depende de** ST-13.2, ST-9.9, ST-9.10, ST-9.12
- **Escopo:** dar doce, evoluir, trocar golpes e soltar viram rotas; a regra é
  a mesma função da camada 0 que o cliente usa (um caminho só).
- **Aceite:** o resultado do servidor é idêntico ao do cliente para as mesmas
  entradas (teste de identidade de referência).
- **Portões:** Q1 Q2 Q3 Q6.

### ST-13.4 · A conta começa do zero no banco (DEC-17) ✅ 30/09 (na ST-13.5e)
- **Porte** S · **Servidor** sim · **Depende de** ST-13.3
- **Decisão do dono, 30/09 (DEC-17):** *"Esqueça os saves locais, tem que ter o
  banco com informações de quem cadastrar, quem já tinha perde."* Não há
  importação: ao cadastrar, a conta nasce com o idle novo do servidor, e o save
  do aparelho de quem já jogava sem conta NÃO sobe. A recomendação antiga
  (importar uma vez com teto) foi descartada.
- **Escopo:** nenhuma rota recebe o save local; o cadastro diz, uma vez, que o
  progresso de antes do cadastro fica no aparelho e não vai para a conta.
- **Portões:** Q1 Q2 Q6.
- **Feito na 13.5e:** nenhuma rota recebe o save (a leitura da conta substitui a
  coleção do aparelho, `idleDaConta`); o cadastro mostra o aviso da perda em
  linha própria, só a quem tem coleção no navegador (`avisoDaPerda`); o Sair
  apaga o cache da coleção da conta. Q6: sem superfície nova.

### ST-13.5f · A luta da jornada é fato do servidor (L-208) ✅ 01/10
- **Escopo:** com a jornada na conta (ST-13.5e), quem luta é o servidor, e ele
  anota `pve_iniciado` e `ginasio_vencido` com `origem: 'servidor'`. O aparelho
  seguia relatando os mesmos dois eventos, e o servidor os aceitava — a conta
  podia declarar a vitória que o servidor já sabia. Os dois saem de
  `DO_CLIENTE` (fica `p_exibida`: só a tela sabe o que mostrou), e a tela deixa
  de chamar `relatarLuta`. Os relatos antigos no banco continuam lidos pelo
  gate, com o fato preferido (`fatosDaJornada`).
- **Testes:** `gate-v4` — o cliente só declara a chance; o servidor recusa
  luta, ginásio e time refeito vindos do aparelho (0/4) e o gate lê o que ele
  anotou. **Q2:** S2430 (o aparelho volta a declarar) e S1573 realvo; S1576
  removido (mordia a chamada que saiu).

### ST-2.6 · A tela do idle organizada (pedido do dono) ✅ 01/10
- **Por quê:** o dono, olhando a captura: *"esse formato como tá, tá feio,
  desorganizado"*. Parte do que ele viu é a captura de página inteira, que
  pinta de branco tudo abaixo da primeira dobra (L-166); o resto era real: a
  coluna da equipe esticada com ~500 px vazios, o time em 4 + 1, a mochila em
  fichas serrilhadas na ordem do id e uma faixa de cartão vazia (o saque).
- **Feito:** a coluna da equipe é uma pilha (equipe, em campo, Centro) e as
  colunas não esticam; o time da Rota em 3 colunas; a mochila em grade de
  duas colunas, na ordem do catálogo (`posicaoNaBolsa`, camada 0), com o nome
  inteiro e a contagem na margem; o saque vazio some (`:empty`).
- **Testes:** `idle-arranjo` (4) · S2434–S2440. **Q5:** as quatro larguras,
  em `tools/previas/_idle-arranjo/`. **Q7:** dispensado (DEC-20).

### ST-2.7 · O idle em tela larga (L-229) — proposta
- Se o vão embaixo da bolsa incomodar o dono, "Quem apareceu" vai para a
  coluna da direita acima de 1200 px. Espera o olhar dele na ST-2.6.

### ST-2.8 · O jogo no celular (pedido do dono: "tá feião p celular") ✅ 01/10
- **Por quê:** o dono abriu o piloto na AWS pelo telefone. Medido em 412 × 915
  (Android médio): o menu de dez abas quebrava em três linhas e o topo comia
  ~200 px de TODA aba; nas Rotas, a cena em 3× era um close que cortava a
  cabeça do treinador — *"essa imagem da floresta tá muito perto, tá ruim"*;
  e os cartões de rota deixavam um terço da linha vazio.
- **Feito:** até 640 px o menu desce para uma BARRA NO RODAPÉ (Arenas, Liga,
  Rotas, Time + "Mais"), com ícones em máscara (pintam com o token do tema); a
  folha do "Mais" guarda Início, Rota OFF, Pokédex, Wiki, Como funciona e
  Regras, e o botão VESTE o nome da aba aberta quando ela mora lá
  (`barra-celular.mjs`, camada 0). O topo cabe numa linha (marca + sessão) e a
  marca leva ao Início. A cena das Rotas abre em 1× no celular quando o jogador
  não escolheu zoom (`zoomDePartida`, camada 0); a escolha dele continua
  valendo. As rotas em duas colunas cheias. No largo nada muda: a folha é
  `display:contents` e o Início volta à frente por `order`.
- **Testes:** `barra-celular` (7) · S2495–S2505, todos PEGOU. Mutantes de
  navegador: 0 — a decisão mora em camada 0 e o CSS é afirmado em Node.
  **Q5:** `node tools/olhar-celular.mjs` (emulação 412 × 915, toque, 2,6×),
  cada aba e a folha aberta, em `tools/previas/_celular/`; sem vazamento
  lateral e sem erro de página. **Q7:** dispensado (DEC-20).

### ST-2.8b · Sem conta, o menu é a vitrine (pedido do dono) ✅ 01/10
- **Por quê:** *"o menu você já pode fazer tudo, mesmo sem se cadastrar — muitas
  dessas coisas só podem aparecer e a pessoa ter acesso após o cadastro."*
- **Feito:** `ABAS_COM_CONTA` e `abaLiberada` (camada 0, `barra-celular.mjs`):
  Liga, Rotas, Time, Rota OFF e Pokédex são do treinador. Sem conta elas somem
  do menu (`.mainnav.visitante`), e qualquer caminho até elas (botão, link
  `data-goto`) abre o cadastro em vez da tela. No celular as cinco da vitrine
  ocupam a barra e o "Mais" some. A Arena fica aberta: é o espetáculo, e é ele
  que faz alguém querer entrar.
- **E a conta é sempre a de verdade no site** (o dono: *"não pode ser opcional
  — preciso criar login, nome do treinador, e-mail e senha"*): fora do
  `localhost`, o cadastro é sempre o do servidor (nome, e-mail, senha,
  nascimento, a declaração) — um `/saude` que falha já não vira a fachada de
  PIN opcional, e um PIN de fachada velho no navegador não conta como conta
  (`exigeContaReal`, `modoDaConta` em `conta-real.mjs`, camada 0). A fachada
  segue no `localhost` sem servidor, que é onde se desenvolve e testa.
- **Testes:** `barra-celular` · `conta-real` · S2506–S2512. As sondas visuais que abrem as
  Rotas entram como quem tem conta (`ar_session`), e a linha de base visual foi
  regravada: o menu de visitante perdeu cinco botões.

### ST-2.8c · No site, o visitante só assiste (pedido do dono) ✅ 01/10
- **Por quê:** *"convidado não tem que testar nada, no máximo ver a batalha lá
  rolando, sem poder apostar"* — e a Wiki sai da vitrine também.
- **Feito:** `soAssiste` (camada 0, `conta-real.mjs`): no site, sem conta, o
  `body` ganha `soAssiste` — some o cartão da aposta, o bolo, os controles da
  rodada, o saldo e o banner do jogador; entra o cartão "Assistindo" com o
  botão de criar o treinador; tocar num lutador abre o cadastro e `placeBet`
  recusa por baixo; o aviso no palco diz "a próxima luta começa sozinha · crie
  o seu treinador para apostar" (`textoDoAviso({ assistindo })`); em coluna
  única a arena vem primeiro em toda fase. As rodadas seguem sozinhas (o Auto
  nasce ligado). Menu do visitante: Início, Arenas, Como funciona, Regras. No
  `localhost` sem servidor segue apostável sem conta — é onde se testa.
- **Testes:** `conta-real` · `barra-celular` · `aposta-legivel` · S2513–S2518.
  **Q5:** o site num nome não-local (`--host-resolver-rules`), celular e
  largo — lido. E o D-140 (o `limites` instável) corrigido no caminho.

### ST-2.10 · Rotas: o boneco vira, o relógio do próximo selvagem, a stamina que não é vida ✅ 01/10
- **Por quê (o dono, pelo telefone):** *"o boneco não caminha, fica de costas
  se movimentando, não vira de frente"* · *"não tem o tempo de cada volta, pra
  saber quando os pokémons vão aparecer"* · *"o life do lado aparece 100, o
  life no pokémon 92, não conversam"*.
- **Feito:** a folha do traje padrão reordenada (D-141). `proximaEntrada` no
  retrato da cena (`engine/run-avanco.mjs`) e a linha do cabeçalho
  (`avanco-relogio.mjs`, camada 0): "próximo selvagem em 0:07 · a wave termina
  em 1:12", "⚔ selvagem em campo", "selvagem chegando". No celular a run abre
  com a cena, o relógio e a tira das waves — antes eram três painéis de número
  na frente. Fora da run, um botão GRANDE na própria cena — "⚔ Iniciar
  batalhas" — começa a run pelo mesmo caminho do de baixo, e quando não dá diz
  o porquê (o dono: "de início fica andando, preciso clicar em avançar... tem
  que ter um botão grande na tela, iniciar"). A stamina ganhou ⚡, cor âmbar e a frase "a vida na luta é o HP".
- **Testes:** `outfit-folhas` (novo, 3) · `run-avanco` (+2) · S2519–S2526.
  **Q5:** o passeio em 16 quadros (o boneco de perfil, a perna andando, virando
  para os dois lados), a run no celular e no largo — lidos.

### ST-2.11 · As placas da run não se sobrepõem (L-232) — proposta
- Três atores juntos ainda empilham as placas; o `separarPlacas` precisa
  cobrir o trio.

### ST-2.12 · O começo do treinador: o kit, as barras que se mexem, a stamina que volta ✅ 01/10
- **Por quê (o dono):** *"onde vejo meus itens? devia começar com pokébolas,
  não?"* · *"onde tem barra de XP do pokémon?"* · *"a stamina reduz quando? isso
  tá funcionando? cuidado pra não ser muito lenta essa regeneração"*.
- **Feito:** o kit de quem começa (`pack.kitInicial`: 10 Poké Balls, 3 Poções)
  — com conta, o servidor credita ao escolher a inicial, como presente
  (`promotional_bound`, fonte `kit-inicial`, uma vez por conta; quem escolheu
  antes recebe na próxima leitura); sem conta, direto na bolsa. Na run, a
  stamina e o XP aparecem como a colheita vai gravar (`avanco-barras.mjs`,
  camada 0): a stamina menos o custo das waves alcançadas, e uma barra de XP
  azul com "+14 XP nesta run · faltam 4 para o nv 2" — antes as duas ficavam
  paradas até o fim. A regeneração foi a 20/h (DEC-24). Embaixo da cena, "🎒 na
  bolsa: 10 Poké Ball · 3 Poção — ver tudo ↓" leva ao cartão da bolsa
  (`bolsa-resumo.mjs`, camada 0).
- **A captura conferida** (o dono: *"todos estão sendo capturados de primeira"*):
  medida pelo caminho inteiro do servidor, 300 lances por par — comum + Poké
  Ball 44,7% (chance 45%), incomum 28,6% (28%), raro 13,8% (14%), comum + Ultra
  85,5% (teto 85%). A tela mostra o resultado do servidor. Não há defeito; com
  uma Great Ball (67,5%), pegar 4 de 4 acontece ~1 vez em 5. O teste com raízes
  fixas fica no `comeco-treinador`.
- **Testes:** `comeco-treinador` (novo, 9) · `expedicao` (o caso de 5 h virou 3
  h: em 20/h, 5 h bate no teto) · S2527–S2537, todos PEGOU. Quatro testes antigos
  supunham a bolsa nova vazia: `run-rotas` passou a usar a Super Poção (que o kit
  não dá), `colecao-servidor` e `idle-acoes` contam o kit, `e14-cliente` lê sem
  o kit (o teste é da ordem dos lotes); `colheita-rotas` remediu as saídas do dia
  (5 -> 4, pela regeneração nova). **Q5:** a escolha e a
  run no celular e no largo — lidas.

### ST-2.13 · A forma evoluída só se pega no estágio do nível dela ✅ 01/10
- **Por quê (o dono):** o time de um amigo que acabou de começar — Machoke NV1,
  Pidgeotto NV4, Butterfree NV5 — *"pokémons já evoluídos, mesmo com level
  baixo, avançando rápido dos treinadores, acho que não tá tão equilibrado"*.
- **Medido:** em toda rota os dois chefes do estágio 1 são segundas formas
  (Machoke, Graveler, Wartortle, Dragonair...), 25 das 66 espécies do estágio 1,
  e o encontro que a vitória deixava era o próprio chefe. A expedição do estágio
  1 também sorteava evoluídas em todas as 11 rotas.
- **Feito (camada 0, `engine/estagios.mjs`):** cada estágio é uma FAIXA de
  níveis, da porta dele até a porta do seguinte (1–12, 12–19, 19–31, 31+), e a
  forma só se pega no estágio cuja faixa alcança o nível em que ela evolui
  (`nivelParaExistir`; pedra e troca valem 25). No 1, só as larvas de inseto
  (evoluem no 7–10); no 2, as do meio (16–18); no 3, as tardias e as de pedra;
  no 4, todas. **Na run** o chefe evoluído continua na LUTA (a dificuldade é
  dele) e no registro, mas a vitória deixa a forma do estágio
  (`formaDoEstagio`: Machoke → Machop) — a contagem de encontros fica, que é
  economia medida. **Na expedição** a forma fora da faixa sai do elenco; a
  prévia e o sorteio leem a mesma linha.
- **A primeira versão foi descartada pela medição:** exigir a PORTA do estágio
  (nível 1 no estágio 1) esvaziava a expedição — a praia do estágio 3 caía de
  16 espécies para 2 e o oásis de 24 para 4, porque as raras dos estágios fundos
  SÃO formas evoluídas. Pela faixa: praia 16 → 10, oásis 24 → 17.
- **O preço, dito:** praia, gelo, oásis e ferro-velho ficam sem incomum no
  estágio 1 — o Vigia lá garante a faixa mais rara que sobrou. O texto do foco
  passou de "um raro garantido" para "o mais raro da rota garantido", que é o
  que o motor sempre fez. A banda da antifraude foi remedida (o casual do
  estágio 3 3,64 → 3,69 capturas/dia; o maratona 16,99 → 17,1; teto 21,3 →
  21,4). As evoluídas que já estão em times ficam como estão.
- **Junto (o dono: "só avança se atualizar a página"):** não reproduziu com o
  servidor — começar, virar de wave, sair e voltar da aba e recarregar
  funcionam. O provável é a criatura escolhida estar numa expedição ("EM CAMPO"
  no print), que desliga o início com um recado vago; o recado agora diz "já
  está numa expedição da Rota OFF — recolha lá, ou tire-a da equipe".
- **Testes:** `forma-estagio` (novo, 6) · `captura` §28 passa a exigir TODAS
  as espécies do estágio (o "mais de 15" deixou de caber: o campo do 1 tem 15) ·
  `antifraude` remedida · S540 realvo · S2538–S2543, todos PEGOU.
- **Fica para depois (L-233):** a criatura capturada nasce no nível 1 mesmo
  sendo uma forma do estágio 3.

### ST-2.19 · O primeiro teste de um jogador: arte, primeira tela, textos ✅ 01/10
- **Por quê:** o relato do dono depois de jogar como um jogador novo (conta
  `Poke`): o visual e a Floresta na chuva aprovados; e cinco coisas a melhorar.
- **a · a arte que faltava (D-143):** os sprites GBA brilhantes nunca entraram
  em `assets/` — Vaporeon e Kingler brilhantes iam buscar fora e a CSP
  bloqueava. O baixador pede a variante (mesmo repositório, `shiny/`); 146
  baixados e versionados. O ícone da aba: um anel neon embutido (SVG em
  `data:`), sem tema — o navegador pedia `/favicon.ico` e levava 404.
  `battle-theme.mp3` e `lojas.mp4` seguem na L-176: são arquivos do dono,
  e o resgate busca o MESMO arquivo, nunca outro.
- **b · a primeira tela:** com sessão e sem criatura — ou logo depois do
  cadastro — o jogo abre nas Rotas, na escolha do inicial
  (`abaDeAbertura`, `conta-real.mjs`), e não mais na Arena com rodada e aposta.
- **c · os textos:** a regra 10 dizia "não há servidor, não há e-mail" — agora
  diz o que o site faz (conta no servidor: nome, e-mail, senha só como hash,
  nascimento; propaganda só com autorização) e o que vale sem servidor; a
  Início não promete mais "nada de e-mail"; o aviso do cadastro nasce com o
  texto do site; "Aposte na arena. Assista à batalha." com espaço; "A rota —
  onde você vai lutar — escolha antes de gastar as horas"; "Mercado" no lugar
  de "Market" e "Treino OFF" no lugar de "Trainer OFF".
- **Testes:** `primeira-aba` (novo, 3) · `textos-site` (novo, 6) · `assets`
  (+2) · `retorno` e `rota-off` ajustados · S1402 realvo · S2562–S2568 PEGOU.
  **Q5:** cadastro real → a tela "Escolha a sua primeira"; com inicial, a
  abertura segue a de antes.
- **Fica (L-235):** a densidade para quem chega — dez abas e páginas longas.

### ST-2.26a · O time aprende junto, e o teto não zera a run (D-148, DEC-27) ✅ 02/10
- **Por quê (o dono, 30 min de progressão):** *"só quem está em campo sobe de
  nível; o Kakuna e o Bellsprout ficaram parados no 7 e no 5, e nenhum inseto
  chega ao nível 10 pra evoluir"*; *"a Jornada tem outro paredão: o Rival da
  Rota 22 aparece com menos de 1%"*; *"o limite diário de encontros zera a run
  sem avisar: +2 XP e nenhuma moeda"*; e o aviso de versão nova não apareceu.
- **Medido:** o time do dono hoje contra o Rival (9/9): 2%. O MESMO time com o
  Kakuna evoluído (Bulbasaur 10, Beedrill 10, Bellsprout 7): 99%. O paredão era
  o banco não aprender — o Rival fica como está (DEC-25).
- **Feito:** (1) o banco aprende metade do XP da run (`XP_DO_BANCO`, sem
  stamina, sem vínculo; a caixa não); (2) D-148: o XP da run é dos encontros
  vistos, valendo para o teto ou não; a moeda segue a calibrada (DEC-27); a
  tela da run e a frase do fim dizem o que o teto tira; (3) a aba pergunta a
  versão à `/saude` a cada 3 min e ao voltar para ela.
- **Fixtures regravadas (medição):** `emissao-idle` — XP/dia do diário 482,9 →
  1.434,9 (estágio 1) e 727,1 → 1.441,1 (estágio 3); do maratona 1.180,7 →
  14.759 e 1.460,6 → 14.801; a moeda do maratona 1.535,57 → 1.549,43 e os
  drops dele um pouco acima (as criaturas sobem e o simulador muda de
  estágio). `antifraude` — a banda do maratona no estágio 1: 17,1 → 16,44
  capturas/dia, 26,57 → 25,43 encontros.
- **Testes:** `time-aprende` (novo, 3) · `run-fim` (+1) · `run-fantasma` (+1) ·
  S2610–S2614 PEGOU (linha de base verde conferida); S2583 realvo.
- **Fica para a ST-2.26b:** o chefe que "empaca" na wave 10 e o 400 em
  `/api/idle/mover` (investigação em curso).

### ST-2.25 · O que o olhar do dono achou no guia (D-147) ✅ 02/10
- **Por quê (o dono, conferindo a ST-2.24):** o aviso de versão nova e o
  potencial batendo entre Time e Rotas funcionaram; e seis coisas não.
- **Feito:** (1) "abrir a Loja das Rotas" ABRE a Loja e "ver o Centro" ROLA até
  ele (`clica`/`rola` no item do guia; a tela faz depois de navegar); (2) os
  tipos no Time com espaço ("Planta Venenoso"); (3) o botão "ficha" saiu de
  dentro do título da equipe — nas Rotas e na Rota OFF ("…a stamina é da
  criatura compacto"); (4) o Início diz "nome, e-mail, senha e data de
  nascimento"; (5) o guia em português: a run e a stamina explicadas na
  primeira vez, e a frase de quem luta reescrita — a troca de "odds"/"pool"/
  "buff" por termos em português foi DESFEITA pela DEC-26 (02/10); (6) a janela do "💵" do topo
  (que é a de comprar, e não a carteira) ganhou a linha do papel da moeda e o
  caminho para o guia.
- **D-147, achado no Q5:** o "?" do potencial era botão dentro do cartão-botão;
  o navegador partia o cartão e o "→ caixa" passava a abrir o guia (nascido na
  ST-2.24). E o quadro "quem apareceu" vazio aparecia como um cartão vazio.
- **Não reproduzido:** as falhas de conexão em `/api/sala` e
  `/api/mercado/resultado`. Em produção as duas respondem (401 sem sessão, o
  esperado); no servidor local, 45 s de Arena sem nenhuma falha. O provável é
  o "Recarregar": os pedidos em voo são cortados na troca de página, e o
  navegador os anota como falha.
- **Testes:** `guia` (+4) · S2603–S2609 PEGOU; S2602 e S2438 realvos. **Q5:**
  guia → Loja aberta, guia → Centro visível, cartão inteiro, tipos com espaço,
  títulos limpos, a linha na janela de compra; sem pageerror. **Mutantes de
  navegador:** 1 não plantado (o clique/rolagem depois de navegar).
- **Lição do arnês:** a sabotagem do S2438 voltou "PEGOU" com a suíte vermelha
  ANTES do plantio (eu tinha juntado duas regras de CSS); a sonda manual não
  confere a linha de base. Registrado para o T-dono do arnês (L-241).

### ST-2.24 · O guia: o que cada coisa faz (L-236) ✅ 02/10
- **Por quê (o dono):** *"os nomes foi decisão nossa, talvez só tenha que ficar
  mais claro o que cada uma faz; não vi direito a parte dos [bichos], IVs etc.,
  o mercado entre jogadores etc."*
- **Olhado antes (Q5):** "Como funciona" explicava só a aposta da Arena; o
  Mercado abria num formulário de busca sem uma frase; "potencial" era 68/100
  nas Rotas e 6 no cartão do Time (a parte dele no poder); "Minha Coleção" não
  lista criatura nenhuma (L-240).
- **Feito:** `guia-dados.mjs` (camada 0) monta o guia do jogo inteiro — as duas
  moedas (e o PC-T: de onde vem, para que serve), as Rotas, a criatura
  (nível, potencial 0–100 como soma dos seis valores escondidos, forma,
  natureza, ✦ exemplar, brilhante, e a parte do potencial no poder), a Jornada
  e o Time, as Trocas, o Mercado e a Arena —, cada seção com "ir para" que abre
  a vista NA aba certa. Os nomes saem do pack e os números das constantes das
  regras (taxas, PC-T da jornada, portas, exemplar). `guia-tela.mjs` pinta.
  "?" que levam ao guia: o potencial do Centro, a linha do papel da moeda na
  bolsa, a carteira e o topo do Mercado (que agora diz o que é, em que se paga
  e quanto custa). O cartão do Time: "poder 111 = nível 10 · espécie 53 ·
  golpes 42 · potencial +6 (59/100)". O passo a passo da Arena fica abaixo.
- **Testes:** `guia` (novo, 4) · S2597–S2602, todos PEGOU. **Q5:** o guia em
  1440 e 420 (lido); guia → Mercado abre na aba Mercado, guia → Jornada na
  Jornada, os "?" do Mercado e do Centro caem na seção certa; sem pageerror.
  **Mutantes de navegador:** 1 não plantado (a chave da aba lembrada em
  `guia-tela.mjs` — só o clique a vê; coberto pela sonda do Q5).
- **Fica:** L-239 (o ✦ é exemplar nas Rotas e brilhante no Mercado) e L-240
  (Minha Coleção sem a lista das criaturas), as duas na ST-2.20.

### ST-2.23 · A curva do começo (L-233) ✅ 01/10
- **Por quê (o relato do dono, 26 min focado em progressão):** *"o Bulbasaur
  está só no nível 4, nada evoluiu e não cheguei a nenhum chefe; o próximo nó
  da Jornada (Floresta) mostra 0%; não tem nada pra fazer a não ser repetir as
  mesmas rotas"*. Sugestões dele: guardar XP na falha (já era assim — o D-146
  era a tela), dividir o XP ou fazer o capturado nascer num nível parecido com
  o da rota, e um degrau entre o nó 1 e a Floresta.
- **Medido antes:** o inicial sozinho perde a Floresta até no nível 10 (0,2%);
  o Bulbasaur 7 com dois do nível 5 vencia em 16%; e as capturas do estágio 1
  nasciam no nível 1 — com elas, 0% em qualquer nível do inicial.
- **a · a luta ensina:** a primeira vitória da jornada dá, a cada um que
  lutou, 6 XP por nível do rival (Rota 1: 30; Floresta: 96; Brock: 156 — uma
  run inteira rende ~100); a repetição, 10%; a derrota, nada. O fim da luta
  diz "+96 XP para cada um que lutou". Com e sem conta.
- **b · a captura nasce no estágio (L-233):** dois níveis acima da porta do
  estágio onde foi pega (1: nível 3; 2: 14; 3: 21; 4: 33), nunca abaixo do
  nível em que a forma existe (o Metapod do estágio 1 nasce no 7). O estágio
  vem do encontro (a run guarda o dela; a expedição, o dela). Das duas leituras
  da L-233, a do meio: nascer na porta seria o nível 1 de novo no estágio 1.
- **c · o degrau:** a Floresta passou de 6/6/7 para 5/5/6. **Não** entrou um nó
  novo entre a Rota 1 e a Floresta: o mapa é desenhado à mão por nó (ST-10.23),
  e o salto se fechou com a régua acima. "Dividir o XP com o banco" ficou de
  fora pelo mesmo motivo — a captura nascendo no estágio já resolve o
  "capturados não acompanham".
- **Medido depois (a Floresta):** Bulbasaur 7 + Pidgey 5 + Rattata 5: 16% →
  82%; Bulbasaur 6 + Kakuna 7 + Metapod 7 (como nascem agora): 91%; Squirtle 6
  + dois do 4: 43%; o inicial sozinho no 6 segue abaixo de 10% (o degrau não
  virou atropelo, DEC-25). O Rival da Rota 22 segue em 0% para esses times — é
  o degrau seguinte, que a XP da Floresta (+96 a cada um) começa a pagar.
- **Testes:** `curva-comeco` (novo, 9) · `e14-pct-jornada` (o crédito leva o
  XP) · S2584–S2596, todos PEGOU; S1662, S2153, S2178, S2185 realvos.
  **Mutantes de navegador:** 0.
- **Pede veredito do dono:** subir as capturas que já existem ao nível em que
  nasceriam hoje (as do estágio 1 no nível 1 → 3, os casulos → 7) — é
  migração de dado.

### ST-2.22 · Os quatro defeitos do terceiro relato (D-144, D-145, D-146) ✅ 01/10
- **Por quê (o relato do dono como jogador):** poção e recuar voltando 409 no
  meio da run; "perdi tudo" numa run que caiu; o saldo 550 maior depois da
  falha; o doce recusando com "sem doce da linha dela"; falhas de SSL.
- **a · o doce (D-144):** o resgate da ST-9.9 seguia rodando depois de toda
  rodada da Arena e ZERAVA o doce da conta (o idle mora na conta desde a
  ST-13.5e). Agora o fim da rodada só relê a conta. **Pede veredito do dono:**
  devolver os doces que o resgate tirou desde 30/09 (migração de dado).
- **b · a run fantasma (D-145):** a aba aberta antes da ST-2.21 rodava a regra
  velha, e o servidor fechava a run até ~5 min antes da tela — toda ação
  voltava 409. O 409 relê a conta e diz "a run já terminou no servidor"; a
  tela anda no relógio do servidor (o desvio medido em cada leitura); e o
  servidor marca cada resposta com a digital do código (`x-build`), e a aba
  que a vê mudar mostra "O jogo foi atualizado — Recarregar". As falhas de
  SSL batem com a hora da troca de máquina da ST-2.21.
- **c · o fim da run (D-146):** nada se perdia — o servidor guardava tudo. A
  colheita recusada (o aparelho viu a queda um fio antes) era engolida, e a
  tela ficava com o retrato de antes da run. Agora ela tenta de novo (1,5 s,
  3 s… até 30 s), e uma frase acima do quadro "quem apareceu" diz onde a run
  acabou, o que ficou e o que se perdeu. O "+550" não se reproduziu (a run que
  cai na wave 8 do Campo paga 295–411); o pulo calado do saque é o que sobra.
- **Testes:** `doce-na-conta` (3) · `run-fantasma` (4) · `run-fim` (5) ·
  `idle-acoes` ajustado · S2573–S2583, todos PEGOU; S594 e S2015 realvos.
  **Q5:** com o servidor 40 min à frente, a tela mediu o desvio, colheu a run
  e disse "A equipe caiu na wave 7 de 10. Ficou com o que farmou: +67 XP, +355
  PokéCoin e 4 encontros…" (1440 e 420); o aviso de versão nova em 1440 e 420.
  **Mutantes de navegador:** 0 (as decisões moram em `run-fim.mjs` e
  `idle-conta.mjs`, camada 0).

### ST-2.21 · O relógio da entrada e da derrota ✅ 01/10
- **Por quê (o relato do dono como jogador):** *"cada wave levou de 1 a 1,5
  minuto mesmo na velocidade máxima, e as primeiras falharam várias vezes,
  então não consegui chegar ao chefe da wave 10"*.
- **Medido antes:** a run do estágio 1 da Floresta, com o inicial no nível 1,
  levava ~13,9 min; com o inicial no nível 5, 12,6; o Campo no nível 5, 13,4.
  O inicial sozinho no nível 1 fecha a run em 45%; com uma segunda criatura
  (um Caterpie), ~96%.
- **A dificuldade não mudou, de propósito:** "no nível da porta, o avanço é
  duro e possível" é decisão do dono (§Q4, o teste da `wave`). A primeira
  versão baixava a ameaça da porta e reprovou nesse teste — foi descartada.
- **Feito (`engine/wave.mjs`, `passoDaWave`):** no estágio 1 a wave anda a 70%
  do tempo (`RITMO_DA_ENTRADA`), e a wave perdida acaba em 60% do tempo dela
  (`RITMO_DA_DERROTA`) — perder é informação, e esperar por ela não é. Fica
  fora do grampo do ritmo (`fatorDoRitmo`), que é do par poder-ameaça. A
  `run-avanco` multiplica.
- **Medido depois:** 13,9 → 8,7 min · 12,6 → 8,1 · 13,4 → 8,2. As fixtures
  de emissão e antifraude não mudaram (a emissão é por wave, não por minuto).
- **Testes:** `ritmo-entrada` (novo, 3) · `run-avanco` (o "recuar" anda 4 min
  em vez de 6) · S2569–S2572, todos PEGOU. **Mutantes de navegador:** 0.
- **Fica (L-236, L-237, L-238):** as duas moedas de nome parecido (pede o
  veredito do dono), a ordem do time (ST-10.7b), e o caminho até a Trocas.

### ST-2.20 · A densidade para quem chega (L-235, L-238, L-239, L-240) — proposta
- Um caminho de quem chega: menos abas visíveis até a primeira vitória da
  jornada, e as páginas longas em seções recolhidas.
- As duas moedas sempre com símbolo e, no começo, com o papel ao lado
  ("PokéCash · aposta", "PokéCoin · aventura") — salvo veredito do dono.
- Um botão "Trocar" na ficha da Coleção que abre a Trocas com a criatura.

### ST-2.17 · O cenário da luta ✅ 01/10
- **Por quê (o dono):** *"a tela das batalhas tá só 2 cores, sem detalhe
  nenhum, tá bem feia"*. Era um degradê azul sobre um verde liso, igual na
  Rota 1 e no vulcão.
- **Feito:** `app/modules/pve-cenario.mjs` (camada 0) decide o cenário pela
  região do nó (as 11 do mapa), e a `pve-tela` só pinta, em camadas: céu de
  dois tons com a luz do lugar; nuvens em pixel onde o céu é aberto; duas
  faixas de colinas; DUAS fileiras de peças no horizonte (a de trás menor e
  com névoa) — as peças do próprio mapa (`arte/mapa`); o chão da região em
  PERSPECTIVA (os tiles crescem para a frente) com a névoa do céu no
  horizonte; uma plataforma com a textura do chão sob cada lutador; uma peça
  grande na frente, cortada pela borda; e o ar do lugar (pólen, folha, pétala,
  poeira, espuma, névoa, neon, brasa, faísca, brilho), parado com "menos
  movimento". Os rivais pisam abaixo do horizonte; os sprites cresceram (72 →
  84 px). A mesma luta tem o mesmo cenário (a semente da luta). Arte nova e
  nossa: `arte/mapa/rocha.svg` (pelo `tools/pixel-arte.mjs`).
- **O Q5 mudou o desenho três vezes:** o chão plano repetia o tile como papel
  de parede (virou perspectiva); a peça da frente no canto direito cobria o
  rival de baixo (foi para o vão entre as colunas no largo, e para o canto no
  celular); e na floresta o chão era a COPA vista de cima — os lutadores
  pisavam nas árvores (floresta e bosque lutam na grama).
- **Testes:** `pve-cenario` (novo, 5) · S2555–S2561, todos PEGOU. **Q5:** as
  11 regiões em 1440, e o celular (420) — lidas. **Mutantes de navegador:** 0.
- **Fica para o cenário (L-234):** o céu pela hora do mundo, o clima do idle
  na luta, o chão do pântano com água.

### ST-2.16 · A jornada pede o nível do nó (DEC-25) ✅ 01/10
- **Por quê (o dono):** *"eu achei fácil demais, ele avançou super rápido"*.
- **Medido antes:** o time de seis lutava inteiro — e todo lutador bate a cada
  turno — contra treinadores de 1 a 3. Seis bases no nível 8 venciam o Brock
  (12 e 14) em 100%; o time do amigo (níveis 1 a 6) vencia o Rival em 83% e o
  Lt. Surge (21 a 24) em 100%, porque o Surge só tem golpe elétrico e um
  Geodude no nível 3, sozinho, era intocável.
- **Feito:** lutam `quantosLutam` = no mínimo 3, ou tantos quantos o treinador
  trouxer (`engine/jornada.mjs`); quem luta é `lutadoresDoNo`
  (`jornada-conta.mjs`): os mais fortes pelo power, com quem serve à lição do
  nó na frente (o imune da aula de imunidade não fica no banco). A chance da
  tela, a lição, a correção e a luta (aparelho e servidor) usam os mesmos. O
  painel diz *"Lutam 3 contra 2: Charmander, Butterfree e Pidgeotto — os mais
  fortes do seu time (3 ficam de fora). escolher outros no Time"*. No motor,
  o **último recurso** (`ULTIMO_RECURSO`, sem tipo, poder 10): quem não tem
  golpe que pegue em ninguém não fica mais parado. Regras `tbe-2`.
- **Por que 3 e poder 10, medidos:** 3 é o tamanho dos times de referência dos
  ginásios — nenhuma medição deles muda pela regra de quantos. O poder: com
  50, o imune NO NÍVEL do ginásio perdia (2%) e a aula acabava; com 10, o
  Geodude no 3 perde (0%) e o trio com o imune no 22 vence (99%).
- **Depois:** o time do amigo contra o Rival 83% → 0% e contra o Surge 100% →
  0%; seis bases no 8 contra o Brock 100% → 4%; o inicial sozinho no 5 vence
  a Rota 1 (76%); um trio com
  Squirtle no 12 vence o Brock (99%). Fixture `ginasios.json` remedida: só o
  Bruno muda (aplicar a lição 94,6% → 83,3% — o Gengar imune a Lutador agora
  leva o último recurso; o aceite continua valendo).
- **Testes:** `jornada-equilibrio` (novo, 7) · ajustados os que afirmavam a
  regra velha: `treino-batalha` (imunes dos dois lados ficavam parados até o
  teto), `treino-preco` (o empate do lote agora é o do teto de turnos),
  `presets` (o Tauros do cenário do Foco era imune ao Gengar; Machamp no
  lugar, +0,215), `jornada-tela` (a prova da imunidade forçada mostra o último
  recurso), `jornada-servidor` e `equipe-snapshot` (a identidade é da
  montagem; quem luta é um recorte dela). S1430, S1561, S1662 realvos ·
  S2547–S2554, todos PEGOU. **Q5:** o painel com seis no time, 1440 e 420 —
  lido. **Mutantes de navegador:** 0 (S2550 é pego pelo teste estático da
  tela).

### ST-2.15 · A jornada volta a andar (D-142) ✅ 01/10
- **Por quê (o dono):** *"a jornada tá bugada também, já matei [o rival] e
  ainda assim não avança"*.
- **Causa e conserto:** ver D-142 — a ST-13.5f deixou `antes` sem declarar no
  clique de lutar; toda luta lançava ReferenceError depois de gravada e o mapa
  não andava. De volta, e com ela: a resposta da luta com conta leva a
  recompensa inteira (o fim dizia "undefined PokéCoin") e o chão do mapa não
  pinta na caixa que sumiu.
- **Testes:** a sonda de navegador agora clica em "lutar" (`visual`, D-142) ·
  `jornada-servidor` (+1) · `jornada-desenho` (+1) · S2544–S2546 PEGOU.
  **Q5:** o caminho do jogador com servidor real — Rota 1, Floresta e Rota 22
  em sequência: a luta encena, o fim diz "Ganhou: 200 PokéCoin · 2 Poké Ball ·
  1 doce", e o mapa abre o próximo nó.
- **Mutantes de navegador:** 1 (S2544) — o clique mora na tela; a frase e a
  guarda são pegas em Node.

### ST-2.18 · O cenário da luta pela hora e pelo clima (L-234) — proposta
- O céu da luta pela hora do mundo, o clima do idle na luta, o pântano com água.

### ST-2.14 · Em que nível a captura nasce (L-233) — ✅ feita dentro da ST-2.23

### ST-2.9 · A floresta na vista do celular (L-231) — proposta
- Em 1× a cena do início da Floresta mostra trilha, grama e fauna, e nenhuma
  árvore: o bioma que se chama floresta não parece uma. Pôr copa na borda do
  trecho inicial (ou o ponto de partida perto do bosque) — é cenário, e o
  cenário do idle nunca está pronto.

### ST-13.5g · A Liga sem time diz por onde sair (L-211) ✅ 01/10
- **Escopo:** a Liga já lia o time DA CONTA (`criaturasParaLuta`), e a DEC-17
  decidiu que a conta começa do zero — não há migração do aparelho vindo. O
  aviso da Liga sem time ainda prometia "levar as do aparelho numa próxima
  versão"; passa a dizer por onde se sai: escolher o inicial e capturar no
  farm. Só texto num aviso que já existia (capturas dispensadas pela DEC-20).
- **Testes:** `liga-home` — o aviso diz inicial e farm e não promete o
  aparelho. **Q2:** S2431.

### ST-13.8 · Os sinais de aparelho e rede (L-050 · DEC-19) ✅ 30/09
- **Porte** M · **Servidor** sim · **Spec** §7.19, §28 · **Depende de** ST-13.6
- **Escopo:** o cliente manda um número aleatório do navegador (guardado nele);
  o servidor grava, por conta, só a ASSINATURA do número e do IP (HMAC com o
  segredo do servidor — o valor nunca vai ao banco), com 30 dias de validade,
  e apaga o que venceu. Duas contas com a mesma assinatura viram suspeita em
  `suspeitas_antifraude` (sinais `aparelho` e `rede`), para o operador revisar
  no painel e, se quiser, ligar as contas com o `ligarContas` que já existe.
  Nada é punido nem ligado sozinho.
- **Aceite:** duas contas no mesmo navegador aparecem como suspeita; o banco
  não guarda nenhum IP nem número em claro; nada com mais de 30 dias.
- **Portões:** Q1 Q2 Q3 Q6.
- **Feito:** `engine/sinais.mjs` (a forma do número, o IP normalizado, os pares
  na janela de 30 dias) · `server/sinais.mjs` (HMAC-SHA256 com o segredo do
  servidor e um rótulo por classe; escrita no máximo a cada 10 min por sinal;
  o vencido sai na escrita e na varredura) · a varredura da ST-13.6 ganha os
  sinais `aparelho` e `rede`, pula o par já ligado e nunca liga sozinha · a
  migração `sinais-st13.8` refaz o CHECK das suspeitas guardando as linhas ·
  o cliente manda `x-aparelho` (um `randomUUID` guardado no navegador) e o
  CORS aceita · `test/sinais-conta.mjs` (5) · S1994–S2003.

### ST-13.5 · Com conta, o cliente lê o idle do servidor ✅ 30/09
- **Porte** L (era M: o levantamento de 30/09 achou que o cliente não chama
  NENHUMA das 17 rotas do idle — todas as telas escrevem o save do aparelho)
  · **Servidor** pouco · **Depende de** ST-13.4 (DEC-17: sem migração)
- **O desenho (decidido 30/09, por delegação):** o save do aparelho continua
  sendo o que as telas leem — vira CACHE da conta. Com conta, a leitura é
  `GET /api/idle` passada por uma função pura de camada 0 (`idleDaConta`) que
  põe o formato do servidor no do aparelho; cada escrita chama a rota e relê
  tudo. Uma chave, `IDLE_NA_CONTA`, fica DESLIGADA até a última parte — cada
  parte fecha com o jogo jogável, e o jogo com conta só muda quando todas
  estiverem prontas.
- **As partes:**
  - **13.5a** ✅ 30/09 · a leitura: `idleDaConta`, `sincronizarIdleDaConta` no boot, o
    servidor passa `origem` e `expedicao` nos encontros, e o aviso "desatualizado"
    sem rede (fixo nas duas abas do farm, não a faixa que some) · S2005–S2014;
  - **13.5b** ✅ 30/09 · expedição, colheita, bola e a inicial pelo servidor (o teto da
    conta vem do servidor: as expedições colhidas não descem — a leitura manda
    `teto.hoje`, e o `encontrosHoje` do aparelho soma a partir dele) ·
    `app/modules/idle-acoes.mjs` decide onde cada ação acontece · S2015–S2023;
  - **13.5c** ✅ 30/09 · a run do Avanço (começar, poção, recuar, colher — a colheita é
    automática no quadro; com conta ela é uma promessa com trava, e sem conta
    continua síncrona) · a leitura manda as runs colhidas (`avancos`, dois
    dias) e o `teto.hoje` passa a ser só o das expedições · S2024–S2032;
  - **13.5d** ✅ 30/09 · caixa, troca, soltar, foco, golpe, evoluir e doce — as que
    gravam direto no disco em `colecao-acoes.mjs` (resposta `{ ok, motivo }`
    nos dois modos), as que mexem no estado da aba em `idle-acoes.mjs`; o
    doce leva uma chave de pedido (idempotente no servidor) · S2033–S2044;
  - **13.5e** ✅ 30/09 · a luta da jornada (o servidor luta com a semente e o
    time DELE; o aparelho refaz a mesma luta com os times e a semente da
    resposta só para encenar — `encenarDaConta`), o aviso da DEC-17 no
    cadastro (linha própria, em âmbar), o Sair que apaga o cache da conta, e a
    chave `IDLE_NA_CONTA` LIGADA, com o ensaio "limpa o navegador, entra, a
    coleção está lá" num navegador de verdade (`tools/olhar-conta.mjs`, 20/20
    passos nas quatro larguras) · S2045–S2054.
- **Escopo:** hidratar o idle do servidor no boot com conta; o local vira
  cache; sem rede, a tela diz que está desatualizada em vez de inventar.
- **Aceite:** limpar o navegador e entrar devolve a mesma coleção; o ensaio do
  piloto ganha o passo "limpa o navegador, entra, a coleção está lá".
- **Portões:** Q1 Q2 Q5.

### ST-13.6 · Antifraude mínima da captura (L-050) ✅ 28/09
- **Porte** M · **Servidor** sim · **Spec** §7.19 · **Depende de** ST-13.2
- **Escopo:** taxa de captura por conta contra a esperada (a semente é do
  servidor); contas ligadas (`contasLigadas`) com o mesmo padrão; ação
  auditada, nunca silenciosa.
- **Portões:** Q1 Q2 Q6 Q9.

---

### ST-13.9 · O que ficou no aparelho: a loja do idle, as missões e a escada (D-136)
- **Porte** M · **Servidor** sim · **Spec** §P2, §7.14 · **Depende de** ST-13.5
- **Por quê:** a pergunta do dono (*"Já conectou tudo ao banco?"*, 30/09)
  achou quatro escritas que a 13.5 não levou: a loja do idle (comprar e
  vender), o estilhaço e a montagem, o resgate da missão da semana, e as
  marcas da escada da Pokédex. Com conta, as três primeiras SOMEM na leitura
  seguinte da conta.
- **13.9a ✅ 30/09 · a loja:** `POST /api/idle/loja` (`server/loja-idle.mjs`)
  — comprar, vender, estilhaçar (raiz do servidor) e montar, com as contas do
  motor e a bolsa pela diferença numa transação; `lojaNa` no cliente; a troca
  e a montagem viraram funções do motor · `test/loja-idle.mjs` · S2091–S2101.
- **13.9b ✅ 30/09 · as missões e a escada:** `server/escada.mjs` + migração
  `escada-missoes-st13.9b` — "já possuiu" e as marcas por GATILHO (criatura
  que nasce/evolui; a aposta marca encontrada e a rodada vista), a rodada
  assistida por `POST /api/idle/vistas` (o id, nunca a lista de espécies), a
  semana e o resgate por `POST /api/idle/missao` com o prêmio na bolsa da
  conta · `test/escada-conta.mjs` · S2102–S2114.
- **13.9c ✅ 30/09 · a trilha de login e os desafios pagam na conta (D-137 ·
  L-054):** achado pela matriz da ST-14.0A — o servidor dizia `creditou` e a
  carteira não recebia; o desafio fechava e ninguém pagava. O login credita
  `LOGIN_STREAK_REWARD` em `bonus`; o desafio fechado aplica o marco semanal
  do motor; "assistir" e "variedade" andam; "aposta_alta" saiu (§28) ·
  `test/desafios-conta.mjs` · S2115–S2124.
- **Aceite:** com conta, nenhuma escrita de valor de jogo fica só no aparelho;
  releitura da conta não desfaz nada; sem conta, nada muda.
- **Portões:** Q1 Q2 Q3 Q6.

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

- ~~**D2 · ligar o stake entre jogadores na Liga (E11), mesmo em PC-B.**~~
  **Decidida em 30/09 (DEC-16): LIGADO**, com moeda simulada. A liberação é da
  bandeira do stake só — o `CHECKPOINT_25_1` continua `null`, e o dinheiro real
  segue atrás do §25.1.
- **D3 = DEC-02 · tudo com dinheiro real** (PC-T, PC-C, fila transferível,
  Exchange, P2P). O bolo do E12 roda com a moeda simulada.
- ~~**ST-13.4 · a migração do save local**~~ — **decidida em 30/09 (DEC-17):
  não migra.** A conta começa do zero no banco; o save do aparelho não sobe.
- ~~**Política de sinais de aparelho e rede (L-050)**~~ — **decidida em 30/09
  (DEC-19): pode**, como recomendado. É a ST-13.8.
- **Piloto com amigos (ST-7.2)** — **decidido em 30/09 (DEC-18):** só com o jogo
  100% completo.
- ~~**Hospedagem pública**~~ — adiada pelo dono em 26/09: *"vai ser
  configurável depois, primeiro vamos fechar o jogo"*. Volta com o jogo fechado.
- **Lembrete:** nomes de líderes de ginásio são IP; a DEC-01 cobre a fase
  privada, não a publicação (§0.3.1).

---

# PARTE 3 — E14: Shiny, Trading & Player Market (30/09/2026)

> **Pedido do dono, 30/09:** mandou `SPEC_E14_PLAYER_ECONOMY_MARKET.md` e
> `E14_IMPLEMENTATION_STORIES.md` (revisão 3.0, 28/09) com *"Acrescentar ao seu
> plano de implementação"*. Os dois entraram no repositório **sem edição**, em
> `docs/e14/` — são o contrato (o QUÊ e o COMO de cada story). Esta parte é o
> ENCAIXE deles no plano: o que mudou desde 28/09, a ordem, e o que continua
> com o dono. A fila continua sendo SÓ a do `ROADMAP.md` (GOV-01), e o estado
> SÓ o do `RETOMAR.md`; os dois documentos da E14 não guardam andamento.
>
> **O que a E14 é, em uma frase:** a criatura passa a ser uma INSTÂNCIA com
> origem verificável — shiny verdadeiro nasce do encontro do servidor, a
> Master Ball garante a captura com emissão controlada, e depois ela pode ser
> trocada entre jogadores e anunciada num Market de preço fixo, com taxas que
> são queimadas e nenhum caminho que transforme bônus em saldo transferível.

## O que mudou desde a revisão 3.0 (28/09), e o que isso muda nas stories

A revisão auditou o commit `01071f4` (28/09). Desde então fecharam blocos que
ela tratava como pendentes — a reconciliação vai aqui, e não nos documentos
dela (que ficam como o dono os mandou):

| a revisão diz (28/09) | hoje (30/09) | consequência |
|---|---|---|
| ST-13.4/13.5 são dependências PENDENTES da entrega A | ✅ **fechadas em 30/09** (13.5e: `IDLE_NA_CONTA` ligada) | a dependência externa da A está satisfeita |
| a importação do save local "continua no bloco ST-13.4" (§4.1, ST-14.0D) | **DEC-17: não há importação** — a conta começa do zero, o save antigo não sobe | a parte de importação/`legacy_unverified` da ST-14.0D **sai de escopo**; o que sobra dela é o incremento E14 no cliente (shiny, origem, locks, recibos) |
| "D-129 do lance local pertence à ST-13.5" | D-129 continua **aberto** em `DEFEITOS.md` | fica com dono **ST-14.1** (o recibo do lance), que já mexe exatamente ali |
| o bônus de cadastro em `transferivel` (DEC-E14-001) | confirmado no código: `server/rotas.mjs:249` e o aparelho em `app/modules/banco.mjs:109,121,213` | registrado como **D-135**, com teste que AFIRMA o defeito (vira vermelho quando a ST-14.0B corrigir) |
| a Spec §21 lista "trading de Pokémon" e "marketplace/RMT oficial antes de gate jurídico" em **NÃO FAZER AGORA** | conflito real — a Spec vence, e o dono mandou construir | a Spec §21 foi **corrigida neste commit** (ver abaixo), no mesmo critério do E12: **construir não é ligar** |
| o `WELCOME_GRANT` como PC-B | a Spec §0 já dizia PC-B ("Origem: welcome grant") | nada a corrigir na Spec: o defeito é só do código |

**A Spec §21, e por que a correção é esta.** O precedente é o do E12 (26/09):
*"a consulta do §0.5.1 continua obrigatória ANTES DE PUBLICAR, e não antes de
CONSTRUIR"*. A E14 cabe nele sem esticar: a própria spec E14 (§2, §3.7) exige
que o P2P fique atrás de `p2p_transfer_enabled` **e** do `CHECKPOINT_25_1`, e
proíbe saque, moeda fiduciária e conversão implícita. Então:

```text
CONSTRUIR    entrega 0, A, B, C e D — com as bandeiras de troca e Market DESLIGADAS
LIGAR        troca/Market para jogadores = decisão do dono (DEC-21, abaixo), e o
             que envolver PC-T de verdade continua na DEC-02 + §0.5.1 + §25.1
NUNCA AQUI   saque, cash-out, Exchange, moeda real, venda de conta
```

## A ordem, e por que é esta

A ordem da revisão 3.0 (§2 das stories) fica, com um ajuste de prioridade:

| onda | stories | o que entrega | por que nesta posição |
|---|---|---|---|
| **0** | 0A → **0B** → 0C e 2 → 5 | o contrato econômico escrito; a carteira que recusa bônus no P2P e **o bônus de cadastro em PC-B (D-135)**; lotes com proveniência; a instância estendida (shiny, OT, histórico, baixa lógica no lugar do DELETE da soltura) | **integridade de economia vem antes de superfície nova** (critério 2 do ROADMAP). E o D-135 importa JÁ: o stake da Liga está LIGADO (DEC-16) — hoje o bônus de boas-vindas entra na Liga como se fosse PC-T |
| **A** | 1 → 4 → 0D → 3; gate A (15) | **shiny verdadeiro** no encontro (mesma chance de captura, não rerrola), recibo recuperável do lance, **Master Ball** com orçamento de emissão, o cliente conectado mostrando shiny/origem, o prestígio legado como aura | é jogo que o jogador VÊ, e a base de tudo o que vem depois (o que se troca é a instância com origem). Entra no "100%" da DEC-18 (recomendação R16) |
| **B** | 6 → 8, 14 e 16 → 7; gate B | reservas e escrow, taxas queimadas, antifraude de troca, expiração/restart/conciliação, e a **troca direta** com revisão e confirmação dupla | construída com `p2p_transfer_enabled` desligada; ligar é a DEC-21 |
| **C** | 9 → 10 e 12 → 13; gate C | o **Market de preço fixo** (uma criatura ou um lote fechado), busca, histórico de preço sem inventar referência, a tela | idem |
| **D** | 11A → 11B | buy orders e preenchimento parcial | só com o C estável e necessidade demonstrada por dados (a própria spec diz isso); **fica fora do "100%"** (R16) |

## As fichas

O conteúdo integral de cada story (Alterar/Criar, Fazer, Aceite, Testar,
Sabotar, Portões) está em `docs/e14/E14_IMPLEMENTATION_STORIES.md`; o contrato
normativo, em `docs/e14/SPEC_E14_PLAYER_ECONOMY_MARKET.md`. Abaixo, o índice
com o que muda no encaixe — **a ficha que vale é a de lá**, com as ressalvas
desta tabela.

| story | porte | onda | depende de | ressalva do encaixe (30/09) |
|---|---|---|---|---|
| **ST-14.0A** · contrato econômico, fontes e integração documental | M | 0 | — | ✅ 30/09: docs no repositório, Spec §21/§31, ROADMAP, RETOMAR, índice, D-135 · a MATRIZ em `docs/e14/MATRIZ_FONTES_ECONOMIA.md` — e ela achou o **D-137** (login e desafios não pagavam com conta), fechado na ST-13.9c |
| **ST-14.0B** · a carteira para P2P e o bônus em PC-B | G | 0 | 0A | **0B1 ✅ 30/09: o bônus de cadastro em PC-B (D-135 fechado)** no servidor e no aparelho, com a tabela de regressão em `test/e14-carteira.mjs` (S215 realvado, S2126–S2128) e a L-221 (o teto de saldo) · **0B2 ✅ 30/09:** a reserva P2P só de PC-T elegível (um bolso, `transferivel`; a conta com o grant legado inelegível até a reconciliação), a transferência com taxa queimada, `executarOperacao` idempotente (`server/operacoes-economicas.mjs`: recusa vira exceção, a chave é da conta, o pedido comparado pelo hash canônico), o painel separando o movimento entre jogadores da emissão, e as bandeiras `p2p_trade_enabled`/`player_market_enabled` desligadas e de valor · S2129–S2140 · **a 14.0B está fechada** · fecha o **D-135**; a sabotagem "restaurar `WELCOME_GRANT` em `transferivel`" é obrigatória. O aparelho (`app/modules/banco.mjs`) é sandbox, mas a ficha pede que nenhum caminho local promova bônus a saldo conectado |
| **ST-14.0C** · inventário por lote e proveniência | G | 0 | 0A, 0B | ✅ 30/09: `bolsa_lotes` com classe e fonte (`server/inventario.mjs`), a `bolsa` como projeção na mesma chamada, o débito FIFO (ou da classe escolhida) dizendo as classes consumidas; o derivado herda a mais presa (`engine/proveniencia.mjs`): captura ← bola, evolução ← pedra, compra ← moeda; todo crédito do servidor diz a fonte; o estoque antigo vira `legacy_unverified`; a criatura ganha `proveniencia` · os DOCES ficam de fora (L-222: não negociam na v1) · `test/e14-inventario.mjs` · S2150–S2157 (11 realvados) |
| **ST-14.2** · a instância existente evolui | M | 0 | 0A, 0B | ✅ 30/09: `is_shiny`, treinador original, espécie de origem, encontro (único) e versão em `criaturas`; o histórico append-only e a baixa por GATILHO (nasceu, evoluiu, baixa → `criaturas_baixadas`) — `soltarNaConta` não mudou, e o doce continua saindo uma vez; a migração não inventa treinador nem espécie de origem (`migracao`) · `test/e14-instancia.mjs` · S2141–S2149 |
| **ST-14.5** · política única de negociabilidade | M | 0 | 0C, 2 | ✅ 01/10: `engine/negociabilidade.mjs` (pura) responde `{allowed, reason_code, available_at}` para criatura, item por lote, doce/cosmético e moeda, numa ordem fixa (NOT_OWNER → FEATURE_DISABLED → ACCOUNT_RESTRICTED → ASSET_BOUND → ASSET_BUSY → ASSET_COOLDOWN); `server/elegibilidade.mjs` lê os fatos com o relógio do servidor · o inicial, o lendário e a criatura de evento (`raid`) presos por regra; a origem presa pela classe; o item só pelos lotes limpos e livres; a moeda PvE e a Master Ball (`negociavel: false` no pack, até a ST-14.4) nunca; só PC-T elegível — o `comprado` recusado por nome · os USOS (evoluir, treinar, expedição) só param na reserva; soltar também na atividade — e `soltarNaConta` já pergunta à política · **recomendação adotada:** cooldown de 10 min só para quem foi RECEBIDO (a baseline da spec §7); evoluída sem cooldown extra até o gate B medir · `reservada` e `recebidaEm` lidos como "nada" até a 14.6 e a 14.7 os gravarem · L-223 (o doce de bônus não prende a criatura), L-224 (o aviso antes de gastar insumo preso) · `test/e14-elegibilidade.mjs` · S2159–S2175 (S1635 realvado; a S2172 duplicava ela e saiu) · **fecha a onda 0** |
| **ST-14.1** · shiny e recibo recuperável | G | A | 0B, 0C, 2, 5 | ✅ 01/10: `engine/shiny.mjs` (taxa com VERSÃO, baseline 1/2.000 do piloto — não aprovada, a ST-14.15 mede; o pack pode trazer a sua) · o shiny é sorteado quando o servidor GRAVA o encontro (colheita e run), com raiz nova do CSPRNG — nunca a semente publicada da colheita — e fica em `encontros_pendentes.is_shiny`/`shiny_versao`; a releitura da conta o mostra, a resposta da colheita não muda (é a conta do aparelho) · o lance leva o shiny à criatura com a MESMA chance; grava `resolucao` (captura/falha) e o RECIBO na mesma transação · o retry devolve o recibo (`repetida`), mesmo com outra bola — antes era 404, e quem perdia a resposta achava que perdera a bola (o teste do `colheita-rotas` mudou por isso) · a run nova marca `descarte` · migração `encontros-st14.1` sem shiny retroativo · **D-129 ✅** (o lance local segue a semente da colheita) · o `lancar` antigo (dex do chamador) não é rota e fica sem shiny · a tela do shiny é da ST-14.3 · `test/e14-encontros.mjs` · S2176–S2187 (sem S2183), 7 realvados |
| **ST-14.4** · Master Ball e emissão controlada | M | A | 0C, 1, 5 | ✅ 01/10: a garantia é CAPACIDADE (`guaranteed_capture` no item do pack; `engine/captura.mjs:garantida` não conhece nome) e vale ANTES do teto, só contra encontro capturável · a emissão é por FONTE com orçamento declarado no item (`emissao: { versao, fontes: { f: { porConta, global } } }`) e uma porta só (`server/emissao-controlada.mjs`): evento UNIQUE, teto por conta e global contados na mesma transação (BEGIN IMMEDIATE — a jornada passou a usar a da carteira), recusa sem retirar o emitido, lote `verified_earned` com a fonte · **recomendação adotada:** a única fonte do piloto é a PRIMEIRA vitória sobre o nó final da jornada (o nó declara `emissaoControlada`): 1 por conta, 500 no total, versão `garantida-v1-piloto` · com a fonte aprovada, a bola negocia pelo lote (a marca `negociavel: false` saiu do pack; o motor a mantém) · a tela do lance ainda não a oferece (L-225) · `test/e14-garantida.mjs` (inclui dois pedidos em duas conexões) · S2188–S2197, S549 e S2174 realvados |
| **ST-14.0D** · E14 no cliente conectado | G→M | A | 1, 4, 5 | ✅ 01/10 · **sem importação** (DEC-17): a porte caiu · a leitura da conta traz o `shiny` e a `proveniencia` da criatura e os LOTES livres por item, na ordem do débito (`server/inventario.mjs:lotesLivres`); o `idle-conta` os desce · `app/modules/encontro-dados.mjs` (camada 0) decide o quadro do lance: a bola garantida só quando se tem, o selo "✦ brilhante", o aviso "⚠ prende" quando a bola sai de lote preso, e a pergunta antes do lance com a garantida (`idle-confirma.mjs:confirmarLance`) · o retry do lance (ST-14.1) chega pela mesma rota · Q5 com `tools/olhar-lance.mjs` nas 4 larguras, lido: o aviso longo quebrava em 3 linhas e virou "⚠ prende" (a explicação no `title`) · L-225 ✅; L-224 em parte (o lance; a evolução e a escolha da classe → ST-14.3) · mutantes de navegador: 2 (S2206, S2207 — leem a fonte da tela; a decisão está em Node) · `test/e14-cliente.mjs` · S2198–S2207 |
| **ST-14.3** · prestígio legado e shiny real | M | A | 2, 1, 0D | **dividida em 01/10** (a ficha mistura regra de servidor e quatro telas): **14.3a ✅ 01/10** — o snapshot da Liga grava o `shiny` de cada criatura (aparência: `timeDoSnapshot` o tira, power e luta iguais); `snapshotPodeLutar` (camada 0) exige que toda criatura do time ainda seja do dono, e `server/partida.mjs` o aplica no desafio direto (os dois lados), na busca contra o bot e na fila (o time desfeito sai do pareamento); o replay da partida feita não muda · `test/e14-snapshot.mjs` · S2208–S2214, S1708 realvado · **14.3b ✅ 01/10** — o cosmético do perfil virou PRESTÍGIO sem perder nada gravado (`shiny-dados.mjs`: `prestigioNaArena`, `prestigioNoRetrato`, `atributoPrestigio`): aura neon e ◆ no retrato, no banner, no guarda-roupa, na arena e no vencedor — a folha/paleta é sempre a NORMAL (o lutador da Arena não é instância de ninguém); o dourado e o "✦" ficam para a instância brilhante: a carta da equipe (selo "✦ brilhante"), a ficha da caixa e a cena da captura (pelo recibo) · `test/shiny-arena.mjs` reescrita para a regra nova (o histórico R24/R34/R42 de QUEM vê continua) · Q5 com `tools/olhar-prestigio.mjs` nas 4 larguras, lido: "Retrato" vazava do cartão → "Foto" e os botões quebram de linha; a carta brilhante sem palavra → selo · S2216–S2224 (sem S2215/S2217, duplicavam S455/S454), 11 realvados · ficam: o palco/replay da Liga com o shiny do snapshot (L-226) e o resto da L-224 |
| **ST-14.3c** · o shiny do snapshot no palco e no replay da Liga | P | — | 3a, 7b | ✅ 01/10 · **L-226** · liberada pelo dono ("faça td da 14") · `aparenciaDosTimes` (camada 0, `partida-dados.mjs`): o shiny de cada lado na ordem do snapshot — a mesma em que o motor monta o lado do log; só `true` é shiny; snapshot sem o campo e o lado do bot ficam normais · `linhaDoLog(..., aparencia)` cruza pela POSIÇÃO e troca de lado com quem assiste · `GET /api/equipe/partida` passa a devolver `aparencia` (só booleanos: o id e o dono não viajam) · o palco: folha recolorida (`sheetURL(..., shiny)`, também na pré-carga e no sprite parado), `.mon.shiny` da Arena (halo, ✦, lampejo uma vez na entrada) e a placa com fio de ouro e ✦ — Q5 lido em 1440 e 420 (`SO=replaymeio tools/olhar-liga.mjs`, que passou a semear shiny): o nome em ouro sumia sobre a barra verde e o ✦ da fonte pixel saía do tamanho de um ponto → nome branco, ✦ em fonte de sistema a 13 px, fio de ouro na placa · mutantes de navegador: 0 · `test/e14-palco-shiny.mjs` · S2441–S2447, todos pegos |
| **ST-14.6** · reservas e escrow | G | B | 0B, 0C, 0D, 5 | ✅ 01/10 · `asset_holds` (dono = a oferta, estado numa direção só, versão, prazo) + `asset_holds_eventos` append-only; índice único PARCIAL: uma reserva ativa por criatura; item e moeda coexistem por quantidade (`bolsa_lotes.reservada`, `reserva_delta` da carteira) · `server/reservas.mjs`: `reservarOferta` tudo-ou-nada em `emTransacao` (a política única decide cada ativo; a recusa da carteira vira exceção), só lotes de classe que negocia, do mais antigo; `liberarOferta`/`expirarVencidas` devolvem uma vez (relógio do servidor) · o débito passou a gastar só o LIVRE · a reservada não evolui, não ganha doce, não sai em expedição, não entra na run, não é solta (a política já dizia ASSET_BUSY), e o time da Liga com ela não luta partida nova · a liquidação (consumir as reservas e mover os ativos na mesma transação) é da ST-14.7; o varredor periódico de vencidas, da ST-14.16 · `test/e14-reservas.mjs` (inclui duas conexões no mesmo arquivo) · S2225–S2232, S2235–S2238; S565 e S2150 realvados |
| **ST-14.8** · taxas, burn e recibos | M | B | 0B, 6 | ✅ 01/10 · `engine/taxas-mercado.mjs`: `taxa = max(1, ceil(bruto×bps/10⁴))` em BigInt (o float erra por 1 PC perto de 2⁵³ — o teste usa o caso), `taxaParcial` (o mínimo uma vez, a soma das parcelas = a do total, pronta para a entrega D), `previewTrade` (cada remetente paga a SUA, sem compensar pontas) e `previewAnuncio` (os exemplos de 100 e 1.000 da spec fecham), com versão e impressão digital da política · as taxas com nome na carteira (`PLAYER_MARKET_LISTING_FEE`, `PLAYER_MARKET_SALE_FEE`, `DIRECT_TRADE_FEE`), todas QUEIMA: a do anúncio sai do PC-T elegível na criação; a da troca/venda sai do reservado na liquidação (`liquidarP2PNoBanco` ganhou `tipoTaxa` e `memo`) · o `memo` grava `versão:hash` — a oferta liquida com a política DELA · a reconciliação conhece as taxas novas · `test/e14-taxas.mjs` · S2239–S2248; S2131, S2132, S2134 realvados |
| **ST-14.14** · proteção e antifraude antes de negociar | M | B | 0A, 0B, 5, 6 | ✅ 01/10 · `engine/risco-mercado.mjs` (camada 0): os limites da spec §7 — **1 troca aberta, 10 anúncios, 20 ativos por lado** (a criatura repetida conta uma vez) — e a contraparte: nunca a própria conta, nunca a LIGADA (o grafo da ST-13.8) · `server/risco-mercado-jogadores.mjs`: `p2p_congelamentos` (um ativo por conta, pelo índice; motivo obrigatório pelo CHECK), `congelar`/`descongelar` pelo `agir` — papel `economia`, motivo, confirmação, auditoria ANTES —, e `exigirPodeOfertar` chamado pela `reservarOferta` antes de prender qualquer coisa · a política única lê o congelamento (`ACCOUNT_RESTRICTED`/`congelada`) · o escrow da conta congelada NÃO solta sozinho (nem cancelar, nem vencer) até descongelar; o kill switch não prende — desligar a bandeira recusa ofertar e deixa liberar · `POST /api/admin/p2p/congelamento` (só sessão de operador) · o `varrerSuspeitas` passa a contar a captura pelo EVENTO (`criaturas_historico`): soltar não apaga, receber numa troca não é capturar · `test/e14-risco.mjs` · S2249–S2266; S1769 realvado · alerta de preço fora da curva → **L-227** (ST-14.12) |
| **ST-14.16** · expiração, restart e conciliação | M | B | 0B, 0C, 6, 14 | ✅ 01/10 · a oferta VENCE INTEIRA: `expirarOferta` encerra a entidade (gancho `entidade` que a 14.7/14.9 passam) e todas as reservas dela na mesma transação; `ofertaVigente`/`exigirVigente` conferem o prazo com o relógio de quem consome (`OFFER_EXPIRED`) — o varredor atrasado nunca deixa passar oferta vencida · `server/economia-worker.mjs`: passada curta (lote de 200, da mais antiga; a conta congelada FORA da busca), cada oferta na sua transação (a quebrada não segura as outras), 3 tentativas por tarefa e segue, métrica `economy_worker_pass` só quando há o que contar; fora do tick da Arena (minuto, não 250 ms); o servidor passa UMA vez ao ligar (o que venceu na queda volta ao dono pela passada de sempre) e para ao fechar · `server/conciliacao-economia.mjs`: por reserva e com endereço — órfã (criatura/lote que não é mais da conta), lote (`reservada` × reservas ativas), moeda (o `reserva_delta` do ledger com a referência da reserva × o estado), ledger × saldo, bolsa × lotes; escreve em `economia_divergencias` (uma aberta por tipo+chave), NÃO conserta; a conta em divergência para de ofertar (a política: `ACCOUNT_RESTRICTED`/`conciliacao`), e fechar é do papel economia, auditado, sem ajuste — a diferença que continua reabre · a cópia (`conferirCopia`) prova o escrow também · sem outbox: não há consumidor externo assíncrono · a reserva CONSUMIDA é conferida pela liquidação da ST-14.7 · `test/e14-recuperacao.mjs` (processo filho morto antes e depois do commit; duas conexões liberando e vencendo) · S2267–S2288; S2236 e S2266 realvados |
| **ST-14.7** · a troca com revisão e confirmação dupla | G | B | 6, 8, 14, 16 | `/api/idle/trocar` (troca de posição no time) **não muda de significado** · **dividida em 01/10** (servidor e tela são entregas de portões diferentes — a tela pede Q5/Q7): **14.7a ✅ 01/10** — `server/trocas.mjs`: OFFERED → LOCKED → SETTLED (e CANCELLED, EXPIRED; o rascunho mora no aparelho), contraparte fixa pelo NOME, cada lado edita o seu; toda edição sobe a revisão e a prontidão/confirmação são da revisão; as reservas dos dois lados nascem juntas só com os DOIS prontos (lock de 5 min); a confirmação é da revisão E do hash do que a tela mostra (espécie, nível, natureza, shiny, versão da instância, itens, PC-T, taxas, política); a segunda confirmação liquida os dois lados na mesma transação — criatura com linha em `criaturas_transferencias` (append-only; o cooldown de quem recebe sai dela) e lote recebido viram `p2p_verified` (a cadeia fica no histórico e na fonte `troca:<id>`), PC-T com a taxa da política gravada (queima) — e consome as reservas; o retry devolve o recibo; editar travada solta tudo; uma troca aberta por conta dos dois lados; a doação vale com aceite; terceiro recebe "não existe" · o varredor vence o lock (entidade) e o convite de 24 h (tarefa) · `server/trocas-rotas.mjs` (`/api/trocas`, `/detalhe`, `/oferta`, `/pronto`, `/confirmar`, `/cancelar`; o checkpoint é o do §25.1 — `checkpointTeste` só em `ambiente: 'teste'`) · a recusa carrega `reason_code`, `available_at` e a revisão atual · `test/e14-trocas.mjs` (duas conexões: cancelar × confirmar nas duas ordens) · S2289–S2316; S2231 realvado · **14.7b ✅ 01/10** — a TERCEIRA ABA DA POKÉDEX ("Trocas", ao lado de "Minha Coleção": a troca é sobre a coleção, e a barra de cima fica com os modos de jogo) · `app/modules/trocas-dados.mjs` (camada 0, em Node): a etapa de cada ponto de vista e o botão dela, o relógio do lock (m:ss), as linhas de cada lado (✦, nível, natureza, taxa que queima), a recusa em palavras com o QUANDO (`textoDaRecusa`: cooldown com a hora, conta ligada, congelada, desligada…), o que a tela oferece para montar (sem o preso pela origem, só o lote que negocia) · `app/modules/trocas-tela.mjs` (camada 4, só pinta): lista + convite por nome, a mesa com os dois lados e a seta, o editor do meu lado, cancelar com pergunta, o relógio andando e a mesa repintando a cada 5 s (menos montando) · `GET /api/trocas` diz se a conta pode negociar agora e o PC-T elegível — a tela mostra "desligadas" até a DEC-21 · Q5 com `tools/olhar-trocas.mjs` nas 4 larguras, lido: o nível vinha da coluna de nascimento ("nv 1" para um Pikachu 18 — o servidor passou a usar `nivelDe(xp)`, e é o que entra no hash), o placeholder cortado na coluna estreita, o botão principal sem peso, o Convidar desabilitado com cara de ativo, o shiny só no texto (ganhou o ouro de silhueta da instância) · Q7 dispensado pela DEC-20 · mutantes de navegador: 0 — toda decisão da tela é pega em Node · `test/trocas-dados.mjs` · S2317–S2330 · a L-226 passa à ST-14.3c |
| **ST-14.9** · anúncios de lote fechado | G | C | 6, 8, 14, 16, 7 | namespace `player_market_*` e `/api/player-market/*`; o `server/mercado.mjs` é do bolo (E12) e não se toca · ✅ 01/10 · `server/mercado-jogadores.mjs` + migração `mercado-jogadores-st14.9` (`player_market_listings` com o retrato do que o comprador viu e a versão; `player_market_fills` append-only, uma linha por venda — o bruto da ST-14.12): ANUNCIAR prende o ativo (uma criatura ou um lote de um item; preço total e quantidade imutáveis) e queima a taxa de anúncio na mesma transação — sem saldo para a taxa, nada fica preso; COMPRAR confere dentro da transação o anúncio ativo e no prazo (sem depender do varredor), a versão E o preço vistos, nunca o próprio nem conta ligada, a política das duas contas e o PC-T elegível; o comprador paga o preço, o vendedor recebe o líquido, a taxa de venda (a gravada) queima, a posse muda pelo mesmo caminho da troca (`server/posse-p2p.mjs`, extraído do `trocas.mjs`: `p2p_verified`, histórico de dono), a venda vira `fill` com recibo e telemetria; o retry com a mesma chave devolve o recibo; CANCELAR devolve o ativo e não a taxa; o varredor vence o anúncio com a reserva (entidade `market`) · `server/mercado-jogadores-rotas.mjs` (`/anuncios`, `/anuncio`, `/meus`, `/anunciar`, `/comprar`, `/cancelar`; a vitrine nunca mostra o id de quem vende nem as taxas dele) · `test/e14-mercado.mjs` (dois compradores e compra × cancelamento em duas conexões; processo filho morto no meio da compra) · S2331–S2348 (sem S2346: o congelamento explícito duplicava a política e saiu); S2296–S2298, S2316 realvados para `posse-p2p.mjs` |
| **ST-14.10** · busca com dados reais | M | C | 9 | ✅ 01/10 · `engine/busca-mercado.mjs` (camada 0): os filtros com tipo e faixa (categoria, espécie, item, shiny sim/não, nível, natureza, potencial mínimo, preço), a ORDEM de lista fechada (recente, preço, preço desc), o cursor de teclado (base64url de [ordem, valor, id] — o de uma ordem não serve na outra) e a categoria do item pelo pack (bolas, essências, materiais, itens) · a migração `busca-st14.10` põe em COLUNA o que se filtra (nível, natureza, potencial, categoria) e o índice `player_market_busca`; o anúncio antigo é preenchido do retrato, e o que o retrato não tem fica NULL (não se inventa) · `server/mercado-jogadores-busca.mjs`: o SQL é montado só com pedaços fixos e `?`; sempre ATIVO, no prazo e do pack · `GET /api/player-market/busca` · a promessa do cursor está escrita: num conjunto estável não repete nem pula; o anúncio novo antes do cursor aparece ao recarregar · `test/e14-busca.mjs` (10 mil anúncios: o plano usa o índice) · S2349–S2362 |
| **ST-14.12** · histórico de preços sem inventar referência | M | C | 9, 14, 16 | ✅ 01/10 · `engine/historico-precos.mjs` (camada 0): FATO (última venda, menor anúncio ativo, N) aparece sempre; AGREGADO (mediana e média de 7 dias, volume de 24 h e 7 dias) só com amostra — ≥ 10 vendas, ≥ 5 compradores e ≥ 5 vendedores distintos na janela, senão "amostra insuficiente" com os três números; preço POR UNIDADE; volume em PC-T e em unidades, separados; janela UTC e o método escritos na resposta, sem "valor justo" · `server/mercado-jogadores-historico.mjs`: só venda liquidada do Market (`player_market_fills`), da MESMA série — pack, espécie, shiny E faixa de potencial (0–39, 40–59, 60–79, 80–100), ou o item; a série sem shiny ou sem faixa é recusada (não existe "Pikachu, qualquer um"); tira da referência, sem apagar o bruto: a venda anulada (`player_market_fills_exclusoes`, papel economia, auditado), a de conta sob suspeita aberta ou congelada, a entre contas que se descobriram ligadas — e a série é recalculada a cada pedido, então a revisão devolve · `GET /api/player-market/historico` · a média e o maior lance de buy order ficam para a entrega D (não há buy order) · `test/e14-historico.mjs` · S2363–S2377 |
| **ST-14.13** · a tela do Market | M | C | 9, 10, 12 | ✅ 01/10 · a QUARTA ABA DA POKÉDEX ("Market", ao lado das Trocas — comprar e vender é sobre a coleção) · `app/modules/mercado-jogadores-dados.mjs` (camada 0, em Node; o `-api.mjs` da ficha não nasceu: o `api.mjs` já é a porta única): as abas da spec §10.2 com o nome das criaturas vindo do PACK (`rotulos` — o Market não sabe a franquia), a busca virando consulta, o cartão com o TOTAL como número maior e o por unidade do lote, a prévia do anúncio com a MESMA função do servidor (taxa que sai agora e não volta, taxa da venda, líquido), a prévia da compra (total, o lote inteiro, se o PC-T elegível cobre), a série do histórico (shiny E faixa) e as linhas dele (agregado só com amostra), a recusa em palavras (vendido, desatualizado, desligado, o próprio, conta ligada, e o timeout dizendo que NÃO comprou e que reenviar é seguro) e a chave da compra POR TENTATIVA · `app/modules/mercado-jogadores-tela.mjs` (camada 4, só pinta): abas, filtros, grade de cartões, carregar mais pelo cursor, o anúncio aberto com o histórico da série, a confirmação, o comprado (e a vitrine sem ele na hora), anunciar com prévia ao vivo, minhas ofertas com cancelar ("a taxa não volta") e minhas compras · `GET /api/player-market/estado` (a conta pode negociar agora? o PC-T elegível) · Q5 com `tools/olhar-mercado.mjs` nas 4 larguras, com vendas de verdade (a série do histórico feita pela compra, nada gravado à mão), lido: o selo "brilhante" cobria o título no cartão → entrou na linha do detalhe; a data em inglês → pt-BR; depois de comprar, o anúncio vendido continuava na grade → a vitrine recarrega · Q7 dispensado pela DEC-20 · mutantes de navegador: 0 — toda decisão da tela é pega em Node · `test/mercado-jogadores-dados.mjs` · S2378–S2389 |
| **ST-14.11A** · buy orders de itens e fills parciais | G | D | gate C | ✅ 01/10 · construída por pedido do dono ("faça td da 14") — a onda D esperava dados de liquidez; as bandeiras são as da DEC-21, e o operador desliga o Market inteiro pela `player_market_enabled` · `engine/matching-mercado-jogadores.mjs` (camada 0): `previewOrdem` (N × P preso, 0,5% de criação que não volta, mínimo 100 no total), `ordemDoLivro` (preço → sequência → id), `quantoPreencher` (fill ≥ 50 PC e sem resto menor que 50: o pedaço encolhe ou não acontece), `casarVenda` (o vendedor contra o livro, ao preço da ORDEM; a própria e a pulada não consomem), `taxasDosFills` (a taxa do ACUMULADO da ordem vendedora: cinco fills pagam o mesmo que um; parcela zero não vira linha), `casarCompra` (a ordem nova contra o lote anunciado da etapa C — inteiro, nunca parcial retroativo; paga o preço do lote e a diferença é a melhora) · `server/mercado-jogadores-ordens.mjs`: a ordem prende pela reserva de moeda da ST-14.6 (`market:<id>`), e cada lançamento do fill leva o id dela — pagamento, taxa que queima, melhora devolvida —, então a conciliação da ST-14.16 a mede sem código novo; o item de quem vende sai pela mesma porta da troca (reserva → `moverReservados` → consumo); a escrita do fill confere versão e restante, e o CHECK `quantidade = executado + restante` segura a corrida que o código não previu; cancelar e vencer devolvem só o restante; idempotência por chave na ordem e na venda · migração `ordens-compra-st14.11a` (ordens, fills append-only, recibos de venda) · rotas `GET /api/player-market/buy-orders` (o livro AGREGADO por preço, sem quem pediu e sem as próprias de quem pergunta) e `POST …/create`, `…/fill`, `…/cancel` · o varredor vence a ordem pelo mesmo gancho `market` · o histórico do item conta a venda para a ordem (a do casamento com anúncio já está lá como venda do anúncio — não dobra) e diz a maior ordem aberta (spec §12) · a tela: aba "Ordens de compra" no Market — o livro do item, "quero comprar" e "vender para quem compra" lado a lado com a prévia da camada 0, e as minhas ordens com o que já veio, o que voltou e o que ainda está preso · Q5 com `SO=ordens tools/olhar-mercado.mjs` em 1440 e 420, lido: a estimativa contava a ordem do próprio jogador ("7 × 95") → o livro de quem pergunta exclui as dele · mutantes de navegador: 0 · L-222 decidida (o doce fica fora) · `test/e14-buy-orders.mjs` (19) · S2458–S2478, todos pegos; S2348 realvado |
| **ST-14.11B** · buy orders de criaturas por critério | M | D | 11A + dados | ✅ 01/10 · a pedido do dono · `engine/criterios-mercado.mjs` (camada 0): a ALLOWLIST (`dex`, `shiny`, `nivelMin`, `nivelMax`, `natureza`, `potencialMin` — critério desconhecido é recusa, nunca silêncio; o `exemplar` não é critério, é outra coisa que o shiny), `normalizarCriterios` grava o PACK, `hashDosCriterios` (independe da ordem das chaves), `atendeCriterios` (E: cada critério sozinho recusa, e diz qual), `versaoDoCatalogo` (espécies e naturezas) e `textoDosCriterios` · `server/mercado-jogadores-ordens.mjs`: `criarOrdemDeCriatura` (UMA criatura, o preço preso, a taxa de criação), `venderCriaturaParaOrdem` (quem vende escolhe a ordem e a instância; o servidor mede o retrato DELE contra todos os critérios — `CRITERIA_MISMATCH` com o motivo; a instância sai pela porta da troca, então a presa pela origem e a reservada não vão; a própria e a da conta ligada também não; a ordem de catálogo velho não casa e some da lista — quem a criou cancela e recebe o preço; o fill guarda o id e o retrato da instância entregue), `ordensDeCriatura` (critérios e preço, nunca quem pediu, sem as de quem pergunta) · sem casamento com anúncios: comprar anúncio de criatura segue sendo escolher UMA instância (spec §10.3) · migração `ordens-criatura-st14.11b` · rotas `POST …/create-creature` e `…/fill-creature`; o `GET …/buy-orders` traz a lista · a série de preços da espécie conta a venda para a ordem (normal e brilhante separados, pela faixa do potencial da instância) · a tela: "Itens | Pokémon" dentro da aba das ordens — quem procura (critérios, preço, e quais das MINHAS servem, pela mesma régua), e "Quero uma criatura" com a prévia que diz o aceite antecipado com todas as letras · Q5 com `SO=ordens-criatura tools/olhar-mercado.mjs` em 1440 e 420, lido: o cartão de quem procura em flex-coluna esticava o título e jogava a lista para fora → bloco · mutantes de navegador: 0 · `test/e14-buy-creatures.mjs` (11, um pela porta HTTP) · S2479–S2491, todos pegos; S2471 e S2473 realvados |
| **ST-14.15** · telemetria, simulador e gates | M | por onda | — | **gate C ✅ 01/10** · `engine/kpis-e14.mjs` (camada 0): o efeito de cada linha do ledger no total da conta (a linha que só mexe no reservado espelha o `reserva_delta` em `amount` — a mesma regra do `reconciliarNoBanco`, com teste que trava as duas listas iguais), emissão/queima por tipo, mint P2P (entrou − saiu: tem de ser 0), furo de conservação (emitido + mint − queima − outros sinks − circulante), concentração (top 10% e HHI), estoque controlado (emitido, existente, consumido, DUPLICADO) e o veredito `problemasDoGateC` · `server/economia-e14.mjs`: os fatos SÓ do ledger e das tabelas — nunca da telemetria — e `GET /api/admin/economia-e14` (`painel.ver`) · `engine/simulador-e14.mjs` (puro, semente) + `tools/simular-e14.mjs` → `docs/e14/SIMULACAO_E14.md`: os quatro cenários (baixa liquidez, equilíbrio, alta concentração, abuso de contas novas) e duas varreduras de sensibilidade, com semente, máquina, duração e limites — **a varredura achou que recusar a tentativa da conta ligada quase não reduz o funil; congelar a conta reduz 7× (L-228)** · `test/e14-economia.mjs`: seis contas trocam e compram com as bandeiras da DEC-21 e cada PC-T se explica (mint 0, furo 0, taxas mostradas = liquidadas, conciliação limpa, nada preso, a garantida muda de dono sem duplicar, shiny à parte, telemetria duplicada não move KPI, a bandeira desligada libera o escrow, o retry não cobra) · **D-138 corrigido junto**: o painel do E11 somava `amount` cru e acusava divergência a cada aposta perdida e troca liquidada · **DEC-21 aplicada no mesmo commit**: `p2p_transfer_enabled`, `p2p_trade_enabled` e `player_market_enabled` nascem ligadas com `liberadaPor: 'DEC-21'`; a costura `checkpointTeste` das rotas saiu (S2314, S2347 removidos — o código que mordiam não existe mais) · 17 defeitos plantados (S2390–S2406), todos pegos · **gate D ✅ 01/10** (depois da 14.11A e da 14.11B): `test/e14-gate-d.mjs` — seis contas usam as ordens de verdade (de item e de criatura, enchendo aos poucos, casando com lote anunciado, cancelando depois de um parcial, vencendo pelo varredor) e cada PC-T e cada unidade se explicam: sem mint, sem furo, nada emitido, unidades conservadas, conciliação limpa, nada preso; taxas mostradas = liquidadas (criação, anúncio, venda); `quantidade = executado + restante` e os fills somam o executado, o pago e a melhora de cada ordem; a mais antiga no mesmo preço enche antes; todo fill de vendedor ao preço da ordem; a liquidez do painel do operador passou a contar a venda para ordem (sem dobrar o casamento com anúncio) e diz as ordens abertas e o PC-T preso nelas · S2492–S2494, todos pegos; S2399 realvado |
| **ST-14.14d** · os alertas do mercado: preço fora da curva e giro | P | depois do gate C | 12, 14 | ✅ 01/10 · **L-227** · `engine/alerta-mercado.mjs` (camada 0): preço 3× acima ou abaixo da MEDIANA da série nos 7 dias antes da venda — só com amostra (a régua da 14.12; sem curva não há "fora da curva"); giro: ≥ 10 operações (vendas + compras + trocas liquidadas) e mais de 2 por criatura que a conta tem · baseline do piloto, a calibrar com os dados · `server/antifraude.mjs`: `varrerSuspeitas` ganha os sinais `preco` (do PAR vendedor–comprador, com a venda, o unitário, a mediana e a razão) e `giro` (da conta) — registro para o operador, nunca punição; a suspeita tira o par da referência de preço, então o alerta não envenena a própria curva · migração `alertas-mercado-st14.14d` (os dois sinais no CHECK) · `test/e14-alertas.mjs` (6) · S2425–S2429, todos pegos |
| **ST-14.14c** · o doce de origem presa prende a criatura | P | depois do gate C | 14, 5 | ✅ 01/10 · **L-223** · `engine/doce-origem.mjs` (camada 0): o doce da aposta é livre só se ela foi paga inteira com o que negocia (`BUCKETS_P2P`); soltar uma criatura presa dá doce preso; dar doce gasta os LIVRES primeiro (spec §4.3: não desvalorizar em silêncio) e, se usou preso, a criatura vira `maisRestrita([classe, 'promotional_bound'])` · `species_candy.presos` (migração `doce-origem-st14.14c`, com CHECK `0 ≤ presos ≤ quantidade`; o LEGADO lê o bilhete de cada crédito de aposta e não fica livre por omissão) · a liquidação passa a composição do bilhete; o resgate zera os presos; a resposta de dar doce diz `prendeu` · `test/e14-doce-origem.mjs` (7, um deles pela liquidação de verdade) · S2419–S2424, todos pegos; S1636 realvo · o AVISO antes de gastar (a tela) é da ST-14.3d |
| **ST-14.3d** · "isto prende" antes de gastar: pedra e doce | P | — | 14c | ✅ 01/10 · **L-224** fechada · `app/modules/prende-dados.mjs` (camada 0): `avisoDaPedra` (o lote MAIS ANTIGO com quantidade, a ordem do débito), `avisoDoDoce` (`gastoDoDoce` com os presos: só quando os livres não cobrem), os dois só para a criatura que negocia hoje e tem classe gravada; `textoDoArmeDaEvolucao` junta "perde golpe" (ST-10.3) e "prende" · o selo de evoluir diz "⚠ prende" e o primeiro clique arma (`exclusivos-tela`); o botão de dar doce diz "· ⚠ prende" e pede o segundo clique (`doce-tela`) · `GET /api/doces` passa a dizer `presos` (`docesPresosDe`), e o save os guarda · o teste que manda confronta tela e servidor: onde a tela avisa, `evoluirNaConta`/`darDoceNaConta` prendem; onde cala, não · **D-139** corrigido junto (o `carregar` descartava os lotes: o aviso do lance da 14.0D nunca chegou a um navegador) · Q5 com `tools/olhar-prende.mjs` em 1440 e 420, lido: em 420 "evoluir ⚠ prende" saía cortado ("oluir ⚠ pren") → quebra de linha · mutantes de navegador: 0 · `test/e14-prende.mjs` (6) · S2448–S2457, todos pegos; S1438 e S1943 realvados |
| **ST-14.14b** · a conta ligada detectada congela | P | depois do gate C | 14, 15 | ✅ 01/10 · `server/risco-mercado-jogadores.mjs`: a recusa da contraparte `conta_ligada` carrega `ligada`, e `comSinalDeLigada` (em volta de `criarTroca`, `ofertar`, `pronto` e `comprar`) congela QUEM TENTOU, fora da transação que a recusa desfez — `por: 'sistema:conta_ligada'`, motivo com a outra conta, evento `p2p_congelada_por_sinal`; a outra ponta não; `mesma_conta` não é sinal; repetir não abre outro; só o operador descongela (`descongelar`, pelo `agir`) · 2 testes em `e14-risco` · S2414–S2418, todos pegos · proposta pela simulação do gate C (**L-228**): hoje a contraparte ligada é recusada por TENTATIVA; a conta segue juntando PC-T e tenta de novo. Aceite: o sinal `conta_ligada` confirmado abre o congelamento da ST-14.14 com motivo automático, revisado pelo operador; sabotagem: recusar sem congelar |

## Recomendações que valem como padrão até o dono dizer o contrário

| id | recomendação |
|---|---|
| R16 | **o "100%" da DEC-18 inclui as ondas 0, A, B e C** (construídas, com as bandeiras de troca/Market desligadas até a DEC-21); a **D fica fora** — a própria spec a condiciona a dados de liquidez, que só o piloto produz |
| R17 | a **onda 0 entra na frente** do resto da fila de desenvolvimento: o D-135 põe bônus de cadastro na Liga ligada como PC-T |
| R18 | a **taxa shiny** do piloto é a da tabela da spec §16 quando o dono não fixar outra; enquanto isso, a ST-14.1 lê a taxa de configuração por pack, testada nos limiares 0/1 |

## Decisões (o dono delegou as duas em 30/09: *"Pode tomar essas 2 decisões e segue"*)

- ✅ **DEC-21 · a troca e o Market LIGADOS entre os amigos, em moeda simulada**
  — no commit que fechar o gate C, pela bandeira (`liberadaPor: 'DEC-21'`),
  como a DEC-16. Até lá, B e C são construídas e ficam desligadas. O
  `CHECKPOINT_25_1` continua `null`.
- ✅ **DEC-22 · a fonte do PC-T elegível: a primeira vitória em cada nó com
  insígnia da jornada** — 50 por ginásio, 75 por Elite Four, 150 pelo Campeão:
  850 por conta, a vida inteira. Elegível para a troca depois de 7 dias de
  conta. É a **ST-14.0E**, abaixo.
- ✅ **DEC-23 · o piloto na AWS ABERTO, sem convite** (o dono, 01/10: *"não
  quero invite, qualquer um pode acessar o link"*). O Caddy deixa de pedir a
  chave; fica o `X-Robots-Tag: noindex`, porque a arte ainda é emprestada
  (§0.3.1) e ser achado em busca é diferente de receber o link. Moeda simulada;
  o `CHECKPOINT_25_1` continua `null`. Junto, a pedido dele: **sem conta, o
  menu é só a vitrine** (Início, Arenas, Wiki, Como funciona, Regras) e as abas
  do treinador abrem o cadastro — ver a ST-2.8b.
- ✅ **DEC-24 · a stamina regenera 20/h** (era 8/h). Recomendação minha, seguida
  como padrão; o dono pode pedir outro número. O motivo é o jogador novo: ele
  tem UMA criatura, fazia 4 runs e esperava ~3 h por estágio (23 de stamina a
  8/h). Em 20/h é um estágio a cada ~70 min e a barra cheia em 5 h. O teto do
  dia segue nos freios que já existiam (rendimento decrescente da 7ª run —
  DEC-14 — e os 30 encontros do §P5). Spec §7.22.7 corrigida no mesmo commit.
- ✅ **DEC-25 · na jornada lutam 3 (ou tantos quantos o treinador trouxer), e
  ninguém fica parado** (o dono, 01/10: *"achei fácil demais, ele avançou
  super rápido"*). Recomendação minha, seguida como padrão — ver a ST-2.16.
  Custo dito: as regras de luta passam a `tbe-2`, e os times congelados na
  Liga com a `tbe-1` pedem "congele de novo" (um clique) antes da próxima
  partida.
- ✅ **DEC-26 · termos do gênero em inglês ficam** (o dono, 02/10: *"os nomes
  inglês/português é normal pra jogos, não precisa mudar"*). Run, wave,
  stamina, odds, pool, buff, shiny seguem como estão na tela; o guia usa os
  mesmos termos da tela e explica o que eles fazem. Desfaz a troca da ST-2.25
  ("cotação", "corrida", "bônus temporário"), que deixava o guia com um nome e
  a Arena com outro. Relatos futuros de "mistura de idiomas" não viram defeito.
- ✅ **DEC-27 · depois do teto de encontros, o XP segue inteiro e a moeda
  segue a calibrada** (recomendação minha, seguida como padrão — ST-2.26). O
  dono: *"depois que o limite bate, uma run rendeu só +2 XP e nenhuma moeda"*
  (D-148). O XP é progressão, e o desenho já dizia que a stamina e a curva de
  nível o seguram: XP/dia do diário 483 → 1.435, do maratona 1.181 → 14.759.
  A moeda é economia calibrada (DEC-14): paga cheia depois do teto, a do
  maratona iria de 1.536 a 4.668 por dia — fica como estava, e a tela diz
  "a moeda, só a dos abates". O dono pode pedir a moeda cheia; o número do
  custo está aqui.
- ✅ **XP do banco: o time aprende junto** (ST-2.26, recomendação minha): quem
  está no time e não foi à run aprende metade do XP dela, sem stamina e sem
  vínculo; a caixa não aprende.
- **Ainda do dono, e com recomendação escrita como padrão:** a taxa shiny (R18),
  o orçamento da Master Ball, os limites/cooldown/taxas finais (baselines da
  spec §11 e §16 até o gate C medir).
- **DEC-02 continua** para qualquer dinheiro real — nada da E14 a antecipa.

### ST-14.0E · a fonte do PC-T: a jornada verificada (DEC-22) — nova, onda B
- ✅ **01/10** — construída depois do gate C (ficou fora das ondas B e C: sem ela o PC-T de jogador não nascia). `engine/pct-jornada.mjs` (camada 0: `pcTDoNo` — final antes de selo antes de insígnia —, `tetoDaJornada` = 850 no pack, `pcTEmMaturacao`) · `server/jornada.mjs` credita `JOURNEY_PCT_REWARD` em `transferivel` na transação da vitória, chave `pct-<conta>-<nó>` (o progresso perdido não paga de novo) e a resposta diz `recompensa.pct` · `pcTElegivel(db, conta, agora)` desconta o PC-T da jornada nos 7 primeiros dias, com o relógio de quem chama (rotas, reserva, taxa) · a frase do fim da luta diz o PC-T · `test/e14-pct-jornada.mjs` (7) · plantados S2407–S2413, todos pegos; S2129–S2131 e S2246 realvos (o elegível mudou de forma)
- **Porte** P–M · **Servidor** sim · **Depende de** ST-14.0B · **Antes de** ST-14.7
- **Escopo:** a primeira vitória num nó com insígnia (`jornada.mjs`, a luta do
  servidor — ST-13.7) credita PC-T em `transferivel`, tipo próprio
  (`JOURNEY_PCT_REWARD`), chave do nó (`pct-<conta>-<nó>`), na mesma transação
  da vitória; valores em configuração versionada (50/75/150). `pcTElegivel`
  passa a descontar o PC-T da jornada de conta com menos de 7 dias.
- **Aceite:** repetir a vitória não paga de novo; nó sem insígnia não paga; a
  soma por conta nunca passa de 850; conta nova não troca antes de 7 dias; o
  aparelho (sem conta) não credita PC-T nenhum.
- **Sabotagem:** pagar a cada vitória; pagar em `bonus` (ou o contrário); a
  maturidade pelo relógio do cliente.
- **Portões:** Q1 Q2 Q3 Q6.
