# Pôr o PokéArena no ar (Lightsail, AWS)

O piloto da ST-7.2 num endereço público com HTTPS, PRIVADO por convite (a arte
é emprestada — CLAUDE.md, §0.3.1). Moeda simulada; o `CHECKPOINT_25_1` segue `null`.

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
4. No fim ele imprime o **link de convite** `https://<ip>.sslip.io/?k=…`. É ele
   que vai para os amigos; quem chegar sem ele lê "acesso por convite".

Atualizar o jogo depois: rodar o mesmo comando do passo 3 (o banco, o segredo
e o convite ficam). Logs: `journalctl -u pokearena -f`. Cópias do banco:
`/srv/pokearena/app/dados/copias/` (todo dia às 04:00).
