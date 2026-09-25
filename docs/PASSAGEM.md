> **HISTÓRICO (ST-6.1, 25/09/2026).** Registro, e não ordem: contagens e "próximos" aqui
> são da data do documento. O estado é `docs/RETOMAR.md`; a fila, `docs/ROADMAP.md`.

# PokéArena — passagem de bastão

Este arquivo existe para quem pega o projeto agora. Ele não repete o que o
código já diz: ele conta **como se trabalha aqui**, **onde estão as armadilhas**
e **quais decisões já foram tomadas** — que é o que se perde quando um projeto
troca de mãos.

Leia o `CLAUDE.md` primeiro; ele governa o método. Este arquivo é o
complemento: o estado em que a casa foi entregue.

---

## Em uma frase

Battle royale automático de apostas com moeda **simulada**: doze lutadores
sorteados, odds por Monte Carlo, trinta segundos de aposta, e uma batalha
determinística que o jogador assiste. Em volta disso, um metagame de treinador.

**Nada aqui move dinheiro de verdade.** Isso não é detalhe de implementação — é
o que permite metade das funcionalidades existirem antes do checkpoint
regulatório do §25.1.

---

## O estado, em números

```
suíte           1113 testes, VERDE
sabotagem       503 defeitos plantados, 100% detectados
módulos         62 no app, todos com camada declarada
commits         45
```

Rodar tudo:

```bash
npm test                 # a suíte (pula o portão visual se não houver navegador)
npm run sabotagem        # o Q2 — obrigatório antes de fechar qualquer bloco
node tools/servir.mjs    # o jogo em http://localhost:8099/
```

**Zero dependências no repositório.** O `node_modules` não existe aqui e não vai
existir. O Playwright, necessário para o portão visual, mora **fora** do projeto
— ver `tools/README.md`.

---

## As cinco coisas que mais custaram caro, e que vão custar de novo

### 1. Construído, ligado a nada

O padrão mais caro deste projeto, encontrado **sete vezes**. Alguém constrói uma
função correta, a suíte fica verde, e nada na tela chama aquela função. O
exemplo mais claro é o `D-028`; o mais recente foi o R37a, onde um catálogo de
vinte e quatro pokébolas era desenhado e apagado no mesmo quadro.

**Como se defende:** todo bloco que constrói comportamento visível ganha um
teste que afirma a LIGAÇÃO, e não só a função. Procure por `D-028` nos
comentários dos testes; há vários exemplos do formato.

### 2. Teste que checa algo *parecido* com o que importa

Quatro defeitos plantados escaparam no R40 por isso. O pior foi o `S490`: três
asserções verdes sobre uma guarda que não existia mais, porque doze dos dezoito
ids de moldura são iguais aos dos efeitos de nome — a função caía na lista
errada e devolvia as mesmas respostas.

**Como se defende:** a sabotagem. Um teste que não fica vermelho quando o
código quebra é decoração. É por isso que o Q2 é obrigatório.

### 3. O arnês que mente

Um instrumento de captura gravou **dezoito PNGs idênticos e vazios** e terminou
dizendo que deu certo. Quatro causas empilhadas, todas encontradas olhando.

**A regra que ficou:** peso de imagem nunca prova conteúdo. A tela de entrada
deste jogo pesa 292 KB sozinha e passa por qualquer limiar de bytes. O sinal
certo é sempre **estrutural** — "a lista de odds está preenchida?", não "o
arquivo é grande?".

### 4. Teste que casa com o próprio comentário

Encontrado **seis vezes**. Um teste proíbe uma palavra no código; o comentário
que EXPLICA por que a palavra é proibida contém a palavra; o teste reprova a
explicação.

**Como se defende:** tirar os comentários antes de afirmar. O padrão está em
vários arquivos:

```js
const semComentario = APP.replace(/\/\*[\s\S]*?\*\//g, ' ');
```

### 5. Determinismo no lugar errado

O `D-042`. Para deixar uma captura estável, alguém pôs `animation:none` sob
`prefers-reduced-motion` — e isso congelou quadros `forwards` no ÚLTIMO passo,
onde a opacidade é zero. Todos os avisos da arena sumiram, só para quem tinha a
preferência de acessibilidade ligada.

**A regra que ficou:** determinismo mora no ARNÊS (`getAnimations().finish()`);
acessibilidade mora no PRODUTO. Trocá-los de lugar quebra os dois.

---

## Decisões tomadas, para não serem retomadas

### O motor não conhece a franquia

O §0.3 é "Engine != Pokémon". Nenhum identificador da franquia pode aparecer em
`engine/`, `server/`, `app/modules/` ou `index.html` — o `test/pack-original.mjs`
varre e reprova. Os nomes vivem só no ContentPack.

Isso pega em lugares inesperados: no R43, duas artes chegaram com nome da
franquia no arquivo e precisaram ser renomeadas antes de entrar no catálogo.

### Cosmético escolhido anima sempre

Mesmo com `prefers-reduced-motion` ligado. A justificativa está escrita no
`test/tema.mjs` e vale para movimento também: *"um efeito Neon que muda de cor
com o tema deixa de ser o efeito que a pessoa escolheu"*. Um Glitch que não
falha não é um Glitch.

**É por isso que os catálogos têm PARES.** Quem não quer movimento equipa uma
das seis molduras estáticas, em vez de receber a animada mutilada.

### Todo cosmético será desbloqueado

Recompensa, missão, loja, baú. **Hoje tudo está liberado porque o projeto está
em desenvolvimento e o dono precisa testar** — é estado temporário, não decisão
de produto.

O desenho a seguir é o do `shiny-dados.mjs`: POSSE separada de EQUIPADO
(`gifs`/`skins` guardam o desbloqueado, `onGif`/`onSkin` o equipado).

### A Liga não move dinheiro

A Spec antecipou a Liga de Previsão da V5 para a V2 por **uma** razão: ela não
tem risco regulatório porque não toca economia. O §25.1 trava os mercados
mútuos justamente por não terem essa propriedade.

Uma linha em `liga-dados.mjs` que mexa em saldo destrói isso **em silêncio** — a
tela continua funcionando e o produto passa a ter valor econômico numa
funcionalidade aprovada por não ter. Há um teste que varre o módulo e reprova se
ele mencionar saldo, carteira, aposta, ledger ou payout.

### O shiny tem duas metades, e a pergunta muda por tela

```
arena e tela de vencedor    ter a skin E o lutador ser o escolhido
banner do perfil            só a posse
```

A diferença é **dono**. Na arena o lutador pode ser de qualquer um; no banner do
perfil o bicho já é o que este jogador escolheu para representá-lo.

### O corte da arte é declarado, não recortado

Cada arte guarda **uma posição de enquadramento**, e o CSS a aplica. O arquivo
em disco é sempre a arte inteira.

Começou como necessidade — oito artes são GIF animado, e recortar GIF exigiria
um codificador que não temos — e ficou como a decisão certa: o mesmo arquivo
serve os três encaixes, que têm proporções de 32:1, 3,4:1 e 1,8:1.

### `arte/` é nossa, `assets/` é de terceiros

A distinção governa a tag de saída. Enquanto `ARTE_EMPRESTADA_DE` em
`content/escolhido.mjs` estiver preenchido, o `test/saida-v09.mjs` recusa
publicar. Isso não trava o build privado; trava a publicação.

---

## O que está pendente, e não é código

Três coisas travam o projeto e nenhuma se resolve escrevendo software:

1. **Consulta de enquadramento regulatório** (§0.5.1) — bloqueia a tag da v0.9
2. **Arte do ContentPack original** (§0.3.1) — prazo: antes do fim da V1
3. **Política de publicidade e afiliados** — sem dono em documento nenhum

E uma decisão de infraestrutura esperando o dono: o `D-031`, se o servidor local
deve escutar em `0.0.0.0` (para abrir no celular da mesma rede) em vez de
`127.0.0.1`. Não foi aplicado porque amplia a superfície de ataque.

---

## Defeitos registrados e não corrigidos

Estão em `docs/DEFEITOS.md` com causa, medição e **bloco dono nomeado**. O
`D-044` merece atenção de quem for mexer em aposta: é um teste **instável**, que
falha quando a odd do slot 0 passa de ~166. Instável é pior que vermelho —
vermelho tem endereço, instável escolhe quando aparecer.

---

## Por onde começar

1. `CLAUDE.md` — o método. Não é opcional; ele é o que impediu o projeto de
   perder três versões de novo.
2. `docs/ROADMAP.md` — o que está feito, o que falta, em que ordem.
3. `docs/POKEARENA_SPEC_MASTER_*.md` — a fonte de verdade. Em conflito, a Spec
   vence; se a Spec estiver errada, corrija a Spec no mesmo commit.
4. `git log` — as mensagens de commit deste projeto explicam **o porquê**, não o
   quê. Elas são metade da documentação.

E leia os comentários. Este projeto comenta o **porquê**, e quase todo comentário
longo existe porque alguém já errou ali.
