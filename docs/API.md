# Contrato da API — v1

**Publicado pelo bloco F1.1.** Este documento é o contrato; `server/contrato.mjs`
é a sua tradução em código. Divergência entre os dois é defeito, e a Spec vence.

---

## A regra que governa tudo: a versão é obrigatória

Toda requisição a `/api/*` **precisa** declarar a versão do contrato:

```
x-api-versao: 1
```

Sem o cabeçalho → `400 versao_ausente`.
Com versão que o servidor não fala → `400 versao_incompativel`, e a resposta diz
qual ele fala.

**Não é burocracia.** No dia em que o servidor mudar a forma de um ticket e um
cliente antigo continuar aberto numa aba, a diferença tem que aparecer no
handshake — não no meio de uma aposta, com o campo novo chegando `undefined`.

### A única exceção, e ela é declarada

`GET /saude` não exige versão. Ele existe para o balanceador, que não conhece o
contrato; um health check que exigisse versão derrubaria a instância inteira do
pool a cada mudança de contrato.

---

## Erros

O corpo de erro tem **código** e **mensagem**. O código é do contrato; a
mensagem é para humano e **pode mudar sem aviso**. Cliente que decide por
mensagem quebra na primeira revisão de texto.

```json
{ "codigo": "entrada_invalida", "erro": "raiz precisa ser um inteiro sem sinal" }
```

| código | quando |
|---|---|
| `versao_ausente` | falta o cabeçalho `x-api-versao` |
| `versao_incompativel` | versão que este servidor não fala |
| `entrada_invalida` | parâmetro fora da forma aceita |
| `nao_encontrado` | caminho desconhecido |
| `interno` | falha do servidor |

**Nenhuma resposta de erro carrega stack trace, mensagem de exceção, ou eco do
que o cliente mandou.** O 404 não repete o caminho pedido: quem pediu já sabe o
que pediu, e eco de entrada do usuário é o começo de metade dos problemas de
injeção.

---

## Rotas

### `GET /saude`

Sem versão. Para o balanceador e para descobrir instância velha no pool.

```json
{ "ok": true, "versaoMotor": "0.9.0-F0.7", "versaoApi": "1", "ambiente": "producao" }
```

`versaoMotor` é o que importa aqui: é por ela que se percebe uma instância
atrasada **antes** de ela servir uma odd para alguém.

### `GET /api/rodada/digital?raiz=<n>`

A impressão digital da rodada inteira — a mesma função que o portão Q3 usa para
comparar Node e Chromium. Existe para **provar paridade**: quem quiser conferir
que o servidor e o cliente rodam o mesmo motor compara esta string.

```json
{ "raiz": 42, "digital": "…", "versaoMotor": "0.9.0-F0.7" }
```

### `GET /api/rodada/preco?raiz=<n>[&sims=<n>]`

O elenco e as odds da rodada, pelo mesmo Monte Carlo do cliente.

```json
{
  "raiz": 777, "versaoMotor": "0.9.0-F0.7",
  "sims": 154000, "margemEfetiva": 0.08, "erroPior": 0.019,
  "lutadores": [
    { "idx": 3, "nome": "Magneton", "dex": 82,
      "prob": 0.175, "erroRelativo": 0.006, "odd": 5.26 }
  ]
}
```

`sims` é aceito **para o teste poder pedir um lote curto**, e tem teto (100 a
200.000). Sem teto, `?sims=1e9` é uma negação de serviço de um caractere.

---

## `raiz`: a forma é estrita, e o motivo é caro

Só dígitos, de 1 a 10 deles, valor entre 0 e 2³²−1.

**Rejeitados de propósito:** `1e3`, `0x10`, ` 5`, `5 `, `+5`, `-1`, `5.0`,
`Infinity`, vazio.

`Number()` engole todos calado — `Number('1e3')` é 1000. Cada um deles seria
**uma rodada diferente da que o cliente pediu**: mesma URL, elenco diferente,
odds diferentes, e nenhum erro em lugar nenhum.

---

## Segurança da superfície

Em **toda** resposta, inclusive nas de erro:

```
x-content-type-options: nosniff
x-frame-options: DENY
referrer-policy: no-referrer
content-security-policy: default-src 'none'; frame-ancestors 'none'
cache-control: no-store
```

Aplicados no ponto de saída e não por rota — cabeçalho de segurança que depende
de alguém lembrar de pô-lo é cabeçalho que falta na rota nova.

**CORS é por lista, nunca por eco.** Devolver a origem que veio no pedido é `*`
escrito de outro jeito: qualquer página aberta no navegador do jogador passa na
conferência, e com sessão por cookie isso entrega a conta dele. A lista vem de
`ORIGENS_PERMITIDAS` e é **vazia por padrão** — o cliente do mesmo domínio não
precisa de CORS nenhum.

**Corpo tem teto de 64 KB.** Sem teto, uma requisição sem `content-length` e sem
fim consome a memória do processo — e o processo é o mesmo que serve todo mundo.

---

## Configuração

| variável | padrão | nota |
|---|---|---|
| `AMBIENTE` | `desenvolvimento` | `producao`, `homologacao`, `desenvolvimento`, `teste` |
| `SEGREDO_SESSAO` | — | **obrigatório em produção**, mínimo 32 caracteres |
| `ORIGENS_PERMITIDAS` | vazio | lista separada por vírgula |
| `BANCO` | `dados/pokearena.db` | `:memory:` em teste |
| `PORTA` | `8080` | |

**Em produção, segredo ausente é erro de partida** — não um padrão silencioso.
Segredo padrão em produção é como quase toda sessão forjável começa: não porque
alguém o escolheu, mas porque ninguém notou que ele veio de graça.

Em desenvolvimento existe padrão, porque exigir configuração para rodar o
projeto local é atrito que ninguém paga por muito tempo. Mas ele é **sorteado a
cada processo** e **avisado em voz alta**. Segredo fixo em repositório é segredo
publicado, e a distância entre "é só de desenvolvimento" e produção é uma
variável de ambiente que alguém esquece.

---

# Rotas do servidor completo (F1.2 a F1.7)

> As rotas abaixo existem no **domínio** — `server/auth.mjs`, `server/aposta.mjs`,
> `server/scheduler.mjs`. A camada HTTP que as expõe é escopo do bloco que
> conectar o cliente ao servidor; até lá elas são chamadas direto pelos testes,
> que é como o ciclo econômico foi provado ponta a ponta.

## Autenticação (F1.3)

**A barreira de idade é declaratória e tem duas regras que a sustentam:**

1. **A data de nascimento é imutável.** Gatilho no banco, não `CHECK` — `CHECK`
   não enxerga o valor antigo. Sem isso, quem foi bloqueado edita o campo.
2. **A conta bloqueada é CONGELADA, não apagada.** Apagar parece mais limpo e é
   exatamente o contorno: e-mail livre, cadastro de novo, idade nova. **Apagar É
   o contorno**, e o §28.2 manda fechá-lo.

**Erro de login não distingue e-mail inexistente de senha errada** — nem na
mensagem, nem no **tempo**. O hash é calculado mesmo quando o e-mail não existe,
contra um hash fantasma: sem isso a resposta volta em microssegundos num caso e
em dezenas de milissegundos no outro, e a tela de login vira uma consulta de
"esse e-mail tem conta aqui?".

Senha em **scrypt**, com os parâmetros gravados no próprio hash — subir o custo
amanhã não pode invalidar a senha de ontem. Sessão em HMAC-SHA256 com prazo
**dentro do corpo assinado**. Token de recuperação de **uso único e com prazo**,
guardado como hash.

## A rodada (F1.5)

O servidor é dono do relógio. **O cliente não tem rota para pedir a próxima
rodada**, e semente vinda no pedido é ignorada — não recusada com erro, o que
esconderia a tentativa; ignorada, e o teste prova que foi.

| fase | duração | o que acontece |
|---|---|---|
| `aberta` | 30 s | preço gravado, commit publicado, apostas aceitas |
| `travada` | 3 s | **semente revelada**, apostas travadas |
| `emLuta` | 45 s | batalha simulada de uma vez; o cliente ANIMA o que já aconteceu |
| `encerrada` | — | campeão gravado, settlement liberado |

**O payload público é montado por lista branca**, campo a campo. Serializar a
rodada e "tirar o que não pode" é como o campo novo vaza — ele nasce incluído e
ninguém lembra de excluí-lo.

`revelado` e `eventosDaLuta` **só existem depois do fechamento**, e a condição é
o **status**, não o relógio: relógio adiantado no cliente não abre nada.

## Realtime (F1.6) — SSE

`text/event-stream`. **O primeiro evento de toda conexão é o estado COMPLETO**,
não um delta: quem chega no segundo 22 pula para o agora, e reconectar é receber
o estado de novo.

`Last-Event-ID` retoma de onde parou, se o que faltou ainda estiver no histórico
curto (64 eventos). De mais longe, o estado completo — que é mais barato **e**
mais correto.

**Evento dirigido a um usuário não entra no histórico da sala.** Sem isso o
vazamento entra pela porta da retomada.

## Aposta (F1.7)

- **A odd nunca vem do cliente.** Sai de `round_fighters`, gravada na abertura.
  A função `apostar` **não tem parâmetro `odd`** — aceitá-lo "e ignorá-lo"
  funcionaria hoje e seria usado amanhã por quem o visse na assinatura.
- **Uma posição por usuário por rodada**, `UNIQUE` no esquema. Trocar é `UPDATE`.
- **Nada depois do lock**, nem 1 ms. A fase vem do scheduler, não de comparar
  relógios.
- **O teto de payout do §4.4.6 é aplicado no servidor.** Ele existia desde o F0.8
  — no cliente. E o cliente é do jogador.
- **Settlement idempotente em dois níveis**: o filtro de status e a chave da
  carteira. O segundo não depende de uma coluna estar certa, e é ele que sustenta
  a invariante *payout ocorre uma única vez* do §4.6.

## Carteira (F1.4)

Ledger **append-only** por gatilho, não por convenção. Saldo e lançamento mudam
na **mesma transação**: um ledger que registra o que o saldo não refletiu parece
uma prova e é uma contradição.

**O payout herda a origem da stake** (§5.5): bônus paga bônus. É o que impede a
Arena de virar conversor de bônus gratuito em saldo transferível. Stake mista
paga proporcional, cada parcela ao seu bucket.

Ordem de consumo: **bônus → competitivo → transferível**. Gasta-se primeiro o que
o jogador não pôs dinheiro para ter.
