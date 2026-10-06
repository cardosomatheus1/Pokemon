# RETOMAR — o ponto exato de onde continuar

**Este arquivo existe para uma coisa só:** o dono abre uma aba nova do Claude
Code, manda **uma frase**, e o trabalho continua sem perder nada.

> **O comando é:**
>
> ```
> leia docs/RETOMAR.md e continue de onde paramos
> ```
>
> Mais nada. Este arquivo aponta para todo o resto.

**Por que isto funciona:** nada importante deste projeto mora na conversa. Mora
no repositório — na Spec, no ROADMAP, nas LACUNAS, nos DEFEITOS e nas mensagens
de commit, que são longas de propósito. Uma aba nova não perde memória: ela
relê.

**E quem mantém este arquivo sou eu.** Ao fechar qualquer bloco, ele é
atualizado junto — do mesmo jeito que o link local. Se ele estiver velho, é
defeito meu.

---

## 0. ONDE PARAMOS — 05/10/2026 · AT6-15-integracao-final

**ST-2.40 (06/10):** com o time de verdade do 9º relato (Beedrill 13 +
Bellsprout 13, sem terceiro) o caminho até o chefe completava 37%: a cura por
abate em 10% da ST-2.35 dobrou o desgaste. Volta a 25% → 66% (D-176).
Próximo: ST-2.39, a run legível.

**9º relato (06/10), registrado:** o chefe da Floresta 2 "ainda parece
paredão". Medido no código que está no ar: com o time cheio ele cai; a
derrota vem do desgaste (quem cai não volta), e a tela não mostra quem caiu
— o relato leu os golpes do próprio Bellsprout como os do chefe (D-173).
Mais D-174 (evoluir na Rota OFF) e D-175 (chamar a Batida de volta).
**Próximo: ST-2.39**, a run legível.

**ST-2.37 (06/10):** o resto do 8º relato — a barra do celular não cobre
mais o fim da página (D-171), os cartões com stamina para uma run não ficam
apagados (D-172), a versão do código aparece no topo e na folha "Mais".
Encontros repetidos viraram L-256 (ST-2.38, proposta). Próximo na fila: a aba
Arenas ainda pinta a ~52 ms por quadro (medir), e a ST-2.38.

**ST-2.35 (06/10):** o dano chega ao time inteiro e o chefe deixou de ser
paredão (L-255, D-170). Na fila: ST-2.37 (o resto do 8º relato — barra do
celular cobrindo o fim da página, cards apagados com stamina, versão na tela,
encontros repetidos).

**ST-2.36 (06/10):** a luta fluida — sem desfoque nos elementos fixos, de ~13
para ~41 quadros por segundo no arnês (D-169).

**ST-2.34 (06/10):** a wave estica até 24 s em vez de 45 (a luta dura ~19 s);
run de ~4 min. **Próximo: ST-2.35** — o dano chega ao time inteiro (L-255:
só o primeiro luta, e cada abate cura 25%).

**ST-2.33b (06/10):** no mapa da run o time inteiro anda em fila (D-167) e as
placas não cobrem mais os sprites (D-168). Na fila: ST-2.34 (ritmo do Avanço);
L-254 pede print do dono.

**ST-2.33a (06/10):** prévia de evolução e resumo da luta em tabela, ficha do
golpe na linha inteira, palco clássico sem corte, D-166. Na fila: ST-2.33b (o
mapa da run: seguidores e placas; L-254 pede print) e ST-2.34 (ritmo do Avanço).

**ST-2.32 (05/10):** os defeitos de lógica do 7º relato (D-161 a D-165,
L-253). Na fila: ST-2.33 (o arranjo das telas novas do ramo codex) e ST-2.34
(o ritmo do Avanço: o time quase não apanha, waves de ~45 s).

**ST-2.31 (05/10):** o banco alcança, não ultrapassa — leva até a mais forte
menos 3; o Campeão sai do 4º dia para o 34º (casual), 31º (diário), 7º
(maratona). L-251 fechada, L-252 aberta (a comprada sobe o teto).

**No ar em 05/10 (b2a1354):** os 9 commits do ramo `codex/arena-jornada-finalizacao-20261005`
entraram no `claude/docs-planning-tests-6hjthq` por avanço rápido, com um commit de
integração que deixou a suíte inteira verde 2/2 (3353 testes; 6 vermelhos e 1
instável corrigidos — ver a mensagem do b2a1354). Instância `pokearena-26`.

Branch de entrega: `codex/arena-jornada-finalizacao-20261005`.
Integração implementada: objetivos antes/depois da Liga; preparo/evolução;
filtros de nível/tipo/IV e ficha de mercado; missões úteis persistidas;
funil/metagame/D1/D7/economia; campanhas de bônus e earned com verba
reservada/coorte fechada; prévia cosmética e neutralidade no combate.
O branch inclui os commits anteriores de TBE4, acesso/ranked/defesa/taxa 10%,
Avanço TBE, catálogo, orientação e XP progressivo/offline 150/225/300/450 XP/h.

Relatório 13, Spec §9.19 e Build AT6-15 descrevem os contratos aplicados.
VALIDACAO_INTEGRACAO_FINAL: 69 suítes/628 testes verdes; OFFLINE_FINAL:
16 testes isolados, total 644. HTTP/MIME verificados no servidor real.
Para prévia local, executar `PORTA=8099 npm run servidor` e abrir
http://localhost:8099/app/index.html enquanto o processo estiver ligado.
SABOTAGEM_INTEGRACAO_FINAL: 23/23; BASE_FINAL: 17/17.
Q5 real verde em 390/768/1440, incluindo 8 h = 3.600 XP na fase 4 sem duplicação.
Quatro processos geram um crédito e uma retirada da casa. Âncoras conferidas.
Comparação cosmética: 30 lutas com mesma semente idênticas antes/depois.
Inspeção leu replay, filtros, evolução, resgate e preço/prévia da Boutique.

Não existe campanha ativa por padrão. Até 450 inclui a rotina de 80 e depende
de 370 reservados por vaga; earned usa dotação exclusiva, nunca converte
bônus. O estudo demonstra que não cabe prometer o máximo a toda a população.
Nenhum pagamento real, saque, passe sem conteúdo, merge ou tag nesta entrega.
L-AT6-06 (secundários), L-GQ-01-01 (concentração de rotas), L-AT6-15-MIDIA
e revisão integral/piloto permanecem delimitados no ROADMAP/LACUNAS.
Não chamar recorte de suíte/Q2 integrais ou retenção observada.
Três alterações de arte alheias ao escopo foram preservadas fora do commit.

### Estado anterior preservado para rastreabilidade

## 0-histórico. ANTES — 05/10/2026 · AT6-05-leitura

Último bloco: comparação Publicado/Atual na Liga e fatos da luta no fim da
Jornada/replay 6×6. Nível pelo XP, IV, natureza, evolução, ordem, preset e
golpes mostram diferenças concretas; ficha usa a TBE, incluindo perdas de
natureza. Golpes mostram poder/tipo/categoria/precisão. Nenhuma republicação
automática ou chance inventada. Resumo usa o log, limita HP ao restante e
respeita a perspectiva do desafiante; mostra erros/críticos/efetividade/KO.

Snapshot agora inclui catálogo treinador na impressão do conteúdo: times
anteriores precisam republicar; log histórico continua válido. TBE `tbe-4`,
combate/economia e banco 150/225/300/450 XP/h por fase permanecem iguais.
Narrativa de empate não afirma que ninguém caiu; empates Monte Carlo não
viram derrotas. Texto do treino distingue a arena comum da arena 6×6.

VALIDACAO_COMPARACAO_RESULTADO.json: 30 suítes/256 testes verdes, com teste
offline repetido isoladamente após cache de import sem DOM na execução inicial.
21 testes novos incluem 100 lutas PvE/30 lutas 6×6. Sabotagem: 14/14 S90701–14;
2.721 âncoras presentes. Relatório 12/Spec §9.18. D-AT6-05-04 registra ordem
do teste UI legado, sem esconder a falha inicial. HTTP/MIME dos módulos passou.

Q5/inspeção das larguras continuam pendentes por Chromium ausente. Funil,
instrumentação e apresentação integral AT6-05/07 não concluídos. Local
somente, sem publicação. A fila permanece exclusivamente no ROADMAP.

### Bloco anterior — GQ-01-rotas (`e69826f`)

Orientação de golpes por equipe no Avanço assistido, política
`cobertura-duelos-1`. Usa equipe/estágio selecionados, dano esperado TBE,
IV/nível/moveset, elenco e período públicos. Mostra motivo, alerta da rota
selecionada e botão de comparar; não inicia/gasta ou troca membros. Recusa
substitui conselho executável. Rota OFF e regras de combate/recompensa iguais.
Controle repinta ao trocar rota/estágio/equipe e no relógio existente.

VALIDACAO_ORIENTACAO_AVANCO.json: 21 suítes/292 testes verdes.
SABOTAGEM_ORIENTACAO_AVANCO.json: 7/7 mutantes dirigidos capturados.
BALANCEAMENTO_ORIENTACAO_AVANCO.json: 2.400 runs pareadas/12 cenários em holdout separado,
planta/água no nível 5: Floresta 3%→Deserto 100/95%; fogo mantém Floresta 79%.
Não publicar chance pela orientação: ela não simula iniciativa/HP acumulado/
ordem dos membros/poções/guia. Comparação não prova rota ótima ou garantia.

Spec §7.22.21, relatório 11; L-AT6-04 parcial: orientação funcional aplicada,
Q5/primeira sessão integral pendentes. L-GQ-01-01 tem dono GQ-02/AT6-05 para
distribuição de farm/capturas entre rotas. Navegador Chromium ausente: pintura
em alvo sintético e grafo/HTML não certificam UI/legibilidade. Local somente,
sem publicação. Banco continua 150/225/300/450 XP/h por fase, sem mudança.

Bloco anterior: AT6-14-rivais (commit `7fd09fd`).
Política `rival-2` ordena golpes dos NPCs por dano esperado TBE
com precisão do catálogo, mantendo nível/especialização. Referência neutra de
base 80 no mesmo nível, sem RNG/leitura do jogador. TBE continua `tbe-4`;
novas runs têm etiqueta aditiva, anteriores mantêm os golpes congelados.

Auditoria: 15.100 combinações, 3.461 ordens e 30 conjuntos de golpes alterados;
23/16 pares de dominância Kanto/original. Ginásios com 2.000 simulações por
referência e 3.500 runs pareadas mantiveram todas as taxas anteriores.
Mais 3.300 runs medem entrada por bioma: nível 5, Praia/planta 98%,
Floresta/fogo 81%, Deserto/água 92%, sem poções e sem validar acesso da conta.
L-AT6-04 permanece aberta: estudo não aplicou orientação inicial. L-AT6-05
resolvida; L-AT6-06 registra diversidade de secundários ausentes.

VALIDACAO_RIVAIS.json: 25 suítes/212 testes; SABOTAGEM_RIVAIS.json: seis
mutantes dirigidos. Q5 anterior e publicação continuam pendentes. Local somente.
O teste do Centro passou a usar DOM sintético em processo isolado: a análise
prévia de módulos sem DOM deixava avaliação rejeitada no cache do Node.
Reverificação da ordem módulos→Centro e mutantes de catálogo cobre esse ajuste.

Relatório 10 em `arena-treinadores/10_AVALIACAO_RIVAIS_E_ENTRADA.md`;
Spec §8.19. Próxima execução segue prioridades no ROADMAP: orientar entrada,
comparação/resultado, progresso/captura/evolução, mercado/cosméticos e Q5.
Ainda não declarar toda AT6/GQ concluída.

Bloco anterior: XP-OFF-2 (commit `57388f6`).
Treino do banco a 150/225/300/450 XP/h por fase, pedido do dono
para meio termo após considerar 300/h demais. Em oito horas, fase 1: 1.200 XP
por criatura. Fase congelada para o intervalo seguinte, derivada do XP da
coleção; não promove horas anteriores. Retorno automático e colheita direta
compartilham fase/taxa; cliente não define horário/valor. Vínculo 1/h, cap
12h, sem aventuras/itens/encontros e sem pagamentos duplicados.

VALIDACAO_RITMO_OFFLINE.json: 25 suítes, 351 testes verdes.
SABOTAGEM_RITMO_OFFLINE.json: 4/4 capturados.
ESTUDO_RITMO_OFFLINE.json: nível 5→14 em 8h; retornos de oito em oito horas
levam ao 26 em 24h e 42 em 48h. L-XP-OFF-04: rever referências gerais de
espera/captura/evolução. Q5 e publicação pendentes; progresso local somente.
Spec §7.22.20 é a taxa vigente. As funções de janela antigas mantêm default
3 só por compatibilidade; runtime sempre fornece o ritmo novo.

Bloco anterior: AT6-14-info (commit `094db4a`).
Catálogo explícito para o treinador e dados de poder/categoria/
precisão visíveis na escolha dos golpes do Centro, nas duas abas. Spec §8.18;
catálogo da Arena comum preservado. TBE consome a mesma precisão que a ficha.
Sem secundários; não prometer prioridade, paralisia/recarga pelo nome.
194 testes focados (22 suítes), 4/4 mutantes. 320 combates nos quatro presets
iguais à migração legada; goldens/paridade BR passaram. Relatórios
VALIDACAO_CATALOGO.json e SABOTAGEM_CATALOGO.json. Q5 pendente; integração
HTML/DOM sintético não certifica legibilidade. L-AT6-05: seletor de movesets
rivais ainda usa 100% na ausência de precisão e pede medição própria.

Branch local `codex/arena-completa-20261004`. Bases: AT6-base `3a4e630` e
XP-OFF `b2166e4`, AT6-13 `8ce7606`. AT6-13 implementa combate real nas novas runs do Avanço;
contrato Spec §7.22.19 e documento 09. Runs antigas conservam sua regra.

Nível/IV/natureza/golpes reais congelados na entrada, TBE contínua, HP
individual, guia consciente, recuperação sem reviver, poções/recuo no
instante correto, abates parciais persistidos, titular e dano reais na cena.
SQL agora mantém IV/natureza. Releitura válida da conta não fica bloqueada
por erro de treino; aviso de treino permanece sem inventar crédito.

`VALIDACAO_AVANCO.json`: 37 suítes, 470 testes, zero falhas.
`SABOTAGEM_AVANCO.json`: 8/8 capturados. O teste de persistência exige abate
sem evento auxiliar. `BALANCEAMENTO_AVANCO.json`: 3.500 runs exploratórias;
nível/IV ajudam, mas iniciais nível 5 na Floresta vencem 5/78/4% (planta/fogo/
água). L-AT6-04 permanece aberta: não afirmar entrada equilibrada.

XP progressivo inclui expedições idle/Rota OFF e Avanço: fatores 1/1,5/2/3
por estágio, prévia e pagamento iguais. Treino independente funciona no
retorno: agora 150/225/300/450 XP/h e 1 vínculo/h, até 12h/ausência, frações,
sem retroatividade inicial e sem tempo em aventuras. Não confundir taxa de
treino da coleção com XP por estágio escolhido nas expedições. XP-OFF tem seu relatório histórico
338 testes e 6 mutantes; regressões adicionais incluídas nos 470 atuais.

Q5 pendente por ausência de Chromium; não afirmar inspeção visual ou release.
Sem deploy. Push anterior bloqueado pela revisão automática por ausência de
autorização explícita para publicar a branch. Não repetir sem autorização.
Imagem de Agatha e banner de Zapdos preexistentes permanecem fora dos commits.

Próximos trabalhos: calibração/orientação inicial, AT6-14 dominância/rivais, comparação
e funil AT6-05/07 e fichas GQ, na ordem do ROADMAP. Mercado/cosméticos e
campanhas públicas não estão concluídos. Não encerrar AT6/GQ por estes blocos.
Executar na raiz `/workspace/scratch/20f7386fd0c9/pokemon-implementation`:
`node tools/servir.mjs --porta 8099`, `http://127.0.0.1:8099/app/index.html`.

## 0-histórico. ANTES — 04/10/2026 · AT6-base

Branch: `codex/arena-completa-20261004`, baseada em `82e47f8`.
O bloco principal foi implementado; apresentação e plano completo permanecem
parciais. Não houve deploy nem tag de release.

- TBE `tbe-4`: atributos reais, iniciativa ±10%, IA com precisão/crítico/dano
  esperado, replays versionados. Ginásios recalibrados; contrato novo explícito
  na Spec §8.17. Arena comum preservada.
- Ranked: campeão + seis espécies, mesma faixa de rank, filtros de MMR/power/
  níveis e estimativa pelo motor real (128 pares; probabilidade e IC). Amistoso
  não altera ranking. A aposta só é criada pela fila do servidor.
- Bronze 50 e tabela crescente; 10% para ledger da casa. Carteira, defesa,
  partida e ranking são atômicos. Defesa: snapshot atual, 24h, três partidas e
  três stakes brutos. Sem renovação automática. Campanha interna com teto,
  saldo existente e idempotência; sem endpoint público de emissão.
- Kit único de campeão: 300 PC-B. XP repetido da Jornada: 30s e 6000 por
  conta/dia. Não mudou o XP do Avanço nem DEC-29/31. Ranking exige atividade
  real da temporada atual. Textos da UI explicam as novas condições.

**Evidência:** `docs/arena-treinadores/VALIDACAO_FOCADA.json`,
`SABOTAGEM_FOCADA.json` e `BALANCEAMENTO_TBE4.json`. O último tem 40 mil
combates novos: +1 nível variou de 57,5% a 70,7%; IV31 versus IV15 de 70,4%
a 97,7%. Por isso power sozinho não autoriza o confronto. Não são odds globais.
O recorte focado passou em 242/242 testes de 29 suítes; foi solicitado pelo
dono e não equivale à suíte inteira. HTTP local do modo estático verificado
com status 200 nesta sessão; não substitui inspeção em navegador.

**Limites de validação:** Q5 não executado: não há Chromium disponível neste
ambiente. Nenhuma alteração de CSS/layout; não houve revisão visual nem Q7.
Q2 dirigido captura 17/17 defeitos; o Q2 legado acumulado continua pendente
antes de tag. Há testes de rollback e HTTP real, mas não teste de carga global.
A imagem `tools/previas/_jornada/mapa-agatha-1920.png` já estava alterada na
retomada; não pertence a este bloco e deve ficar fora do commit.

**Retomada:** seguir a prioridade AT6/GQ no ROADMAP. AT6-13 exige combate real
no Avanço, não apenas repassar IV ao cálculo agregado; versionar runs antigas,
preservar economia, HP, cura, captura e CAS. O contrato 09 explica o recorte.
Modo local: `node tools/servir.mjs --porta 8099`, endereço
`http://127.0.0.1:8099/app/index.html` no ambiente que executar esse comando.
Isso não certifica o fluxo PvP autenticado. Raiz local:
`/workspace/scratch/20f7386fd0c9/pokemon-implementation`.

## 0-histórico. ANTES — 01/10/2026

```text
o ÚLTIMO   ST-2.8 · o jogo no celular (01/10, pedido do dono: "tá feião p
           celular" e "essa imagem da floresta tá muito perto"). Até 640 px o
           menu é uma barra no rodapé (Arenas, Liga, Rotas, Time + "Mais", que
           veste o nome da aba aberta), o topo cabe numa linha, a cena das
           Rotas abre em 1× e as rotas enchem duas colunas. Olhar no celular:
           node tools/olhar-celular.mjs  (capturas em tools/previas/_celular/).
           Próximo do cenário: ST-2.9 (L-231, a Floresta sem árvore na vista).
           ST-2.26a (02/10): o banco aprende metade do XP; D-148 (o teto
           zerava o XP da run) e DEC-27 (a moeda segue a calibrada).
           DEC-29 (02/10, o dono): a stamina regenera 30/h (era 20); DEC-29d
           equilibra (substitui 29b e 29c, que cortavam por run e o dono
           recusou): toda run paga 88% do XP e 96% da moeda — o dia médio fica
           em 101%/100%.
           ST-10.27 (02/10): a luta da Jornada no palco clássico (FireRed):
           rival de frente em cima, o nosso de costas embaixo, a caixa narra
           o porquê.
           ST-2.27a (02/10): a tela diz QUANDO volta (encontro e stamina);
           o teto como balde foi medido e recusado (DEC-30).
           ST-2.27b (02/10): o outro chefe na tentativa seguinte, a repetida
           40% mais curta, "tentativa N" na tela (L-242).
           ST-2.28 (02/10, o 6º relato): a ST-2.28a fez a evolução CHAMAR
           ("✨ Kakuna pode evoluir para Beedrill!" embaixo da cena, D-155).
           A ST-2.28b fechou os pequenos (D-154 a aba velha recarrega,
           D-156 "3 de 3 na equipe", D-157 a mesma hora da volta, D-158 "+2
           outros itens"). A ST-2.28c fez a moeda não despencar (DEC-31:
           depois do teto, 35% dos vistos; queda 85%; toda run 84%).
           A ST-2.28d soltou o cansado da equipe que vai (D-159).
           ST-2.30 (DEC-32, o dono): teto de encontros 45, chance ×0,8, bolas
           ×0,8 na Loja.
           PRÓXIMO: ST-2.27d (D-151), depois ST-2.29 (o doce, L-249).
           ST-2.27c (02/10): sem stamina, o botão diz "Equipe descansando ·
           HH:MM" e embaixo da cena "Enquanto a equipe descansa": quem tem
           stamina (botão "Sair com…"), a Batida que põe o banco a treinar
           (L-244 fechada; D-152, a frase cortada no celular). PRÓXIMO:
           ST-2.27d (D-151: as runs por dia da emissão saindo do motor).
           Q2 PENDENTE: o `sabotagem:bloco` morria desde a ST-2.22 (D-153,
           consertado); a fila acumulada é de ~215 defeitos (~2 h). Parado
           a pedido do dono em 02/10 depois de 76 — o cache guarda os PEGOU.
           Roda inteiro antes da próxima tag (ou `npm run sabotagem:bloco`
           numa janela longa).
           D-151: a medição da emissão não vê a regeneração (vai na ST-2.27).
           ST-2.26b (02/10): D-149 (o chefe da wave perdida aguenta com vida,
           barra = número) e D-150 (o 400 do mover). a seguir: ST-2.27, a forma
           do dia (DEC-28: as Rotas se esgotam em ~35 min; medir 1 h × 3
           visitas × maratona antes de mexer — L-242, L-243, L-244).
           DEC-26 (02/10): termos do gênero em inglês ficam (run, wave,
           odds, buff…); o guia usa os da tela.
           ST-2.25 (02/10): os achados do dono no guia + D-147 (o "?" dentro
           do cartão-botão partia o cartão). L-241 (sonda de sabotagem sem
           linha de base) para o arnês.
           ST-2.24 (02/10): o guia — "Como funciona" explica o jogo inteiro
           (guia-dados.mjs); "?" no potencial, bolsa, carteira e Mercado.
           L-236 fechada (os nomes ficam). Abertas: L-239 (✦), L-240.
           ST-2.23 (01/10): a curva do começo — a jornada dá XP a quem
           lutou; a captura nasce no nível do estágio (L-233); Floresta 5/5/6.
           PEDE VEREDITO DO DONO: subir as capturas antigas ao nível de hoje.
           ST-2.22 (01/10): D-144 (o doce apagado da conta depois da
           rodada), D-145 (run fantasma: 409; relógio do servidor; aviso de
           versão nova), D-146 (a run que cai, colhida e dita). PEDE VEREDITO
           DO DONO: devolver os doces que o resgate tirou desde 30/09.
           ST-2.21 (01/10): o ritmo da porta — no estágio 1 a wave anda a
           70% e a perdida acaba em 60% (passoDaWave); run 13,9 → 8,7 min.
           Dificuldade igual (§Q4). Registradas L-236 (moedas, PEDE VEREDITO
           DO DONO), L-237 (ordem do time), L-238 (caminho até a Trocas).
           ST-2.19 (01/10): o relato do dono como jogador — sprites brilhantes
           (D-143), favicon, abre na escolha do inicial, textos da conta.
           PEDIDO AO DONO: battle-theme.mp3 e lojas.mp4 (L-176).
           ST-2.17 (01/10): o cenário da luta — onze lugares em camadas
           (pve-cenario.mjs), chão em perspectiva, plataformas, partículas.
           ST-2.16 (01/10): a jornada pede o nível do nó (DEC-25) — lutam 3,
           os mais fortes; ninguém fica parado (último recurso, regras tbe-2:
           os times congelados da Liga pedem congelar de novo).
           ST-2.15 (01/10): a jornada volta a andar (D-142) — o clique de lutar
           quebrava depois de gravar; o fim com conta diz o que pagou.
           ST-2.13 (01/10): equilíbrio — a forma evoluída só se pega no estágio
           da faixa de nível dela; o chefe evoluído do estágio 1 deixa a forma
           jovem (Machoke → Machop); a Rota OFF tira as evoluídas fora da faixa.
           ST-2.12 (01/10): kit de 10 Poké Balls + 3 Poções (com conta, presente
           que não troca), a stamina e o XP ao vivo na run, regenera 20/h
           (DEC-24), a linha da bolsa embaixo da cena.
           ST-2.10 (01/10): o boneco das Rotas vira e anda (D-141, a folha do
           traje padrão), o relógio diz quando vem o próximo selvagem, a run
           no celular abre pela cena, a stamina não parece mais vida, e a cena tem
           o botão grande "⚔ Iniciar batalhas".
           ST-2.8c (01/10): no site, o visitante SÓ ASSISTE a Arena (sem
           aposta, sem painel); menu dele: Início, Arenas, Como funciona, Regras.
           ST-2.8b (01/10): sem conta, o menu é a vitrine e as abas do treinador
           abrem o cadastro; no site, só conta real (nome, e-mail, senha); o
           link abre sem convite (DEC-23), com `noindex`. NO SEU PC: a linha de
           base visual mudou (o menu do visitante) — `npm run gerar:visual` uma
           vez antes de `npm test`.
o RESUMO   A E14 (Shiny, Trading & Player Market) ESTÁ COMPLETA — todas as
           ondas (0 a D) e os quatro gates. Em 01/10, a pedido do dono ("faça
           td da 14"): o shiny no palco da Liga (14.3c), o aviso "isto prende"
           antes de gastar pedra e doce (14.3d, com o D-139), as ordens de
           compra de itens (14.11A) e de criatura por critérios (14.11B), e o
           gate D. A troca e o Market estão LIGADOS (DEC-21, moeda simulada).
           O que resta da fila ESPERA alguém ou algum dado:
             · as lojas com NPC (1.31b, L-176) — o vídeo que só existe no PC
               do dono
             · o visual adiado pela DEC-20 (ST-10.26)
             · o piloto com amigos (ST-7.2) — o dono e o roteiro em
               docs/PILOTO.md
             · L-229 / ST-2.7 (o vão sob a bolsa no idle largo) — o olhar
               do dono
           E o Q2 completo em fatias, que é o nível da TAG: 3/10 em diante.
```


```text
o NO AR    https://34-224-231-194.sslip.io  (01/10 — o piloto na AWS, Lightsail
           us-east-1, micro_3_0, instância `pokearena-31` desde 06/10 com a ST-2.40
           (dae1ca3, build b7c2ffb11f82 — a mesma marca que a tela mostra
           como "versão"), IP estático `pokearena-ip`; a máquina de antes
           está no snapshot `pokearena-antes-st240`). ABERTO a quem tem o
           link, sem convite (DEC-23, 01/10), com `noindex` (não aparece em busca).
           Sem conta, o menu mostra só a vitrine; o resto pede cadastro.
           Atualizar: `deploy/lightsail/LEIAME.md` (dá para fazer sem SSH).
           Backup: cópia diária do banco em /srv/pokearena/app/dados/copias/ (04:00 UTC)
           e o SNAPSHOT AUTOMÁTICO do Lightsail da máquina inteira (07:00 UTC, fora
           do disco — é o que salva se a instância for apagada).
o LINK     http://localhost:8099/app/index.html
           sobe com:  node tools/servir.mjs --porta 8099
           (a Liga de times com contas e partidas: node tools/olhar-liga.mjs
           sobe o servidor completo num processo e captura as telas)
a PASTA    C:\Users\gdult\pa4
o ESTADO   E13 FECHADO (30/09): a ST-13.5 inteira (13.5a–e) e a ST-13.4 —
           com conta, o idle é DA CONTA. A chave `IDLE_NA_CONTA` está LIGADA:
           a leitura no boot, toda escrita pela rota nomeada do servidor
           (`idle-acoes.mjs`, `colecao-acoes.mjs`), a luta da jornada
           decidida no servidor e encenada no aparelho, o aviso da DEC-17 no
           cadastro, o Sair que apaga o cache da conta, e o aviso "sem
           conexão" no topo das abas do farm.
           ENSAIO no navegador: node tools/olhar-conta.mjs — cadastro com o
           aviso → conta nova vazia → inicial no banco → navegador LIMPO
           entra e a coleção está lá → sem servidor, o aviso (20/20 passos
           nas quatro larguras). Está no roteiro do piloto (docs/PILOTO.md)
           · antes: ST-10.23 (o mapa desenhado à mão; o Tiled como editor —
           node tools/mapa-tiled.mjs exportar|importar), DEC-16, ST-13.8
           · suíte 2866/2866, repetir 2/2 (medido 30/09, na 10.25)
           Q2 completo em fatias: 1/10 e 2/10 VERDES; seguir com
           node test/sabotagem.mjs --fatia=3/10, até 10/10
           · ST-10.24 FECHADA (30/09): a estrada é CHÃO no mapa da jornada
           (autotile, ponte e escada saídas da própria estrada, só o
           trecho próximo à vista, penhasco com face). Q7: estrada 3 → 4–6,
           altura 4 → 5–7; aceite ≥7 não atingido — mundo e publicado
           seguram em 4–6 pelo chão e pela composição (L-219)
           · ST-10.25 FECHADA (30/09): a composição do mundo — contorno em
           duas oitavas, peça de 4 px, nó trancado só o ponto, clareira,
           pedras, lava em pixel, escala. Q7: mundo/publicado 4–5, estrada 6,
           altura 5–6; aceite ≥7 não atingido — o resto é o desenho (L-220)
           · 1.28 FECHADO (30/09): o HISTÓRICO das expedições e das runs
           (L-141, L-109) — o quadro nas duas abas do farm; com conta o
           servidor o monta das colheitas gravadas. Suíte 2876/2876, 2/2
           · E14 NO PLANO (30/09): o dono mandou a spec e as stories de
           Shiny, Trading & Player Market — em docs/e14/, encaixadas na
           Parte 3 do PLANO e na linha 12 da fila. A Spec §21 ("não fazer
           trading/marketplace") foi relida: construir sim, ligar é a DEC-21.
           Achado: o bônus de cadastro nasce em transferível (D-135)
           · ST-13.9a FECHADA (30/09): com conta, a loja do idle, o estilhaço
           e a montagem pelo servidor (D-136) — a pergunta do dono "Já
           conectou tudo ao banco?" achou que não. Falta a 13.9b (missões e
           escada da Pokédex), que vem ANTES da E14
           · ST-13.9b FECHADA (30/09): a escada e as missões na conta —
           D-136 fechado. Com conta, nada de valor de jogo fica só no
           aparelho (o que resta no navegador é preferência: tema, zoom,
           aba, preset)
           · ST-13.9c + ST-14.0A FECHADAS (30/09): a matriz de fontes da
           economia (docs/e14/MATRIZ_FONTES_ECONOMIA.md) achou o D-137 — com
           conta, login e desafios não pagavam o PC-B — e ele foi corrigido.
           · ST-14.0B1 FECHADA (30/09): o bônus de cadastro é PC-B (D-135);
           a L-221 registra que 1.000 de PC-B passa do teto de saldo.
           · ST-14.0B2 FECHADA (30/09): a carteira da troca — reserva só de
           PC-T elegível, transferência com taxa queimada, operação
           idempotente num commit só, painel sem contar troca como emissão,
           bandeiras da E14 desligadas
           · ST-14.2 FECHADA (30/09): a instância com shiny, treinador
           original, espécie de origem, encontro único e histórico por
           gatilho; soltar arquiva a identidade
           · ST-14.0C FECHADA (30/09): a bolsa por lote com a origem, e o
           derivado herdando a mais presa (captura, evolução, compra).
           · ST-14.5 FECHADA (01/10): a política única de negociabilidade
           — engine/negociabilidade.mjs + server/elegibilidade.mjs; o
           inicial e o lendário presos, o item só pelo lote limpo, só PC-T
           elegível; soltar pergunta a ela. A ONDA 0 DA E14 ESTÁ FECHADA.
           · ST-14.1 FECHADA (01/10): o shiny sorteado no encontro pelo
           servidor (raiz própria, versão da taxa), a captura herda; o lance
           grava o recibo e o retry o devolve; D-129 corrigido.
           · ST-14.4 FECHADA (01/10): a bola garantida por capacidade do
           pack, antes do teto; emissão só por fonte com orçamento (a
           primeira vitória sobre o Campeão: 1 por conta, 500 no piloto).
           · ST-14.0D FECHADA (01/10): o quadro do lance mostra o encontro
           brilhante, oferece a bola garantida (com pergunta) e avisa
           "⚠ prende" quando a bola sai de lote preso; a conta desce shiny,
           origem e lotes. Q5 lido nas 4 larguras.
           · ST-14.3a FECHADA (01/10): o snapshot da Liga com o shiny
           (aparência), e o time com criatura que saiu da conta não luta
           mais (desafio, fila, bot); o replay fica.
           · ST-14.3b FECHADA (01/10): o cosmético do perfil virou
           prestígio (aura neon ◆, nada perdido); o shiny verdadeiro na
           carta, na ficha e na captura. A ONDA A DA E14 ESTÁ FECHADA.
           · ST-14.6 FECHADA (01/10): as reservas e o escrow — uma
           criatura numa oferta só, o lote e o PC-T reservados não se
           gastam, a reservada não evolui/não sai/não luta; tudo ou nada.
           · ST-14.8 FECHADA (01/10): as taxas exatas (BigInt), queimadas,
           com a versão da política gravada no lançamento.
           · ST-14.14 FECHADA (01/10): congelar a troca de uma conta
           (operador economia, auditado; o escrow dela não solta sozinho),
           a contraparte nunca é a mesma pessoa, os limites da spec §7, e a
           captura acima da banda conta pelo evento.
           · ST-14.16 FECHADA (01/10): o varredor da economia (a oferta
           vence inteira, a passada ao ligar devolve o que venceu na
           queda) e a conciliação do escrow (escreve, não conserta; a
           conta em divergência para de ofertar).
           · ST-14.7a FECHADA (01/10): a troca direta no servidor e na
           API — pronto dos dois, lock de 5 min, confirmação pelo hash do
           que se viu, liquidação dos dois lados numa transação.
           · ST-14.7b FECHADA (01/10): a aba "Trocas" na Pokédex — a
           mesa com os dois lados, o editor, o relógio do lock, a recusa
           em palavras. Mostra "desligadas" até a DEC-21. A ONDA B DA E14
           ESTÁ FECHADA.
           · ST-14.9 FECHADA (01/10): o Market de preço fixo no servidor
           — anunciar (a taxa queima), comprar pelo preço visto (líquido
           ao vendedor), cancelar; a posse muda pelo mesmo caminho da troca.
           · ST-14.10 FECHADA (01/10): a busca do Market — filtros E,
           ordem de lista fechada, cursor estável, índice.
           · ST-14.12 FECHADA (01/10): o histórico de preços — fato
           sempre, agregado só com amostra (10 vendas, 5 e 5 distintos),
           normal e shiny nunca juntos, suspeita e anulada fora.
           · ST-14.13 FECHADA (01/10): a aba "Market" na Pokédex — busca,
           cartão, histórico da série, compra com confirmação, anunciar
           com prévia, minhas ofertas e compras. A ONDA C DA E14 ESTÁ
           FECHADA.
           · GATE C + DEC-21 FECHADOS (01/10): o piloto de seis contas
           reconcilia (mint P2P 0, furo 0, taxas mostradas = cobradas,
           nada preso, nada duplicado); o operador lê a economia E14 em
           GET /api/admin/economia-e14; o simulador escreve
           docs/e14/SIMULACAO_E14.md (node tools/simular-e14.mjs); o D-138
           (o painel do E11 somava a reserva) corrigido junto. A TROCA E O
           MARKET ESTÃO LIGADOS (moeda simulada; o operador desliga).
           · ST-14.0E FECHADA (01/10): a fonte do PC-T — a primeira vitória
           em ginásio (50), Liga (75) e Campeão (150) paga PC-T na conta,
           850 a vida inteira, troca só com 7 dias de conta. Ficou fora das
           ondas; sem ela o Market não tinha moeda de jogador.
           · ST-14.14b FECHADA (01/10): a conta que tenta negociar com uma
           conta ligada é CONGELADA para o operador revisar (L-228).
           · ST-14.14c FECHADA (01/10): o doce de aposta paga com bônus é
           PRESO e prende a criatura que sobe com ele (L-223) — com o Market
           ligado, era o desvio do PC-B para nível vendável.
           · ST-14.14d FECHADA (01/10): os alertas do mercado — venda 3×
           fora da referência e conta que gira demais viram suspeita para o
           operador (L-227).
           · ST-13.5f FECHADA (01/10): a luta e o ginásio são fato do
           servidor; o navegador não os declara mais (L-208).
           · ST-13.5g FECHADA (01/10): a Liga sem time diz "escolha o
           inicial e capture" — não promete mais o time do aparelho (L-211).
           · 1.30 FECHADO (01/10): os ícones de item em 160 px (Serebii).
           · ST-2.6 FECHADA (01/10): a tela do idle organizada, a pedido do
           dono ("tá feio, desorganizado"). Falta o olhar dele; a L-229 (o
           vão embaixo da bolsa em tela larga) espera esse olhar.
           A E14 ESTÁ COMPLETA ATÉ O GATE C; a onda D (buy orders) espera
           dados de liquidez do piloto.
o PRÓXIMO  DESENVOLVIMENTO, não visual (DEC-20, o dono em 30/09: "não perca
           mais tempo com essas correções visuais"): a ST-10.26 (o desenho
           do mapa, L-220) está ADIADA. Seguir a fila do ROADMAP no que falta
           de jogo, e o Q2 completo em fatias (3/10 a 10/10). O piloto
           (ST-7.2) espera o jogo 100% (DEC-18); os ícones (1.30), a arte
           do dono
com o DONO decididas em 30/09: DEC-16 (o stake da Liga LIGADO, moeda
           simulada), DEC-17 (sem migração do save: a conta começa do zero
           no banco — ST-13.4/13.5 destravadas), DEC-18 (o piloto só com o
           jogo 100%), DEC-19 (os sinais de aparelho e rede — feita, ST-13.8).
           DEC-21 e DEC-22 DECIDIDAS por delegação do dono (30/09): a troca e
           o Market ligam em moeda simulada no gate C; o PC-T nasce da
           primeira vitória em cada nó com insígnia da jornada (850 por
           conta, 7 dias de maturidade) — é a ST-14.0E. Ainda com
           recomendação-padrão: taxa shiny, orçamento da Master Ball
```

### O RESTO DA SPEC VIROU STORIES — E12, E9, E10, E13, E11 (26/09)

Pedido do dono: *"Eu quero finalizar o jogo"*, *"transformar isso em storys e
vamos seguir"*, e *"pode botar o v2 tbm nos storys"* (a consulta regulatória
fica para quando o jogo estiver pronto — antes de PUBLICAR, não de construir).
As fichas estão na **PARTE 2** do `PLANO_DE_IMPLEMENTACAO.md`; a ordem, nas
linhas 7 a 11 da fila do `ROADMAP.md`: **E12 (V2 bolo mútuo) → E9 (V3) → E10
(V4) → E13 (idle no servidor) → E11 (V5)**. Os gates de fase passam a ser
medidos e registrados, sem trancar a fila. Ficam com o dono: a migração do
save local (ST-13.4), ligar stake entre jogadores (D2), dinheiro real (DEC-02)
e a hospedagem pública. **ST-12.1 ✅** (`engine/mutuo.mjs`, o bolo fecha no bruto em
10.000 casos semeados). **ST-12.2 ✅** (quem venceu o mercado de abates). **ST-12.3 ✅** (o bolo no servidor). **ST-12.4 ✅** (o bolo paga). **Q2 completo VERDE 1249/1249**
(26/09, sobre edb9670: 598 reavaliados, 651 reaproveitados). **ST-12.5 ✅** (o preço do
modelo, carimbado antes e publicado depois). **ST-12.6 ✅** (a tela do bolo —
`node tools/olhar-bolo.mjs` captura com o servidor de pé). **ST-12.9 ✅** (a leitura no bolo, na aba
Liga). **ST-12.10 ✅** (o gate da V2, medido: `node tools/relatorio-piloto.mjs`
imprime a seção BOLO). **ST-12.7 ✅** (o pódio — `MERCADOS=abates,podio` abre; o padrão é
só abates). **D-118 ✅** (dois "1º" com a tempestade). **D-119 ✅** (o servidor pagava
uma luta sem clima: 771 de 2.000 rodadas com campeão diferente do que a tela
mostrava — corrigido antes de qualquer conta real). **ST-12.8 ✅** (a faixa de
duração). **A V2 está construída inteira** (E12: 12.1 a 12.10). Abrir pódio e
duração: `MERCADOS=abates,podio,duracao`. **Q2 completo VERDE 1293/1293** (26/09,
17bd5f3: 676 reavaliados, 617 reaproveitados). **E9 (V3) em curso: ST-9.1 ✅** (o
dossiê da Arena, 200.000 rodadas pela luta paga, cada número com o seu n).
**ST-9.2 ✅** (a escada da Pokédex). **ST-9.3 ✅** (o dossiê na ficha — Q7 cego
aplicado; D-120 e L-194 registrados). **T15 ✅** (D-120 corrigido: a sonda
dos avisos pela linha do tempo — a suíte dupla tinha saído instável duas vezes).
**ST-9.4 ✅** (o dossiê ao lado da aposta). **ST-9.5 ✅** (o dossiê realizado, do
servidor). **ST-9.6 ✅** (a aposta muda quem aparece nas rotas). **ST-9.7 ✅** (o doce:
a regra). **ST-9.8 ✅** (o doce
sem conta; D-121 registrado). **ST-9.9 ✅** (o doce da conta real). **ST-9.10 ✅** (dar doce sobe o nível). **ST-9.11 ✅** (a Arena explica a própria escolha). **ST-9.12 + 9.13 ✅** (os quatro golpes e o comparador — Q7 aplicado, L-195). **ST-9.14 ✅** (a expedição volta com pesquisa). **ST-9.15 ✅** (medalhas e missões de coleção). **T17 ✅** (D-122: a `paridade` importava o instantâneo pela metade sob o executor paralelo). **ST-9.16a ✅** (o painel da Minha Coleção). **ST-9.16b ✅** (a aba Minha Coleção na Pokédex, com atalho para apostar — Q7 aplicado, L-196, D-123). **ST-9.17 ✅** (o laço de retorno na Início: "desde a sua última visita", só com novidade). **ST-9.18 ✅** (telemetria e gate da V3 — o gate 3→4 mede e não tranca; hoje sai "não passou" pela antifraude de captura, que é a ST-13.6; L-197). **O E9 (V3) está fechado.** **E10 (V4) em curso: ST-10.1 ✅** (as primitivas compartilhadas). **ST-10.2 ✅** (a Trainer Battle Engine). **ST-10.3 ✅** (evoluir ou esperar: golpes exclusivos da forma de antes). **ST-10.4 ✅** (o time de seis e o power score). **ST-10.5 ✅** (a probabilidade exibida, calibrada em 20.000 confrontos). **ST-10.6 ✅** (o efeito de cada troca). **D-124 ✅** (a CI vermelha em 5 de 8 pushes era o ensaio clicando no "Sair" escondido do bolo). **ST-10.7 ✅** (Team Builder: a vista Time). **ST-10.8 ✅** (Tactical Presets). **ST-10.9 ✅** (a batalha PvE na tela e o resultado). **ST-10.10 ✅** (o simulador de confrontos). **ST-10.11 ✅** (a jornada: motor e progresso). **ST-10.12 ✅** (o mapa de Kanto — Q7 aplicado; D-125: o inicial sozinho perde o primeiro nó, dono ST-10.13; L-202, L-203). **ST-10.13 ✅** (Brock: fraqueza de tipo — D-125, L-200 do rival e L-202 fechados; D-126 registrado). **ST-10.14 ✅** (Misty: a velocidade decide — a lição na tela com o duelo de velocidades). **ST-10.15 ✅** (Lt. Surge: imunidade — a prova contada dos eventos da luta; no celular o painel vem antes do mapa). **ST-10.16 ✅** (Sabrina: físico × especial — o seu time ao lado das defesas delas; o mapa de 8 nós em zigue-zague). **Os quatro ginásios-aula do plano estão feitos.** **ST-10.17 ✅** (recompensas PvE sem torneira — primeira vitória cheia, repetição com teto diário e diversidade, a coluna PvE no mapa de emissão; D-126 consertado; L-201 decidida, dona ST-10.19). **ST-10.18 ✅** (chefes e lendários — os cinco à parte das espécies, o Zapdos como chefe com vida de chefe, essência uma por dia). **ST-10.19a ✅** (Erika: resistência — "troque X por Y, da sua caixa"; Koga: o preset certo — a ameaça marcada e o contrafactual na mesma semente no fim da luta; Q7 aplicado). **ST-10.19b ✅** (Blaine: o preset Agressivo — a prova é quantos golpes você levou na mesma luta; Giovanni: o tipo duplo — a tabela de multiplicadores com os dois tipos de cada um; Q7 aplicado; L-205). Os oito ginásios estão no caminho. **ST-10.19c ✅** (a Liga: a Elite Four revisa quatro lições e o Campeão ensina que o preset não é receita; o rival especialista fecha a L-201; o caminho em duas voltas fecha a L-203). **A jornada está completa no pack: 18 nós.** **ST-10.19d ✅** (a correção da lição vira botão com a chance que ela dá — "troque para o Agressivo → 60%" —, e o clique entrega o número; a faixa do caminho no celular, as setas da trilha, a cena longe dos nomes; L-205 fechada). **ST-10.20 ✅** (a jornada ensina a apostar? — o Brier na Liga de Previsão antes e depois do 1º ginásio, com a mesma janela e descontado um controle; os KPIs do §8.15; o gate 4→5, que mede e não tranca; L-207, L-208). **ST-10.21 ✅** (o acabamento da leitura do mapa: nó atual com anel, setas que sabem o sentido e fogem dos nomes, o risco com tamanho, o título; L-206 fechada, L-209 com o mundo, dona a ST-10.22). **O E10 (V4) está feito**, menos a ST-10.22 (o mundo do mapa). A ordem daqui: o **E13** (o idle no servidor — pré-condição dura do E11), e a ST-10.22 entra quando o cenário do mapa for a vez do cenário. **E13 em curso: ST-13.1 ✅** (a coleção no servidor: `GET /api/idle` só lê — a escrita só por operação nomeada, a lista `OPERACOES_DO_IDLE`; sem semente, sem dono, no relógio do servidor). **ST-13.2a ✅** (a colheita é uma conta só: `engine/colheita.mjs`, que o cliente e o servidor chamam — identidade byte a byte; a 13.2 foi dividida em a/b/c). **ST-13.2b ✅** (as rotas: a inicial, a expedição, a colheita idempotente e o lance pela chave, no relógio do servidor; um dia inteiro igual ao do aparelho). **ST-13.2c1 ✅** (a run do Avanço é uma conta só, no aparelho e no servidor; a luta da jornada virou a ST-13.7, depois da 13.3). A extração achou **D-127** (o clima nunca vale no Avanço) e **D-128** (a reserva da run conta duas vezes). **ST-2.5 ✅** (o clima paga no Avanço, e o aviso e a run concordam sobre o teto — nos dois lados; a emissão regravada). **ST-13.2c2 ✅** (as rotas da run: começar, poção, recuar e colher idempotente, no relógio do servidor). **A ST-13.2 está fechada** (a, b, c1, c2). **ST-13.3a ✅** (caixa, soltar e foco no servidor, pelas regras da camada 0; L-210 fechada; a 13.3 dividida em a/b/c). **ST-13.3b ✅** (golpes e evolução no servidor; a pedra consumida desceu da tela para a camada 0). **ST-13.3c ✅** (dar doce no servidor, com a chave do pedido). **A ST-13.3 está fechada.** O próximo na fila é a **ST-13.4** (trazer o save local para a conta) — **ela pergunta ao dono antes** (dado com acervo); a recomendação está escrita na ficha. **ST-13.6 ✅** (a antifraude mínima: banda de captura medida, detector de horário com taxa conhecida — 91/40/1% e falso positivo zero —, suspeita para o operador; L-197 fechada, L-050 parcial, D-129 registrada). **ST-13.7 ✅** (a luta da jornada no servidor: `contaDaLuta` na camada 0, a rota `POST /api/idle/jornada/lutar` com a semente do servidor, os fatos `pve_iniciado`/`ginasio_vencido` nascendo da luta com a chance refeita, e o gate da V4 preferindo o fato ao relato; L-208 parcial — o resto é da 13.5). O que resta do E13 é a **ST-13.4** e a **ST-13.5**, que esperam a resposta do dono sobre o save local. **ST-10.22a ✅** (a leitura do mapa: "próximo", o bloco do chefe, a faixa do celular em trecho, o título; o "fundo que acaba" era a captura). **ST-10.22b** feita com o **aceite não atingido** (o mapa ganhou regiões como terreno, arte nossa e um marco por cidade; o Q7 subiu de 4,5–5 para 6–7 nas larguras largas e parou — o que falta é estrutura, e virou a **ST-10.22c**). **E11 aberto: ST-11.1 ✅** (o snapshot de defesa: o time da Liga congelado, imutável no banco, com a posse validada no servidor e as versões das regras e do conteúdo). **ST-11.2 ✅** (o confronto assíncrono: a partida pela raiz do servidor com commit gravado, cada lado com o seu preset, e o replay que sai só do log). **ST-11.4 ✅** (o Liga MMR, feito antes da 11.3 porque ela pareia por ele: Elo de soma zero, tier à vista e número oculto, na mesma transação da partida; os três ratings não se leem). **ST-11.3 ✅** (matchmaking: nunca conta ligada, faixa de rating e power, sem repetir, o bot da jornada rotulado e sem MMR; cem pedidos com a mesma chave são uma partida). **ST-11.5 ✅** (a temporada de 28 dias: do relógio, virada preguiçosa e idempotente, ranking final e soft reset em livro). **ST-11.8 ✅** (anti-win-trading: repetição, alternância e concentração fora do ranking e registradas; cooldown de 6 h entre o par; dispositivo e rede esperam a L-050). **ST-11.9 ✅** (bandeiras de feature: tudo que move valor nasce desligado; ligar exige o marcador `CHECKPOINT_25_1` com um DEC registrado; desligar nunca exige; toda mudança auditada, a recusada também; `league_enabled` desliga a partida e a busca). **ST-11.6a ✅** (a League Home: a aba "Liga de times" no Time, com a temporada, o tier sem número, o time publicado, a busca e a última partida com o efeito no tier; o bot sempre rotulado; Q7 em três rodadas; L-211: com conta real a aba para em "sem time na conta" até a ST-13.4). **ST-11.6b ✅** (o replay pelo log, com a prova da semente na tela). **ST-11.6d ✅** (o pedido do dono, 30/09: a partida da Liga no palco da Arena — a ilha, os sprites animados, os balões, os efeitos, as placas, o mini log, os golpes sobrepostos, o placar vivo e o banner do fim; a busca abre a partida no palco). **ST-11.6c ✅** (o ranking da Liga: a temporada ao vivo e as fechadas, tier e posição, nunca o número). **A ST-11.6 está fechada** (a, b, c, d). **ST-11.7a ✅** (League Points, a terceira e última moeda: livro próprio que nunca toca a carteira, ganho só em partida contada com teto diário, virada com 10% de carryover e prêmio do tier; a 11.7 dividida em a/b/c). **ST-11.7b ✅** (o cartão dos League Points e as insígnias de temporada na tela; cada partida diz o que rendeu; Q7 aplicado). **ST-11.7c ✅** (a loja da Liga: bolas e doce por League Points, limite por temporada, compra idempotente numa transação). **A ST-11.7 está fechada** (a, b, c). **ST-11.6e ✅** (o fim do palco diz o que a partida rendeu; L-212 fechada). **ST-11.10 ✅** (o stake na fila de bônus, construído atrás da bandeira DESLIGADA — ligar é a D2, do dono). **ST-11.11 ✅** (a confirmação honesta do stake: a busca só entre inscritos, a tela com os quatro números e o líquido, a confirmação com a taxa dentro). **O E11 está construído** — o stake espera a D2 do dono. **ST-11.7d ✅** (as molduras exclusivas da Liga, por League Points; L-213 fechada). **ST-10.22c1 ✅** (o mapa: uma estrada no celular numa janela que abre no próximo nó, os nomes só onde respondem algo, o trancado na cor da região; o aceite ≥8 não foi atingido — Q7 3–8). Próximo: a **10.22c2** (a geografia do mapa); a 13.4/13.5 esperam o dono — e agora a Liga de verdade também.

**Hospedagem pública: decisão do dono, 26/09 — *"Isso vai ser configurável
depois, primeiro vamos fechar o jogo"*.** Sai da lista de perguntas; volta
quando o jogo estiver fechado. O teste online segue sendo o job `ensaio` da CI.

### Q2 COMPLETO VERDE — 1210/1210 (26/09, commit 3ad44ef)

Depois do ensaio do piloto e dos D-112 a D-117, o Q2 completo reavaliou 651
defeitos e reaproveitou 559: **nenhum escapou**. Três tentativas anteriores
morreram no começo — o container é recolhido quando a sessão fica ociosa, e
um processo em segundo plano morre junto. A que terminou rodou com a sessão
ativa (~1h30). Para a próxima: rodar o completo COM a sessão ativa, e não
agendar e sair.

### D-117 CORRIGIDO — uma chave solta no CSS tirava o padding de todo cartão (26/09)

Investigando um texto encostado na borda (L-190), a causa era global: um `}`
sobrando no CSS fazia o navegador descartar a regra inteira do `.card` — todo
cartão do app estava com padding 0, desde antes de 15/09. A chave saiu; 30
telas foram olhadas antes e depois nas quatro larguras (0 rolagem, 0 erro). A
lista de odds ficou sem o respiro lateral, porque com ele os nomes longos
eram cortados. E a esteira `olhar-telas` deixou de travar em `adm-recusa`.

### D-115 CORRIGIDO — a aba Boutique esvaziava o perfil (26/09)

No ensaio da compra a 420 px: clicar em "💵 Boutique" no perfil dava erro de
página e, ao fechar a boutique, o perfil ficava sem conteúdo nenhum. Não era
do modo servidor — acontecia sempre. A compra em si, com conta, funcionou nas
duas larguras (posse, débito de 750 e o evento `cosmetic_purchased`).

### D-113 CORRIGIDO — com conta, a tela de carregamento prendia até 54 s (26/09)

O ensaio mediu: abrir o jogo com conta durante a luta deixava a tela de
carregamento ("simulando 154.000 batalhas" — falso no modo servidor) por 40 a
54 s, porque o boot esperava a PRÓXIMA rodada abrir. Agora o app abre em 0,8 s
e a arena diz "a próxima abre em N s". Achado no mesmo ensaio e já corrigido:
o botão "Iniciar rodada", com conta, levava a arena à contagem no meio da
janela e travava a aposta (D-114) — no modo servidor ele e o "Auto" somem.

### D-112 CORRIGIDO — nenhuma aposta do servidor era liquidada (26/09)

O primeiro ENSAIO do piloto num navegador de verdade — conta, aposta, rodada,
resultado — achou o defeito mais sério da semana, com a suíte inteira verde: a
rodada fechava e a aposta ficava `travada` para sempre (sem pagamento, sem
perda, sem XP, o dinheiro reservado preso). `liquidarRodada` existia e só a
suíte a chamava. Agora o laço liquida antes de anunciar o fim, e o servidor
paga o que ficou pendente ao ligar. **`node tools/ensaio-piloto.mjs` virou o
passo obrigatório antes de mandar o link** — termina em PRONTO PARA CONVIDAR.

### L-188 FECHADA — no panorâmico a luta passou a caber na altura

A esteira achou primeiro o próprio erro: uma amostra com mob ainda ENTRANDO
(pé abaixo da janela) puxava a medida — agora é separada. O que sobrou era
real: a DEC-15 garantia a LARGURA da luta e não a altura; a 3× o panorâmico
mostra 207 px de mundo e o trio ocupa 182. A regra valeu nos dois eixos: na
run, a câmera se afasta até 284 px de altura (2,18× no panorâmico), e o
controle mostra o zoom de verdade. Bando: 88% → 75% da janela; a cena mostra
mais do mundo (a fauna dormindo, os vaga-lumes).

### ST-7.2c FECHADA — o piloto está pronto para rodar; falta gente

`docs/PILOTO.md` é o roteiro: como subir o servidor em produção (com o
segredo de sessão, senão reiniciar desloga todo mundo), como os amigos
alcançam (túnel — não testado daqui), a rotina diária de 5 minutos (cópia do
banco + relatório), como ler o relatório, o registro de problemas por
evidência (ALCANCE × IMPEDE) e o calendário de 14 dias. O relatório
(`node tools/relatorio-piloto.mjs`) põe cada jogador-dia do idle ao lado do
perfil da ST-3.3 e dá a RAZÃO medida/referência — é a calibração contra gente
de verdade. **O próximo passo é do dono:** subir o servidor e convidar.

### ST-7.2b FECHADA — pela primeira vez, uma conta real criada pelo navegador

Com o servidor no ar (`npm run servidor`), o modal "Criar treinador" pede
nome, e-mail, senha e nascimento e cria a conta no servidor; "Já tenho conta"
entra por e-mail e senha, de qualquer aparelho. Sem servidor, a fachada local
de sempre — e o modal só pergunta ao ABRIR, então o boot continua sem pedido
nenhum. Conferido no Chromium: a página volta logada, com o nome, o nível e os
1.000 PokéCash que o servidor dá na entrada. Falta a **7.2c** (relatório e
roteiro do piloto).

### DEC-01 DECIDIDA PELO DONO — e a ST-7.2a achou o que travava o piloto de verdade

O dono, 25/09: *"Os direitos não importam agora, pode ignorar por hora, pode
continuar, eu tenho permissão pra isso"*. O piloto privado está destravado; a
tag pública continua travada pelo `saida-v09` como sempre.

Ao preparar o piloto apareceu o que o travava de verdade (**L-189**): a tela
NUNCA criou conta real — o modal é a fachada local, e nenhum módulo chama
`/api/auth`. E ninguém servia jogo e API no mesmo endereço. A **ST-7.2a**
fechou a segunda metade: `npm run servidor` agora serve o jogo por LISTA
(`dados/` nunca sai) com CSP própria; aberto no Chromium pelo backend, 0 erro
e 0 bloqueio. Próximas: **7.2b** (conta real na tela) e **7.2c** (relatório e
roteiro do piloto).

### Q2 COMPLETO — 1165/1166, e o que escapou era um teste que morreu sozinho

O primeiro Q2 completo desde o T14 (966 reavaliados, ~2 h 10 min num
worktree à parte). Escapou um: o **S765**. O teste da peneira de símbolos
iterava a própria constante que o mutante encolhe, e só o `> 100 arquivos`
o segurava — até `app/modules` passar de 100 (tem 144). Nenhum diff no teste;
o produto cresceu e ele morreu. É o **D-111**, corrigido (pastas literais) e
conferido: S765 PEGOU. O cache do Q2 foi commitado: o próximo Q2 do bloco
parte de 1007 vereditos quentes.

### L-187 FECHADA — a luta saiu da borda do mundo

A hipótese conferiu com uma sonda: a 420 px o mundo tem 448 de altura e a
janela 413 — a câmera tinha 35 px de folga, queria y=142 e ficava presa em 35.
Nenhuma câmera centra o que está na borda; o que resolve é a luta não
acontecer lá. Na run a área andável não desce abaixo da linha que a câmera
presa ainda mostra a 62% da janela. Pé do mob mais baixo: 97% → 69%. A
captura mostra a luta no meio do palco, com as placas legíveis. O panorâmico
ainda põe o bando rente ao fundo com a câmera LIVRE — registrado como L-188.

### ST-7.1b FECHADA — o banco do piloto tem cópia, e a cópia volta

`node tools/banco-copia.mjs copiar` tira um instante consistente com o
servidor ligado (`VACUUM INTO`, não `cp` — com WAL o `.db` sozinho mente);
`conferir` checa integridade, versão do esquema e o ledger de cada conta
contra o saldo; `restaurar` confere ANTES de tocar no destino, monta ao lado,
migra e só troca no fim. Nada é sobrescrito sem `--sobrescrever`. Restaurar
sobre o banco vivo exige o servidor desligado. S1164–S1168; Q2 do bloco 5/5.

### ST-7.1a FECHADA — o piloto passa a ser medido

O cliente juntava eventos num buffer em memória que nunca saía, e o servidor
só gravava os de proteção: um piloto com amigos não mediria o idle — a parte
do jogo que fica aberta por horas. Agora: todo evento tem CHAVE do próprio fato
e o banco conta uma vez (índice único); aposta e compra são anotadas pelo
SERVIDOR, na hora; o cliente só relata o que só ele sabe (presença do dia,
runs e expedições colhidas), por lista fechada, com o usuário vindo da sessão;
o painel de política ganhou a retenção D1/D7 por coorte de cadastro (D7
imaturo é `null`, não zero). O cliente relata o ESTADO, não o clique — reenviar
não duplica, e nenhum `onclick` ganhou linha de telemetria. A **b** fechou logo abaixo. S1151–S1163.

### D-110 CORRIGIDO — a arena rolava 16 px para o lado a 420 px

Registrado como "o modal de perfil rola"; a esteira `olhar-telas` passou a
dizer QUEM empurra, e o culpado maior era a **lista de apostas da arena** —
a tela principal — com o modal só por cima. Na linha cede o nome (reticências)
e, na tela estreita, a margem de erro da chance; a odd nunca. A primeira
tentativa cortou os nomes em 5 letras ("Kan…") — a captura pegou, e a segunda
os devolveu inteiros (Blastoise, Kangaskhan). Sem rolagem em arena-420,
resultado-420 e customização-420. Suíte 2327/2327; Q2 do bloco 5/5.

### L-187 PARCIAL — na luta a câmera mira o meio do trio

A câmera da run mira o posto do companheiro (entre o treinador e o bando) e
chega lá suavizada, em vez de pular. Medido com a esteira — que passou a tirar
a MEDIANA de 8 amostras, porque uma foto pôs a mesma cena em 77% numa execução
e 83% na outra: o pé do mob mais baixo foi de 96% para 88% da altura da janela
a 420 px. Não centrou; a hipótese (a borda do mundo) está escrita na L-187. De
brinde: no panorâmico os estouros fora da tela foram de 6 para 0 por wave. E a
sonda dos números passou a separar o par em que o mais velho já está abaixo de
25% de opacidade (sumindo) — contado à parte, não escondido. Suíte 2325/2325;
Q2 do bloco 4/4 (S1145–S1147).

### ST-2.4 FECHADA — a fauna do cenário dorme à noite (L-184)

A mesma tabela do elenco (`preferenciasDaNoite`): quem a noite desfavorece
dorme — quadro parado e um "Zz" que sobe; quem ela favorece segue acordado
(favorecer vence). O "Zz" mora no canvas do BRILHO, por cima do escuro: a
primeira versão o pôs no canvas do mundo, sob a luz em `multiply`, e a foto
noturna saiu sem ele. A esteira `olhar-hora` passou a contar os moradores
visíveis e quantos dormem (à 01h: 2 de 5 na floresta — Pidgey e Meowth), a
afastar a câmera até achar um, e a recortá-lo — e a sonda errou duas vezes
antes (contava moldura fora do palco como visível; recortava em coordenada de
janela). **E o Q2 do bloco pegou um teste virando decorativo:** a primeira
ligação lia o relógio do mundo uma segunda vez no quadro, e o S1021 (a cena
lendo o UTC cru) passou a escapar pela âncora duplicada. Agora é UMA leitura
por quadro, antes da fauna, e um teste cobra isso. Suíte 2322/2322; Q2 do
bloco 11/11 (S1139–S1144).

### ST-5.6 FECHADA — em 420 px a luta cabe na câmera (DEC-15, L-175)

Na run, o zoom efetivo é o menor entre o escolhido e o que mostra 260 px de
mundo (`zoomDaRun`, camada 0). Medido a 420: janela 130×207 → **260×413**
(1,5×), estouros fora da tela 9–24 → **0** por wave; panorâmico igual (403×207,
3×). O rótulo mostra o zoom EFETIVO; a escolha do jogador volta quando a run
acaba; o piso anti-esticado (S616) vale por cima. Achado de passagem: **L-187**
(a luta fica na borda de baixo — a câmera centra no treinador). Suíte
2318/2318; Q2 do bloco 8/8 (S1135–S1138), 0 mutantes de navegador.

### ST-3.6 FECHADA — o Avanço paga menos a partir da 7ª run do dia (DEC-14, L-185)

6 runs cheias por dia, depois ×0,75 por run, piso de 5% — moeda e Essência.
**O dia é o de calendário em Brasília**, e a medição decidiu isso: a janela
móvel de 24 h punia quem joga todo dia no mesmo horário (as runs de ontem
ainda estavam na janela). Essência/dia: casual igual (16,29), diário 40 → 37,
maratona 199,6 → 57,4 — de 8,7× para 2,5× a calibragem. A frase aparece sob o
botão Avançar ("Esta seria a 7ª run de hoje: ela paga 75%…"), capturada a
1440 e 420 sem transbordo. Suíte 2314/2314; Q2 do bloco 15/15 (S1127–S1134;
S1081 realinhado), 0 mutantes de navegador.

### E4 (metade B, cliente) — o INT-02 fechou, e o D-108 com ele

Com conta real a boutique compra NO SERVIDOR (`comprarNoServidor`, chave por
clique), a carteira local não é tocada, e a posse e o equipado voltam no login
(`hidratarPosse` dentro do `hidratarPerfil`). A regra mora em
`app/modules/posse-atual.mjs` (camada 0): de onde vem a posse, o que pode ser
equipado, qual peça cada clique é, o que o servidor equipou. Equipar exige
posse **nos dois modos** — antes, a customização vestia de graça tudo o que a
boutique vende —, e a peça trancada aparece apagada, com cadeado (capturado a
1440 e 420: 29 peças trancadas). `posseInicial` passou a dar só o `padrao`.
Suíte 2311/2311; Q2 do bloco 21/21 — **os 10 mutantes do cliente são de Node,
0 de navegador**. D-108 ✅, L-055 ✅, L-157 🟡. Achado de passagem: **D-110**
(o modal de perfil rola 16 px na horizontal a 420 — anterior ao E4).

### E4 (metade A, servidor) — a posse de cosmético mora no servidor

Tabelas `cosmetic_ownership` (só o ADQUIRIDO; o padrão é derivado do catálogo)
e `cosmetic_equipped`, migração aditiva `posse-cosmetica-e4`.
`server/cosmeticos.mjs` precifica e valida pelo MESMO catálogo da vitrine;
`POST /api/cosmeticos/comprar` é UMA transação (débito, lançamento, posse —
`aplicar` ganhou `antes`/`depois` dentro da transação), idempotente por chave
e por posse; `equipar` exige posse; o traje passa pela mesma tabela. O plano
de consumo dos baldes saiu para `planoDoGasto` no motor — o mesmo no cliente e
no servidor. **ST-4.5 adiada** (o `comprado` no servidor não tem fonte até o
dinheiro real existir). A metade B liga o cliente. CI: primeira execução no
GitHub disparada no push do ST-0.6.

### O DONO DELEGOU AS DECISÕES DE PRODUTO — e a ST-1.2b fechou na primeira

*"Eu acho que vc tem q tomar as decisões que vc achar melhor p software"* (25/09).
As DECs de produto foram tomadas e estão na tabela do ROADMAP com o porquê;
ficam com ele DEC-01, DEC-02 e a L-176. A mudança correspondente no
`CLAUDE.md` ("Parar e perguntar") foi **bloqueada pelo classificador** como
auto-modificação — **o dono precisa fazê-la, ou autorizar**.

**ST-1.2b (DEC-07):** o Sair revoga o token no servidor. Tabela aditiva
`sessoes_revogadas` (por nonce, limpa no vencimento), `POST /api/sair`, e o
despacho recusa o revogado. O cliente pede com o token antigo antes de
esquecê-lo, e esquece mesmo sem rede; a tela espera até 1,5 s antes de
recarregar. O outro aparelho da mesma conta segue logado. Suíte 2293/2293; Q2
do bloco 15/15 (S1106–S1110 novos, S1053 realinhado).

### ST-6.3 FECHADA — toda lacuna diz o próprio estado

As 85 fichas sem linha de Estado foram conferidas CONTRA O CÓDIGO, uma a uma, e
não pelo texto: várias diziam "aberta" e estavam feitas (L-029, L-060, L-064,
L-065, L-069, L-102), outras eram só parciais (L-001, L-003, L-031, L-059…). A
L-098 e a L-119 tinham dois títulos cada — viraram subseção. Hoje: **185
fichas · 64 fechadas · 16 parciais · 105 abertas** (`node test/fichas.mjs`). A
suíte nova `fichas` reprova ficha sem Estado e id repetido (S1104, S1105).

### ST-5.5b FECHADA — o jato (L-186)

O terceiro desenho da Arena entre atacante e alvo: a folha repetida pela linha,
saindo 300 ms antes do impacto e vivendo 550. 5–7 jatos por wave com Squirtle
no Surf (`--inicial 7`), com foto em voo. A 420 px ele sai pela borda — é a
L-175, que espera a DEC-15. Suíte 2288/2288; Q2 do bloco 14/14, 0 mutantes de
navegador.

### ST-5.5 FECHADA — a carga e o projétil do golpe (L-171)

O motor publica os golpes `aCaminho` (os próximos 900 ms) e o projétil sai
cedo o bastante para chegar no instante em que o número sobe — o tempo corre ao
contrário do da Arena, onde o dano espera o projétil. 13 projéteis numa wave
com Venusaur (`node tools/olhar-idle.mjs --inicial 7`), com foto em voo. Nenhum
golpe do pack tem `cast` hoje; o caminho tem teste. O jato (`beam`) virou a
**L-186**. Suíte 2285/2285; Q2 do bloco 16/16, **0 mutantes de navegador** —
toda a conta mora em Node.

### ST-5.4 FECHADA — os números de dano não se tocam (L-172)

0 pares sobrepostos e 0 fora da janela em 3 execuções × 3 cenas. A sonda
passou a imprimir o PAR, e os "1 a 3 pares" que sobravam eram ela contando o
MESMO número duas vezes (mesmo pixel, dt 0 ms) — corrigida com um `WeakSet`.
Medida de novo com a sonda certa, a conta antiga deixava 1 par real em 9
cenas (a coluna cheia / o grampo do topo); a nova, 0. `pontoLivre` confere a
colisão depois do grampo e vai para o lado quando a coluna acaba. Suíte
2276/2276; Q2 do bloco 11/11 em 2 min 20 s.

**Achado de passagem, não construído:** a 420 px a cena da run começa perto de
y = 1000 — num telefone, abaixo da dobra. É a mesma pergunta da L-175, que
espera a DEC-15.

**O Q2 completo** (852 adiados) foi interrompido para não disputar CPU com o
navegador (D-100); roda sozinho no fim da sessão.

### ST-5.7 FECHADA — comparação visual que não aconteceu não é verde (D-093)

Num clone novo a base visual local nasce na primeira execução, e a suíte a
comparava consigo mesma: VERDE sem ter olhado. Agora a linha final diz "VERDE
COM LACUNA" no `npm test`, e o `portoes` **não fecha**; a base local ganhou
carimbo de data e commit. **D-086** (sala-cliente instável): 20/20 verdes sob
carga, não reproduzido — nenhum código mudado, fica esperando uma falha lida.

### ST-5.2 FECHADA — o banner não passa por cima do Pokémon (D-082)

O rodapé com Pokémon no canto passou a ficar ENTRE o avatar e a arte. **A foto
pegou o que nenhum teste pegaria:** a primeira correção só reservou a direita,
e o texto quebrou em três linhas e caiu sobre o avatar. Agora são duas linhas
entre os dois, e a ferramenta mede a interseção com os dois lados em quatro
larguras (sabotada: ela acusa). **A ST-5.1 (os 404) espera você:** os arquivos
`assets/npc/lojas.mp4` e `battle-theme.mp3` só existem no seu PC — commitá-los
de lá é a correção.

### ST-3.3 FECHADA — o mapa de emissão, e ele achou a L-185

`test/emissao-idle.mjs` mede, pelo motor, o que três perfis tiram por dia em
sete dias (fixture determinística: mudou a economia, fica vermelho). O achado:
**o maratona tira ~200 de Essência por dia, 8,7× os 23 que calibraram a curva do
Estilhaço**, e ~4.900 de moeda. O teto de encontros segura espécie, não
recurso — o REV-14 com número. Registrado na L-185; a escolha é a **DEC-14**
(recomendação: rendimento decrescente por run no mesmo dia). Com isso o
**INT-01 fechou**.

### ST-3.4 e ST-3.5 FECHADAS — as DEC-08 e DEC-09 aplicadas como padrão

As duas recomendações eram o que o código já faz, e por isso entraram como
padrão (regra do `CLAUDE.md`: recomendação escrita segue sem esperar, e o dono
avisa se não quiser). **DEC-08:** a captura entrega a espécie mostrada — um
teste trava isso, inclusive para o chefe evoluído. **DEC-09:** o custo é por
wave alcançada; sob o botão Avançar a tela passa a dizer, antes de entrar,
"tentar de novo é outra run, com o mesmo custo".

### ST-3.2 FECHADA — duas abas não colhem a mesma coisa duas vezes

O save do idle ganhou revisão: quem carregou uma revisão velha não grava por
cima de uma nova — o disco vence, a tela avisa e recarrega. E a tela ouve o
evento `storage`, que é o que faz a recusa quase nunca acontecer. O limite,
dito: é o máximo honesto enquanto o idle morar no navegador; a garantia de
verdade é o idle no servidor (E8).

**E o T14c:** o Q2 do 1.32b ia avaliar 130 mutantes de navegador (~2,7 h)
porque 30 linhas do `index.html` mudaram. "Tocado" passou a ser o TRECHO (a até
25 linhas do diff), não o arquivo.

### ST-3.1 FECHADA — o baú do Avanço cai em Estilhaço até o estágio 3 (L-159 e L-160)

A recomendação da L-159, construída: o item montável do baú vira partes — 1, 2
e 3 por unidade conforme o estágio — e vem inteiro do 4 em diante. A sondagem
pegou, antes da tela, a primeira versão transformando Essência e PokéCoin em
"estilhaço" (têm porta de drop e nenhum bioma); estilhaçável passou a ser o que
a loja do Estilhaço vende. E a parte ganhou nome ("Estilhaço de Pedra das
Folhas") e o ícone do item — a L-160, que só não aparecia porque nada punha
`est:` num saque. **A calibragem 1·2·3 é minha recomendação, reversível**.

### ST-2.3 FECHADA — o veterano vê a noite (L-183)

Fada entrou na noite do pack (Clefairy é o Pokémon da lua): as rotas que mudam
à noite passaram de 6·7·3·2 para **7·8·3·3** nos estágios 1..4. Três é o teto do
conteúdo no estágio 4 — medido com cada tipo e com combinações —, porque a troca
não pode mudar a raridade do slot (invariante do cartão 1.33). Mais que isso
pede espécies noturnas raras, que Kanto não tem.

### 1.32b (ST-2.1 e ST-2.2) FECHADO — os climas à vista, e a L-177 caiu

A sala de rotas ganhou a legenda dos climas, fechada por padrão. Cada clima diz
o bônus e **em quantas rotas do SEU estágio ele troca um rosto** — o motor é
perguntado rota por rota, e o Sol diz "não muda quem aparece" porque não muda
em estágio nenhum (medido). A legenda não recebe nada da run: o clima sorteado
continua oculto. Quando a run começa, o log diz **"🌼 Pólen trouxe Paras no
lugar de Metapod"**. Olhado nas quatro larguras (`tools/previas/_climas/`).
A sabotagem achou um teste que faltava (S1063: ninguém conferia que o começo da
run GRAVA a linha) — escrito. Sobra do 1.32b a ST-2.3 (L-183), que é conteúdo.

**E o T14b:** o Q2 de bloco de produto estava levando ~1 h porque a onda 1
subia Chromium para todo defeito novo de `app/`. Consertado: o Q2 da ST-1.1
caiu para 2 min 22 s.

### ST-1.2 e ST-1.3 FECHADAS — o Sair desloga; a boutique não vende sem cobrar

**D-109 corrigido:** a decisão saiu do `onclick` para `app/modules/sair.mjs`
(camada 0) — esquece o token e o PIN; com conta real a página recomeça, porque
carteira e perfil do servidor estavam em memória. **D-108 mitigado:** com conta
online, `podeComprar` recusa com o motivo, e o botão fica com o preço,
desligado. O conserto de verdade (posse no servidor) é o E4. Quem comprou com
conta antes disso ficou com a peça sem pagar — registrado, sem recuperação.

### ST-1.1 FECHADA — o teto sente a run colhida (D-107)

`encontrosHoje` passa a somar as runs colhidas das últimas 24 h, que o
`carregar` agora guarda e valida. **E a segunda metade do furo, achada no
conserto:** a reserva de 6 sumia no FIM da run, e não na colheita — no
intervalo, as expedições usavam os mesmos encontros que a colheita depois
entregava. O teste antigo `recuar … para de reservar quando colhida` afirmava
exatamente essa brecha (cobrava 0 antes da colheita); a asserção passou a
concordar com o título. Suíte 2223/2223 em 1 min 40 s; S1044–S1049 pegos; S879
realvado.

### Pedido do dono, 25/09: "cruze os documentos com o código, revise o planejamento, e os testes que levam horas precisam virar minutos"

**Os testes.** Três causas medidas, três consertos, nenhum teste removido:

```text
servidor     14 servidores precificavam 154 k que nenhum teste lia  92 s -> 2 s
paralelo     3 trabalhadores para as suítes de CPU; 2 filas de Chromium
Q2 do bloco  avalia o que o bloco TOCOU; adia, contando, o que só mudou de fecho
             no 1.33: 147 mutantes em vez de 589
```

`npm run portoes` agora fecha bloco com o **Q2 do bloco**; `npm run portoes:tag`
é o nível da tag. `--fatia=k/N` divide o Q2 completo entre máquinas.
**O preço, dito:** um bloco que deixe decorativo um teste DISTANTE (o S15) só
aparece no Q2 completo — o relatório de cada bloco imprime quantos ficaram
adiados. É a DEC-12, adotada pelo pedido.

### O Q2 que fechou o T14 — e a dívida que ele deixou à vista

```text
39 avaliados    21 sem veredito (os 15 do 1.33 que o Q2 interrompido não
                alcançou + os 6 do T14) e os ancorados no que o T14 tocou
                30 pelo atalho do índice, 9 pelo caminho completo · 39/39 PEGOU
351 reaproveitados   chave intacta
648 adiados     quase todos são a mesma dívida: o Q2 do 1.33 parou em 300/1032
                e nunca respondeu por eles. O modo novo não a criou — ele a
                MOSTRA, com número, em vez de exigir 7 h para fechar um bloco
```

**A próxima ação de arnês, e ela não bloqueia produto:** rodar o Q2 completo
UMA vez, em fatias (`node test/sabotagem.mjs --fatia=1/4` … `4/4`, em sessões
paralelas, cada uma commitando o `q2-veredito.json`). Até lá, os blocos fecham
pelo Q2 do bloco e o número de adiados só pode cair.

**O cruzamento.** `docs/CRUZAMENTO_DOCS_CODIGO_2026-09-25.md`. Três defeitos que
nenhum documento conhecia, os três no caminho **com conta real**, os três com
teste que afirma o defeito:

```text
D-107  o teto de encontros volta cheio depois de colher a run   fura o §P5
D-108  com conta real, o cosmético da boutique sai de graça
D-109  o botão ⏻ não desloga a conta real
```

E o idle inteiro (Avanço, OFF, colheita) é autoridade do NAVEGADOR: o
`server/idle.mjs` é transacional e não tem rota. Fica no E8 do plano, com gatilho.

**O plano.** `docs/PLANO_DE_IMPLEMENTACAO.md` — 9 épicos, stories com escopo,
fora, aceite, sabotagem e porte. A ORDEM continua só no ROADMAP: o E1 (os três
defeitos, todos P) passou à frente do 1.32b, pela regra que a própria revisão
escreveu.

**Documentos velhos:** o `RETOMAR.md` da raiz ganhou nota de histórico; o
cabeçalho do ROADMAP e o `CLAUDE.md` foram corrigidos. Arquivar as filas mortas
(CONTINUAR, ORDEM, PAUTA…) é a ST-6.1 — não foi feito de uma vez de propósito,
porque alguns testes leem `docs/`.

### O que espera o dono

DEC-13 (CI no GitHub) · DEC-11 (os 154 k sims — ~~o maior custo que
sobrou nos testes~~: medido, são 30% das sondas; decide-se pela economia) · DEC-07/08/09 com o que o código JÁ faz escrito
ao lado (plano, seção final) · DEC-01..06.

## 0-. ANTES — 25/09/2026, fim do dia

```text
o LINK     http://localhost:8099/app/index.html
           sobe com:  node tools/servir.mjs --porta 8099
a PASTA    C:\Users\gdult\pa4
o ESTADO   1.33 FECHADO · o elenco muda com a noite e com o clima
           (Q2 e suíte: ver a mensagem do commit do 1.33)
o PRÓXIMO  1.32b — mostrar que climas existem (L-177), junto com a L-183
```

### O 1.33 fechou: a noite passou a mudar QUEM aparece

A run que começa de noite (horário de Brasília) troca um mob por um noturno —
fantasma, venenoso ou psíquico — e o chefe é recalculado. O clima faz o mesmo
com a tabela que já decidia o bônus. Sem condição nenhuma, os 44 estágios são
IDÊNTICOS aos de antes (fixture fotografada antes de mexer no motor). A run que
já estava em curso não muda.

**Na tela:** a sala de rotas, de noite, diz *"É noite: quem tem a lua só sai a
esta hora"* e marca esse rosto com anel violeta e lua. O clima continua oculto
na sala — ele só se revela quando a run começa.

**Olhando, três ajustes:** a lua ficava coberta pelo ícone vizinho; sumia sobre
sprite amarelo; e um fecho de comentário sobrando engoliu a regra CSS inteira
sem nenhum erro — virou teste e defeito plantado (`S1037`).

**Registrado:** L-183 (no estágio 4 só 2 das 11 rotas mudam de noite — o
veterano quase não vê) e L-184 (a fauna de enfeite do cenário não sabe que é
noite).

## 0-. ANTES — 25/09/2026, início do dia

```text
o ESTADO   1.34 FECHADO · Q2 VERDE 1017/1017 · suíte VERDE 2184/2184
           a cena do idle tem dia, tarde e noite, no horário de Brasília
```

### O 1.34 fechou, na terceira forma

A janela do céu no canto do palco — o sol e a lua no mesmo arco, a lua mordida,
estrelas acendendo, um horizonte de morros. A luz da hora como camada com
`multiply` sobre a cena inteira. E à noite o cenário fica MAIS FORTE: brasa,
vaga-lume e neve somados ao escuro, que era a metade que o dono destacou. O
banner da expedição passou a andar a cada segundo.

**Duas tentativas foram reprovadas OLHANDO**, e nenhuma por teste: estrelas
espalhadas na grama com a noite virando neblina; depois `multiply` no canvas
errado, pintando o chão de azul puro. Ficaram no histórico.

### Chegou uma revisão externa do plano, e ela foi CONFERIDA, não só lida

`docs/revisao-2026-09-24/` — 22 achados, feitos só com os documentos. A
conferência contra o código está em `CONFERENCIA.md` nessa pasta. O essencial:

```text
REV-03  o "viés de +19,22%" que justificava 154.000 sims era conta errada:
        é 0,31%. Eu tinha repetido o número errado ao dono. Corrigido na Spec,
        no estudo de economia e no motor. Virou a DEC-11 (L-182): manter os sims?
REV-08  a API dizia janela de 30 s; o código usa 40 s. Corrigido
REV-09  o §7.22 dizia 6 mobs e 2 chefes; o código faz 4 e 1. Spec corrigida
REV-01  a TAREFA_1.27f dizia "a fazer" depois de feita. Corrigido
REV-02  o T11 aparecia na frente com o arnês congelado. Corrigido
DEC-10  o fuso: a cena lia o UTC cru, três horas adiantada no Brasil.
        DECIDIDA pelo dono — BRASÍLIA PARA TODOS
```

**Adotado:** as correções conferidas, a governança (o ROADMAP é a fila única, o
RETOMAR é o estado único) e o cartão 1.33 revisado. **Não adotado:** trocar os 27
documentos pelos reescritos — o revisor os escreveu sem o código, e ficam na
pasta como referência.

### O que espera o dono

**DEC-11** (os 154.000 sims) e as decisões DEC-01 a DEC-09 da revisão — a lista
está no `ROADMAP.md`, seção *Esperando decisão do dono*.

---

## 0a. ONDE PARAMOS — 16/09/2026

```text
o LINK     http://localhost:8099/app/index.html
           sobe com:  node tools/servir.mjs --porta 8099
a PASTA    C:\Users\gdult\pa4
o ESTADO   1.27f · T9 · T10 · T13 · T11a FECHADOS
           Q1 VERDE 2162/2162 com navegador · Q2 VERDE 1005/1005
           o portão fecha em 3 MINUTOS quando o bloco não toca em app/ nem no
           arnês, e o `npm test` caiu de 7m44 para 5m44
```

### O T11a, que nasceu de uma pergunta do dono

> *"e dá pra diminuir esse relógio nos testes?"*

Dá, e medindo apareceu um defeito que passou blocos escondido atrás de uma linha
de base VERDE: a `capturarBase` chamava `__passoQuadros(2)` **de dentro** do
predicado do `waitForFunction`, e o agendador do Playwright depende do
`requestAnimationFrame` que o `RELOGIO_QUADROS` substituiu.

```text
[perfil] sondas=1  quadro=2        em 30 s de espera
```

A sondagem ficava presa na fila que ela mesma deveria drenar.

> Os 30 s nunca foram o app avançando. Eram o app chegando na fase de apostas
> por **relógio de parede** — o oposto do que o D-099 comprou.

```text
capturarBase, 4 larguras   177 s  ->  61 s     2,9x
npm test inteiro          7m44s  -> 5m44s     -2 min em TODA execução
```

E as quatro larguras passaram a chegar no MESMO quadro 448 — o ganho de
determinismo é maior que o de tempo.

### O NÚMERO QUE MUDA A ROTINA DO PROJETO

```text
Q2 com a árvore INTOCADA      3 min 02 s     0 reavaliados de 1002
antes do T13                  ~4 min         14 reavaliados
Q2 depois de mexer em test/   124 min        148 reavaliados
Q2 do zero, sem cache         453 min
```

**O requisito de 30 min do dono está cumprido para o bloco que não mexe na
tela**, e continua devido para o que mexe — esse é o **T11**. A diferença entre
os dois casos é o boot do Chromium por mutante, e nenhuma poda o move.

### O 1.27f saiu, e ele é produto — o primeiro em seis dias

O cartão da equipe estava parado desde 10/09 com a ordem de serviço pronta em
`docs/TAREFA_1.27f_CARTAO.md`. Saiu inteiro, e o que ele resolve é uma
contradição que era minha e não do dono:

```text
04/09   "uma loucura, bagunça total, muito feio e confuso"
10/09   "você removeu as informações de stats, lv que evolui etc."
```

**As duas queixas são verdadeiras.** A contradição só existe se a resposta for
esconder — e foi essa a resposta errada que eu dei em 04/09. O problema nunca
foi a QUANTIDADE de informação: era a FORMA dela.

```text
compacto    reabsorve `forma` e `evolucao`; xp/potencial/natureza ficam na ficha
stats       3 linhas de texto de 27 px viram 3 barras de 18 px, número DENTRO
evolução    ficha de uma linha: `evolui` miúdo, o requisito é a manchete
nível       aparece UMA vez (com a barra de XP junto ele saía repetido)
lista       flex-wrap vira GRADE; o cartão aceita a largura que a grade dá
cartão      104x144  ->  147x198 no largo, 125x198 no estreito
```

### TRÊS DEFEITOS DE LEITURA que a suíte não pega, e a captura pegou

Nenhum é erro de execução. Os três aparecem para quem olha, e é exatamente a
classe dos três do V1.15 que passaram por 299 testes verdes.

```text
1  "ATQ" em 8 px mede ~25 px e transbordava a coluna de 20 — o preenchimento
   da barra cobria o Q
2  `.f-ve b` usava var(--gold), que é o ACENTO do tema e vale #00e5ff no
   padrão: VEL saía CIANO do lado de DEF, que também é ciano
3  o rodapé da concentração virou CÉLULA da grade e ocupou o lugar do quinto
   cartão
```

O `tools/olhar-cartao.mjs` foi refeito (ele tinha se perdido num `/tmp` limpo) e
agora **reprova sozinho** no caso 1. Ele fotografa o painel nos dois modos em
duas larguras, **e o primeiro cartão sozinho a 3×** — porque densidade não se
julga numa página de 2 500 px, e as duas queixas do dono eram sobre densidade.

### O que o portão custou, e o que isso diz sobre os 30 min

```text
execução 1   143 min   275 reavaliados · 723 reaproveitados · VERMELHO 1/998
execução 2   129 min   145 reavaliados · 853 reaproveitados · VERDE 998/998
```

O único escapado foi um defeito **meu**, do próprio 1.27f, e o motivo é uma
armadilha que vale registrar:

> **O S1002 era um mutante EQUIVALENTE.** Ele mudava uma linha que um `return`
> anterior já tornava inalcançável. Nenhum teste podia pegá-lo, porque não havia
> o que pegar — o comportamento era idêntico.
>
> Mutante equivalente não é teste fraco: é defeito mal plantado. Replantado para
> tirar a guarda `temItem`, ele passou a morder na hora.

### E a execução 2 revelou o que faltava para entender os 30 min

**145 reavaliações por UMA linha de definição de defeito mudada.** Fui medir, e
são dois eixos independentes — que é a razão de o T9 ter fechado sem os 30 min:

```text
D-106 / T13   QUANTIDADE   114 dos 145 não foram causados pelo bloco. O
              (bloco P)    `portao.mjs` já cobra que `defeitos-plantados.mjs`
                           não invalide tudo, mas cobra no ARNES — e ARNES é o
                           que se SOMA a um fecho RESOLVIDO. Para as 22 suítes
                           de fecho TUDO a guarda não vale nada
T11           CUSTO        ~31 s de parede por reavaliação. O piso é o boot do
              (bloco M)    Chromium por mutante, e nenhuma poda o move
```

**O T13 vem primeiro: é P, e hoje TODO bloco paga 114 reavaliações caras só por
acrescentar um defeito plantado** — coisa que todo bloco faz.

### O que entrou para a fila neste bloco

```text
D-105  `semTexto` não entende literal de expressão regular, e o `$` de uma
       âncora volta como "usa sem importar: $"          bloco dono T12 (novo)
T12    proposto em BUILD_BLOCKS, com escopo, sabotagem e saída
```

O D-105 tem **teste que afirma o defeito de propósito** em
`test/invariantes.mjs` — ele fica vermelho no dia em que o T12 consertar, e é
assim que se sabe que a entrada em `DEFEITOS.md` virou mentira.

### O T13, que nasceu no meio disto e fechou junto

Ele não estava na fila: apareceu porque a execução avisou **145 reavaliações por
UMA linha de definição de defeito mudada**. A causa é uma guarda que existia,
tinha teste, passava verde e não fazia o trabalho dela:

> O `portao.mjs` cobrava que `test/defeitos-plantados.mjs` ficasse fora do
> **`ARNES`**. Mas `ARNES` é o que se SOMA a um fecho **RESOLVIDO** — para as 22
> suítes de fecho `TUDO` a exclusão não valia nada.

É o **D-106**, e é a terceira vez que a mesma forma aparece (D-103, D-105). A
classe já tem nome: **guarda escrita a partir de um exemplo protege aquele
exemplo.**

O conserto: a exclusão saiu do `ARNES` e virou `FORA_DA_DIGITAL` em `fecho.mjs`
— o funil por onde TODA digital passa. E o teste deixou de procurar uma linha no
TEXTO do `sabotagem.mjs` e passou a CHAMAR a função, que é o que o teste antigo
não fazia e por isso o defeito escapou.

### A DECISÃO QUE FECHA O DIA, e ela é do dono

Pergunta dele, 16/09: *"o que estamos fazendo é desenvolvimento ou estamos
corrigindo erros?"*. O `git log` respondeu:

```text
últimos 8 dias        49 commits
  de PRODUTO           1     o 1.27f
  de arnês/portão     40
```

**O arnês está CONGELADO.** A regra nova está no `CLAUDE.md`, seção *"O arnês
serve o produto, e não o contrário"*:

> Bloco de arnês só é construído quando ele IMPEDE trabalho de produto, e com
> orçamento nomeado ANTES de começar. *"O portão não termina"* impede; *"o
> portão está lento"* não.

Achado novo de arnês vai para `DEFEITOS`/`LACUNAS` com bloco dono e espera. Os
números que fecham a conta: portão de 7 h para 3 min 02 s, suíte de 9 min para
5 min 44 s.

### O PRÓXIMO *(de 16/09 — HISTÓRICO; a fila viva é só a do ROADMAP)*

`docs/ROADMAP.md`, seção **O QUE FALTA**.

```text
T11            o outro eixo dos 30 min: um navegador vivo por trabalhador.
               O T13 derrubou a QUANTIDADE de mutantes; o T11 ataca o CUSTO
               de cada um (~30 s de boot de Chromium)
1.33 · 1.34    PRODUTO — dia, tarde e noite, com a regra do dono que governou
               o clima: efeito VISÍVEL na wave, nunca um número que ninguém vê.
               A L-178 nasce junto: hoje o clima muda o que a wave RENDE, e
               não QUEM aparece nela
T8 · T4 · T7   manutenção do arnês
1.30           os 34 ícones de item — ⏸️ espera o dono mandar a arte
```

E três que não são código, todos com dono e todos parados: **L-042** (arte do
ContentPack original, prazo: antes do fim da V1), **L-012** (consulta de
enquadramento regulatório, BLOQUEIA A TAG), **L-010** (política de publicidade e
afiliados, sem dono em nenhum documento).

---

## 0b. ONDE PARAMOS — 15/09/2026, madrugada

```text
o LINK     http://localhost:8099/app/index.html
           sobe com:  node tools/servir.mjs --porta 8099
a PASTA    C:\Users\gdult\pa4
o ESTADO   Q1 VERDE 2145/2145 com navegador · árvore limpa · tudo empurrado
           T9 e T10 CONSTRUÍDOS e MEDIDOS, esperando só o Q2 completo
```

### O dia inteiro foi ARNÊS, e o 1.27f não foi tocado

Isso precisa ser a primeira frase porque é a mais importante para quem retomar:
**nenhuma linha de produto mudou em 14/09.** O cartão da equipe continua onde
estava, com a ordem de serviço pronta em `docs/TAREFA_1.27f_CARTAO.md`.

O que aconteceu foi que o repositório saiu do `pa4` pela primeira vez, e o arnês
inteiro quebrou — sete defeitos, todos da mesma família:

```text
D-095  sete tools/ calculavam a raiz com idioma de Windows       CORRIGIDO
D-096  a passada estreita ESCREVIA a linha de base visual        CORRIGIDO
D-097  prazo de PAREDE contra relógio de ANIMAÇÃO                CORRIGIDO
D-098  booleano onde precisava ser conjunto (7 sondas para ler 1) CORRIGIDO
D-099  a tela da arena não reproduz                              RESOLVIDO*
D-100  o portão afogava a máquina e lia afogamento como captura  CORRIGIDO
D-101  o portão era dependência de si mesmo                      CORRIGIDO
L-179  o cache do Q2 estava no .gitignore                        VERSIONADO
```

\* O D-099 é uma **desistência medida**: a arena saiu da digital de pixel depois
de cinco tentativas. Está escrito o que se perde e o que cobre no lugar.

### O QUE O PORTÃO CUSTA, medido a cada etapa

```text
sonda visual (4 larguras, 7 sondas)     226 s
depois do D-098 (corte de sondas)        82 s
depois do T10 (a luta em sonda própria)  30 s      7,5x no total
```

### E A LIÇÃO QUE CUSTOU O DIA

> **Cada melhoria do portão invalidava o que tornava o portão rápido.** O T9
> matou o cache de vereditos; o T10 matou o índice de captura. Medi ganho real
> em cada peça e nunca colhi o ganho agregado, porque a próxima correção sempre
> reiniciava a contagem.

Os dois lados estão consertados — D-101 (o cache) e a tabela `IRMAS` em
`sabotagem.mjs` (o índice). **A partir daqui, mexer no arnês é barato.**

### O QUE FALTA, e é uma coisa só

`npm run sabotagem` verde. Na máquina de medição (4 núcleos, container) ele
projeta ~9 h e o container cai antes. **Na máquina do dono ele deve ser bem mais
rápido**, e é a primeira execução que colhe todas as correções juntas.

```bash
npm run sabotagem      # é isto que fecha o T9 e o T10
```

Se vier verde: marcar T9 e T10 como fechados no `BUILD_BLOCKS` e seguir para o
**1.27f**, que é produto e é o que o dono pediu.

### Uma dívida registrada, e ela é séria

O `Q2 VERDE 987/987` de 14/09 pela manhã — que fechou o D-095 e o D-096 — está
marcado como **NÃO CONFIÁVEL** no D-100: rodou com 4 caixas afogando 4 núcleos,
e nessa condição suíte que reprova por falta de CPU conta como `PEGOU`. Não está
provado falso; está provado não confiável. A execução que vier o substitui.

---

## 0c. ONDE PARAMOS — 14/09/2026, noite

```text
o LINK     http://localhost:8099/app/index.html
           sobe com:  node tools/servir.mjs --porta 8099
           (até hoje este comando só funcionava no Windows — D-095)
a PASTA    C:\Users\gdult\pa4
o ESTADO   T9 fechado · Q1 VERDE 2144 · o portão saiu de 7 h para ~90 min
```

### O dia inteiro foi uma coisa só: o repositório saiu do `pa4` pela primeira vez

E quebrou em quatro lugares, todos da mesma família — **o que faz o projeto
rodar e o portão ser rápido morava fora do repositório**:

```text
D-095  sete tools/ calculam a raiz com idioma de Windows        CORRIGIDO
D-096  a passada estreita ESCREVIA a linha de base visual       CORRIGIDO
D-097  o portão reprova a si mesmo: 4 navegadores, 4 núcleos    CORRIGIDO
D-098  o booleano do navegador subia 7 sondas para ler 1        CORRIGIDO
L-179  o cache do Q2 estava no .gitignore                       VERSIONADO
```

### O requisito que o dono fixou no meio disso

> **O portão completo em no máximo 30 minutos.** Ele disse que não aceita nada
> diferente, e que desistiria de esperar 7 h de novo.

O cache de vereditos e o índice de captura **entraram no git** (`.gitattributes`
os marca `-diff`, então o diff de bloco continua legível). Clone novo não paga
mais a execução fria.

### T9 — feito, e o que ele mediu

```text
--so=visual   226 s -> 82 s      mesmos 49 testes
portão        7 h -> ~90 min aqui · ~53 min na máquina do dono
```

O corte foi transformar um **booleano** em **conjunto**: `--so=visual` subia
sete Chromiums e lia um. Nasceu `SONDA_DA_SUITE` em `bandeiras.mjs`, com duas
guardas para que nenhuma suíte suma calada (S109) — e a segunda foi sabotada
antes de merecer confiança.

### T10 — o próximo, e ele é menor do que parecia

O cronômetro por fase (`Q2_TEMPOS=1`, novo) mostrou que **metade dos 64 s que
sobraram é a partida sendo jogada em tempo real**. A leitura trouxe a boa
notícia: a luta já está isolada no fim da sonda, e só **4 dos 49 testes**
dependem dela — 27,5 s dos 64.

Partir a luta em sonda própria é o T10, e a ordem de serviço está no
`BUILD_BLOCKS`. Ele também manda **medir o paralelismo**: 4 trabalhadores dão
2,3x em 4 núcleos, e 2 ou 3 podem render mais.

### E o 1.27f continua esperando

Nada disto mexeu na fila de produto. A ordem de serviço do cartão da equipe
está em `docs/TAREFA_1.27f_CARTAO.md`, escrita para quem não acompanhou nada.

---

## 0d. ONDE PARAMOS — 14/09/2026, manhã

```text
o LINK     http://localhost:8099/app/index.html
           sobe com:  node tools/servir.mjs --porta 8099
           ATENÇÃO: até hoje este comando SÓ funcionava no Windows. Ver D-095.
a PASTA    C:\Users\gdult\pa4
o ESTADO   Q1 VERDE 2044/2044 (sem navegador) · Q2 VERDE 987/987 · árvore limpa
```

### O que aconteceu em 14/09: o repositório foi aberto fora do `pa4`

E foi a primeira vez. Três coisas quebraram na hora, e as três são a MESMA
coisa dita de três jeitos: **o que faz este projeto rodar e o portão ser rápido
mora fora do repositório, e só existe na máquina do dono.**

```text
D-095  sete tools/ calculam a raiz com `.slice(1)` no pathname — idioma de
       Windows. No POSIX a raiz sai DOBRADA e o servir.mjs responde 404 no
       jogo. Só um dos sete tinha teste.        CORRIGIDO (fileURLToPath)

D-096  a passada ESTREITA do Q2 criava a linha de base visual com 4 entradas
       onde a cobertura cobra 16, e o portão abortava para sempre culpando a
       configuração.                            CORRIGIDO (recusa + remédio)

L-179  o cache de vereditos está no .gitignore. Clone novo paga o Q2 A FRIO,
       sempre. Medido aqui: 6 h 58 min, 987 reavaliados, 0 reaproveitados.
```

### E o dono fixou um requisito no meio disso

> **O portão completo em no máximo 30 minutos.** Ele disse que não aceita nada
> diferente disso.

Não é conforto. A conta mostra que o caso QUENTE dele já está em ~24 min (99
reavaliados × 14,4 s), e que o `CLAUDE.md` anuncia 68 min para um portão que
hoje custa ~4 h a frio — o número foi medido com 283 defeitos e são 987.

**O bloco é o `T9 — O portão em 30 minutos`**, proposto no `BUILD_BLOCKS` com a
lacuna `L-179`. O item 1 dele é MEDIR, e a medição é entregável: decompor os
25 s por mutante antes de consertar qualquer coisa.

### O próximo bloco continua sendo o 1.27f

Nada do que aconteceu em 14/09 mexeu na fila de produto. A ordem de serviço
está em `docs/TAREFA_1.27f_CARTAO.md`, escrita para quem não acompanhou nada.

---

## 0e. ONDE PARAMOS — 13/09/2026

```text
o LINK     http://localhost:8099/app/index.html
           sobe com:  node tools/servir.mjs --porta 8099
a PASTA    C:\Users\gdult\pa4
o ESTADO   6514917 · Q1 VERDE 2137/2137 · Q2 VERDE 987/987 · árvore limpa
```

### Duas coisas que você precisa saber antes de qualquer outra

**1. O bloco 1.32 FECHOU** — commit `6514917`, em 13/09. Clima do Avanço: sete
climas, o bônus saindo da raridade do tipo, cinco canais, véu e partículas na
cena, cartão e linha no log. Q1 2137/2137, Q2 987/987.

O Q2 achou um buraco que eu tinha deixado: o **S988** troca a semente derivada
da raiz por `Math.random` e ESCAPOU da primeira execução. Dezoito asserções
mediam o que o clima PAGA, e nenhuma olhava de onde ele VEM.

> O §P3 é a regra mais antiga do motor, e foi a que ficou sem guarda. Eu testei
> a aritmética com cuidado e deixei a PROCEDÊNCIA dela sem uma linha.

**2. O bloco do cartão da equipe (1.27f) se PERDEU e precisa ser refeito.** Ele
estava construído e verde. Eu o desfiz com as próprias mãos para separar dois
blocos em dois commits, guardei o backup em `/tmp`, a sessão foi interrompida, e
três dias depois o `/tmp` tinha sido limpo.

> **Backup em diretório temporário não é backup: é uma aposta com prazo.** O
> lugar de pôr trabalho de lado neste projeto é um commit de rascunho.

**A ordem de serviço para refazer está em `docs/TAREFA_1.27f_CARTAO.md`** —
escrita para ser executada por quem não acompanhou a conversa: as seis mudanças
arquivo a arquivo, os três testes que mudam junto, os quatro defeitos plantados
novos, e a ferramenta de olhar que se perdeu com ele.

As capturas de antes e depois estão em `tools/previas/_cartao/` e servem de
alvo.

### E um estrago que o mesmo episódio causou, já consertado

O script de reversão cortou o `app/index.html` por índice de string e duplicou
**3 725 linhas** — de 7 861 para 11 586, com zero remoções. O arquivo abria,
rodava, e tinha metade do conteúdo duas vezes.

Quem pegou foi o pré-voo do Q2, com trinta defeitos plantados de âncora
ambígua — porque o trecho que cada um procura passou a existir duas vezes.

```text
o conserto   tools/conserta-index.mjs — reconstrói de HEAD e reaplica as duas
             inserções do 1.32, CONFERINDO o tamanho final e cada marcador
o resultado  7 861 -> 7 906 linhas (base + 45 do clima)
```

> Editar um arquivo de 8 000 linhas por recorte de string é operação sem rede.
> Ela não falha com erro: falha com um arquivo que abre e roda.

---

## 1. O que ler primeiro, nesta ordem

```text
CLAUDE.md                        COMO se trabalha aqui. Vem antes de tudo.
docs/RETOMAR.md                  este arquivo — onde paramos
docs/PAUTA_2026-09-08.md         tudo que está pausado, lacuna a lacuna
docs/ROADMAP.md                  a fila: feito, pausado, prioridade
docs/POKEARENA_SPEC_MASTER...md  §7.22 — o Avanço, que é o trabalho de agora
git log --oneline -12            o que foi construído, e por quê
```

---

## 2. ONDE PARAMOS — 08/09/2026, noite

### A trilha A — o AVANÇO (Spec §7.22)

O idle deixou de ser um contador: dez waves por estágio, chefe na décima, e a
batalha acontece DENTRO do cenário do bioma.

```text
A1  ✅ o elenco do estágio sai do pack        engine/elenco-estagio.mjs
A2  ✅ a resolução da wave                    engine/wave.mjs
A3  ✅ HP, stamina, as quatro poções, o baú   engine/avanco.mjs
A5  ✅ abate ≠ encontro ≠ avanço              engine/avanco.mjs
A6  ✅ a bola durante o avanço                engine/avanco-bola.mjs
A7  ✅ a reserva, o que rende, o treino       engine/ausente.mjs
A4a ✅ a run acontece NO RELÓGIO              engine/roteiro-wave.mjs
                                              engine/run-avanco.mjs
A4b ✅ A BATALHA NA TELA                      app/modules/avanco-*.mjs
A4c ✅ a mão do jogador, o que a run PAGA, e o teto que avisa (L-151)
A4d ✅ a duração pela FORÇA e o foco no Avanço (L-152, L-153)
A4e ✅ ROTA OFF / TRAINER OFF vira aba própria (L-154)
A4f ✅ a leitura da run — Hunt Analyzer, ícones e cores no log
A4g ✅ a batalha que se LÊ — e o D-079, que estava por baixo de tudo
```

**A Prioridade 0 fechou**, e depois dela três blocos da ordem:

```text
1.31 ✅ a BOUTIQUE de PokéCash      101 peças, 33 à venda, 19.750 a coleção
1.29 ✅ a Essência vira ESTILHAÇO   52,85% do que caía não tinha porta
1.27 ⏳ EM CURSO — a ordem do dono FECHOU inteira; falta o L-164
```

---

## 2a-bis. O 1.32 — O CLIMA DO AVANÇO, fechado em 10/09/2026

A L-119, e a regra que governa a trilha inteira do clima e do dia:

> "os blocos anteriores serão aplicados já dentro da nova metodologia" — e, para
> o clima: **efeito VISÍVEL na wave**, nunca um número que ninguém vê.

```text
CLIMA          TIPO(S)        COBERTURA   EQUIPE CHEIA   CANAL
Sol Forte      fogo             11 esp        +18%       XP
Chuva          água             32 esp        +11%       ritmo
Vendaval       voador           16 esp        +15%       moeda
Tempestade     terra+pedra      19 esp        +14%       material
Névoa Tóxica   veneno           33 esp        +10%       item raro
Pólen          planta           14 esp        +16%       material
Nevasca        gelo              4 esp        +30%       item raro
Tempo Firme    —                  —             —        40% do peso
```

### As três decisões que valem reler

```text
o QUANTO sai da RARIDADE   e não de uma tabela. O dono levantou o Gelo (4 de
                           146); a resposta não foi escrever um número maior na
                           linha dele — foi o número vir da cobertura, para que
                           ninguém reescreva nada quando o elenco mudar
paga quem foi ENVIADO      regra literal dele. A sprite é encenação; quem paga
                           é quem o jogador escolheu levar — senão o bônus é
                           sorteio sobre sorteio, sem decisão nenhuma
revelado ao ENTRAR         a mesma decisão da Arena. Sabido antes, a escolha de
                           equipe vira conta ("deu Nevasca, levo os quatro de
                           gelo") e o resto do time deixa de existir
```

### E o que o jogador VÊ, que é a metade que o §7.22 existe para proteger

```text
o VÉU          cor sobre o chão, por baixo dos lutadores
as PARTÍCULAS  46 gotas no panorâmico, 15 no estreito — por DEZ MIL PIXELS de
               janela, medido em 846 px opacos (1,01% da tela)
o CARTÃO       nome, o que rende, quanto, e GRAÇAS A QUEM
o LOG          no primeiro segundo da run, e não no extrato do fim
```

### Dois erros meus que só a FOTO pegou

```text
a DENSIDADE    escrevi 46 num campo que é "por dez mil pixels". Em 403x207 dava
               384 gotas, e o teto de 90 escondia o erro atrás de uma parede
               d'água. Quem pegou foi a asserção de que a janela larga tem MAIS
               gotas que a estreita: as duas estavam grampeadas em 90
a FRASE        "para quem é water" — chave interna em vez do nome do tipo. Eu
               remontei um texto que o pack já escrevia certo no `desc`
```

> Nenhum dos dois é erro de lógica, e nenhum teste verde os teria dito. Os dois
> são a segunda metade do Q5 fazendo o trabalho dela.

E um terceiro, do mesmo tipo, achado ao LER a captura: `.avClimaNome` e
`.avClimaFrase` eram dois `<span>` com `margin-top` — e margem vertical não vale
em elemento inline. A tela mostrou **"CHUVAninguém da equipe"**. O estilo não
falhou: ele foi ignorado, que é diferente e mais silencioso.

---

## 2b. O 1.27 — FECHADO INTEIRO, e o 1.27e é o que ele ensinou caro

```text
7a85cac  1.27   a ordem aprovada — os cinco itens
652cfe5  1.27b  a SALA de rotas e o cartão dobrado
f2b6008  1.27c  os números do dano
03751e4  1.27c  o EFEITO do golpe sobre o alvo
1fc9665  1.27d  a Rota OFF, e um erro que esperava um dado
e6f4247  1.27d  o AVANÇO PROGRESSIVO
cf1f9ea  docs   a progressão, o que o bloco ensinou, o que ficou aberto
   ↓
1.27e  O SUMIÇO DA SPRITE — e o bloco anterior fechou dizendo que estava pronto
```

### O que o dono cobrou, e ele estava certo pela terceira vez

> "as sprites continuam bugadas sem sair os efeitos de ataque, e os pokémon
>  selvagem ficam sumindo as sprite, precisamos resolver isso logo, **3 dias
>  praticamente na mesma coisa**"

Duas causas, e nenhuma delas era o que eu tinha consertado:

```text
D-090   o baixador pedia as folhas de combate só para o elenco da ARENA —
        76 de 146. O Avanço põe na tela o elenco do ESTÁGIO, que sai dos
        BIOMAS. 70 espécies sem Attack nem Hurt em disco
D-091   a escolha da folha perguntava à TABELA (que tem as 146), e não ao
        disco (que tinha 76). Trocar para uma folha que não existe deixa o fundo
        VAZIO — o bicho some no instante do golpe, e a
        placa de nome fica no ar. É exatamente o que as capturas mostram
D-092   o estouro do efeito nascia em coordenada de TELA e era pintado num
        canvas de MUNDO. A escala da run é 3×: cada estouro caía ao triplo
        da distância da câmera, fora da janela
```

### E as folhas SEMPRE existiram na origem

Eu tinha escrito, num comentário do bloco anterior, que *"só 82 das 146
espécies têm essas folhas em disco"* — e construí a queda para trás em cima
dessa frase. Medido em 10/09/2026: **HTTP 200 em todas as que testei.**

> Aceitei um download pela metade como se fosse a fronteira do material, e
> passei um bloco inteiro desenhando em volta dela.

```text
                       ANTES        DEPOIS
Attack-Anim.png em disco    76          146
Hurt-Anim.png em disco      76          146
estouros FORA DA TELA  (ninguém contava)  0
foto COM estouro no ar (nunca existiu)  tirada
```

## 2c. O QUE ESTE BLOCO ENSINOU, e é o que vale reler

**Seis vezes** o portão Q2 reprovou um defeito plantado meu pela MESMA causa —
arquitetura, e não redação:

```text
S934  a separação das placas    a conta morava junto do `style.transform`
S938  a marca do quadro         o filtro morava dentro de uma `innerHTML`
S943  o aviso do foco futuro    a frase morava dentro de uma `innerHTML`
S944  a frase do foco neutro    idem
S963  a limpeza dos números     em camada 4
      o efeito do golpe         a tabela e o carregador vinham do mesmo lugar
```

> **Conta que só pode ser verificada com navegador acaba verificada por
> ninguém.** Afirmar que uma função EXISTE e é CHAMADA não afirma que ela FAZ
> algo — e o defeito mora exatamente entre as duas coisas.

### E QUATRO vezes uma sonda mediu a coisa errada

```text
o número do dano    reportou ZERO logo depois de eu consertar o D-083 — ela
                    olhava o nó adicionado, e ele passara a nascer DENTRO dele
a raridade          escrevia 'comum' num campo DERIVADO, e o dono pegou olhando
                    uma captura que EU anexei: "um charizard desde quando é comum?"
a passada do chefe  voltou idêntica à wave 1, e só não passou porque o relatório
                    passou a dizer EM QUE WAVE a foto foi tirada
o estouro           "quantos estão no ar AGORA" responde zero quase sempre —
                    ele vive meio segundo
```

> Sonda que mede o instante errado dá um número, e número parece medição.

### E a QUINTA sonda errada foi a mais cara de todas

O 1.27c fechou dizendo **"14 estouros agendados, 413 desenhos"**. Os dois
números estavam certos: a função rodou 413 vezes. E a tela não tinha efeito
nenhum, porque todos os 413 caíam fora da janela.

> **Contador conta CHAMADA.** Ele não olha para a tela, e por isso não sabe se
> o que foi desenhado caiu no lugar — ou se caiu fora dela.

O que a esteira aprendeu a fazer, e que é o conserto de método:

```text
CONTAR os que caem fora do canvas    o número que estava faltando
ESPERAR o estouro estar no ar        e só então fotografar — ele vive meio
                                     segundo, e toda foto anterior o perdia
DIZER os 404 pelo NOME               ela os FILTRAVA por serem comuns, e era
                                     essa a classe de erro que custou 3 dias
PERGUNTAR a pergunta seguinte        "está fora o estouro, ou o mob?" — foi
                                     ela que separou o D-092 da L-175
```

### E a esteira salvou o que a suíte não pegou

O D-089 matou a cena inteira — zero placas, zero números, zero efeitos — com a
suíte VERDE. Quem pegou foi a contagem da esteira: **três zeros juntos não são
coincidência**. O buraco do portão está na L-174.

---
## 3. O QUE ESPERA O DONO — a lista que não arquiva sozinha

```text
⏸️ L-158  quais dos 9 TRAJES vão à vitrine   STAND BY por decisão dele em
                                             09/09 — volta quando os
                                             cosméticos entrarem em pauta
✅ os VÍDEOS do Baiak                        LIDOS em 09/09 — a seleção de
                                             hunt e a movimentação. Ver L-164
✅ L-161  as decisões de 09/09               DECIDIDAS, e registradas
✅ L-142  o veredito sobre a prévia          APROVADO em 08/09
🔴 L-137  os ícones — ele manda um a um      1.30 está SEGURADO a pedido dele
🔴 L-117  o repasse do RMT                   segurado por ele, duas vezes
🔴 L-144  o laboratório B1..B7               falta a curva: custo e ganho
🔴 L-143  o Vulcão não sustenta 4 estágios   recomendação escrita
🔴 L-135  os preços da loja                  nunca passaram pelo estudo
```

---

## 4. A ORDEM DEPOIS DO AVANÇO *(de 08/09 — HISTÓRICO; a fila viva é só a do ROADMAP)*

```text
1º  A4    o Avanço inteiro                ✅ FECHADO em 08/09
1º  1.31  a BOUTIQUE de PokéCash          ✅ FECHADO em 09/09
1º  1.29  a Essência vira ESTILHAÇO       ✅ FECHADO em 09/09
2º  1.27  Arena e farm multi-bioma        É O PRÓXIMO — a L-140 mudou de
                                          forma com o Avanço: mandar dois no
                                          mesmo bioma virou DUAS FRENTES DE
                                          WAVE, e a ficha deixou de ser um
                                          ajuste de número para virar desenho
3º  1.29  a essência vira Estilhaço       o maior buraco de economia aberto,
                                          e o desenho está PRONTO na L-138
4º  1.27  Arena + multi-bioma
5º  1.32–34  clima · dia/noite · como funciona
    1.30  os ícones                       ENTRA QUANDO A ARTE CHEGAR
    1.28  o quadro de log                 ABSORVIDO pelo A4
```

---

## 5. Como rodar

```bash
npm run rapido        # a suíte sem navegador — ~1 min
npm run sabotagem     # o portão Q2 — obrigatório para fechar bloco
npm run portoes       # tudo, com navegador
node tools/servir.mjs --porta 8099
```

```text
o JOGO     http://localhost:8099/app/index.html
a PRÉVIA   http://localhost:8099/app/previa-avanco.html
a PASTA    C:\Users\gdult\pa4
```

**Variáveis já no shell:** `PW_MODULO` e `PW_CHROME` — o portão visual precisa
das duas.

---

## 6. As regras que mais pegam, e que estão no CLAUDE.md

Vale reler as cinco, porque são as que mais custaram neste projeto:

```text
§0.3     nenhum identificador da franquia em engine/ — COMENTÁRIO CONTA.
         Já me pegou SETE vezes.
Q5       tem duas metades, e a segunda é OLHAR. Verde não é legível.
Q2       fechar bloco com o portão vermelho não acontece. Nem "é só teste".
ÂNCORA   defeito plantado com âncora perdida se REALVA, nunca se apaga.
O DONO   nunca fica sem o jogo na mão: ao fechar bloco, o link local vai no
         relatório, conferido.
```

E a lição que este projeto repete mais que qualquer outra:

> **A afirmação passa por um caminho que o defeito não toca.** SEIS vezes: eu
> medi um lugar e falei do conjunto. Quando um teste passar e a sabotagem
> escapar, a resposta quase sempre é essa.
