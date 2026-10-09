# Pôr o PokéArena no ar (Lightsail, AWS)

O piloto da ST-7.2 num endereço público com HTTPS, ABERTO a quem tem o link
(DEC-23, 01/10 — antes era por convite). O Caddy manda `noindex`: a arte ainda é
emprestada (CLAUDE.md, §0.3.1), e o jogo não deve aparecer em busca. Moeda
simulada; o `CHECKPOINT_25_1` segue `null`.

1. **Lightsail → Criar instância** · região `us-east-1` · Linux/Unix · **Ubuntu 24.04**
   · plano de **1 GB** (cerca de US$ 7/mês) · nome `pokearena`.
2. Na instância → **Rede** → **IPv4 Firewall** → **Adicionar regra**: **HTTPS (443)**.
   (Opcional: **Rede → Criar IP estático** e anexar — o endereço não muda se a
   instância reiniciar. Se anexar, faça ANTES do passo 3.)
3. **Conectar usando SSH** (o terminal no navegador) e rode:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/cardosomatheus1/Pokemon/claude/docs-planning-tests-6hjthq/deploy/lightsail/instalar.sh -o instalar.sh
   sudo bash instalar.sh https://<TOKEN-DE-LEITURA>@github.com/cardosomatheus1/Pokemon.git
   ```
   Repositório privado: o `curl` acima não baixa — copie o `instalar.sh` à mão
   (o botão de colar do terminal) e use um token do GitHub só de leitura do
   repositório. O script tira o token da configuração depois do clone.
4. No fim ele imprime o endereço `https://<ip>.sslip.io/`. É ele que vai para
   os amigos.

Atualizar o jogo depois: rodar o mesmo comando do passo 3 (o banco e o segredo
ficam).

**Atualizar sem SSH (como foi feito em 01/10, de fora da máquina):** snapshot da
instância → nova instância a partir do snapshot, com um user-data que baixa o
pacote novo (`git archive` sem `prototype/` e `tools/previas/`, num link
pré-assinado do S3) e roda `instalar.sh --pacote <url>` — o `dados/` vem no
disco do snapshot, então banco e contas atravessam → abrir 80 e 443 na nova →
mover o IP estático para ela → reiniciar (o Caddyfile sai do IP de agora) →
conferir → apagar a antiga. As escritas entre o snapshot e a troca se perdem:
faça em hora quieta. Logs: `journalctl -u pokearena -f`. Cópias do banco:
`/srv/pokearena/app/dados/copias/` (todo dia às 04:00).

**Desde 09/10, o user-data é o `atualizar.sh`** (só troca o código e reinicia),
e não o `instalar.sh --pacote`: este refaz `apt update` a cada vez, e os
espelhos do apt seguraram o script antes da troca do código duas vezes — a
máquina nova subia com o jogo velho, sem erro à vista. Confira SEMPRE que o
código novo está no ar antes de mover o IP (um arquivo novo do pacote
respondendo, ou o `build` do `/saude` mudando).

**Fora da máquina:** ligue o snapshot automático (instância → Snapshots →
Automatic snapshots). A cópia diária fica no MESMO disco; o snapshot é o que
sobrevive se a instância for apagada. No piloto de 01/10 ele está ligado às 07:00 UTC.
