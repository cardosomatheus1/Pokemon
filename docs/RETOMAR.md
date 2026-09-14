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

## 0. ONDE PARAMOS — 14/09/2026

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

## 0b. ONDE PARAMOS — 13/09/2026

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

## 4. A ORDEM DEPOIS DO AVANÇO

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
