# PILOTO — 5 a 10 amigos, 14 dias, sem dinheiro real

**Ficha:** ST-7.2 (PILOTO-01) em `docs/PLANO_DE_IMPLEMENTACAO.md`. **Destravado por:**
DEC-01 (fase privada), decidida pelo dono em 25/09/2026. **Este arquivo é o
roteiro, não a fila:** o estado do piloto mora no `RETOMAR.md`, como tudo.

O aceite da ficha é *"problemas priorizados por evidência; saldos e emissão
medidos contra a ST-3.3"*. Tudo abaixo existe para produzir essas duas coisas
com o menor trabalho possível para o dono.

---

## 1. O que o piloto mede, e o que ele não mede

```text
MEDE        cadastro e volta (D1/D7), quem joga em que dia, runs e expedições
            colhidas, moedas e encontros por jogador-dia contra a ST-3.3,
            saldos por balde, apostas e compras — tudo pelo servidor
NÃO MEDE    o que o amigo sentiu. Isso vem da conversa, e entra no registro
            (seção 5) com as palavras dele
```

**Uma limitação conhecida, dita antes:** o progresso do idle (criaturas, bolsa,
runs) mora no navegador de cada amigo — o idle no servidor é um item do E8, com
gatilho próprio. A **conta** (carteira, XP, cosméticos, apostas) é do servidor
e vale em qualquer aparelho; o **idle** não. Quem limpar o navegador perde o
idle e mantém a conta. Avise os amigos no convite.

## 2. Subir o servidor (no PC do dono)

Pede **Node 22.5 ou mais novo** (o banco é o `node:sqlite`).

```powershell
cd C:\Users\gdult\pa4
git pull

# UMA VEZ: gere o segredo de sessão e guarde-o (sem ele, reiniciar o servidor
# desloga todo mundo; em produção o servidor se recusa a subir sem ele)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# A CADA VEZ QUE SUBIR:
$env:AMBIENTE = "producao"
$env:SEGREDO_SESSAO = "<o segredo gerado acima>"
$env:PORTA = "8080"
npm run servidor
```

O mesmo endereço serve o jogo **e** a API (ST-7.2a): abra
`http://localhost:8080/` e o jogo aparece; "Criar treinador" pede e-mail e
senha — é a conta real (ST-7.2b). O banco fica em `dados/pokearena.db`.

### Para os amigos alcançarem

O servidor escuta no PC do dono; os amigos precisam de um endereço público com
HTTPS. O caminho mais curto, **não testado daqui** (o ambiente de
desenvolvimento não tem rede para isso):

```powershell
# Cloudflare Tunnel, sem conta: imprime um https://<algo>.trycloudflare.com
cloudflared tunnel --url http://localhost:8080
```

O jogo e a API saem pelo mesmo endereço, então não há CORS a configurar. O
endereço do túnel rápido muda a cada vez que ele sobe — para 14 dias, vale um
túnel nomeado (conta gratuita da Cloudflare) ou um VPS pequeno.

O servidor escuta só em `127.0.0.1` (a própria máquina) — é o que o túnel
precisa, e é o que impede alguém da rede da casa de chegar nele sem o túnel.

**Conferir antes de mandar o link — o ENSAIO:**

```powershell
node tools/ensaio-piloto.mjs http://localhost:8080
```

Ele cria uma conta de ensaio, aposta uma rodada, confere no servidor que a
aposta foi **liquidada** (o XP sobe), sai e entra de novo. Termina com
`PRONTO PARA CONVIDAR` ou `NÃO CONVIDE AINDA`. Foi o primeiro ensaio que achou
o D-112 (nenhuma aposta era liquidada, com a suíte inteira verde). Depois,
abra o endereço público num celular fora do Wi-Fi de casa e repita à mão.

## 3. A rotina de todo dia (5 minutos)

```powershell
# 1. a cópia do banco — com o servidor LIGADO, é um instante consistente
node tools/banco-copia.mjs copiar

# 2. o relatório
node tools/relatorio-piloto.mjs
```

A cópia vai para `dados/copias/pokearena-<instante>.db` e já sai conferida
(integridade, esquema e o ledger de cada conta contra o saldo). **Se ela disser
que NÃO confere, pare e registre** — é o banco do piloto com problema, e a cópia
de ontem é a boa.

Para voltar de uma cópia (servidor DESLIGADO):

```powershell
node tools/banco-copia.mjs restaurar dados/copias/<a boa>.db dados/pokearena.db --sobrescrever
```

## 4. Como ler o relatório

| seção | a pergunta | o sinal de alerta |
|---|---|---|
| CONTAS | quantos entraram | conta congelada = alguém barrado pela idade; confirme que foi de propósito |
| RETENÇÃO | quem voltou no dia seguinte e no sétimo | D1 abaixo da metade dos cadastros no mesmo dia |
| ATIVOS POR DIA | o piloto está vivo? | dois dias seguidos com menos da metade do pico |
| IDLE | a emissão bate com a ST-3.3? | **razão** de moedas ou encontros fora de 0,5–2 num perfil com 3+ jogador-dias |
| SALDOS | a economia está concentrando? | p90 do `transferivel` acima de 10× a mediana |
| ARENA E BOUTIQUE | alguém usa a arena e a loja? | zero apostas depois do dia 3 |

**A razão do IDLE é a medição da ST-3.3 contra gente de verdade.** Cada
jogador-dia é posto ao lado do perfil que mais parece (casual 2 runs, diário 8,
maratona 48), e as moedas e encontros medidos são divididos pela referência do
estágio 1. Perto de 1: a calibração vale. Longe: é achado — registre com o
número.

## 5. O registro de problemas — por evidência, e não por lembrança

Todo problema que aparecer (relatório, conversa, captura de tela de um amigo)
vira uma linha em `docs/DEFEITOS.md` (quebrado) ou `docs/LACUNAS.md` (faltando),
com o formato de sempre, e mais:

```text
EVIDÊNCIA   a linha do relatório, a captura, ou as palavras do amigo, com data
ALCANCE     quantos amigos isto atingiu (1, alguns, todos)
IMPEDE?     impede jogar / atrapalha / incomoda
```

**A prioridade é ALCANCE × IMPEDE**, nessa ordem, e é ela que ordena a fila no
`ROADMAP.md` depois do piloto. O que um só amigo disse uma vez fica registrado
e não sobe sozinho — é a regra "ideia solta não vira desvio de rota" do
`CLAUDE.md`, aplicada a quem joga.

## 6. O calendário

```text
DIA 0     servidor de pé, túnel conferido do celular, convite com o aviso da
          seção 1; o dono cria a própria conta primeiro
DIA 1–2   só olhar: o relatório diz se as contas nasceram e se voltaram
DIA 3     primeiro corte — o que IMPEDE jogar é corrigido já (um bloco, um
          commit, como sempre); o resto espera
DIA 7     D7 da primeira coorte; razão do IDLE com uma semana de dados
DIA 14    fim: relatório final, a lista priorizada, e a decisão do que vem
          depois (a ficha da ST-7.2 fecha com os números, não com a sensação)
```

## 7. O que continua proibido durante o piloto

- **Dinheiro real de qualquer forma** — DEC-02 segue com o dono, e o §25.1 vale.
- **Divulgar fora do grupo de amigos** — a DEC-01 da fase privada libera o
  piloto, não a publicação (§0.3.1; o `test/saida-v09.mjs` segue recusando a tag).
