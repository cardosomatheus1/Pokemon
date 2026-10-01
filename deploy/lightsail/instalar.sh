#!/usr/bin/env bash
# PÕE O POKEARENA NO AR NUMA INSTÂNCIA LIGHTSAIL (Ubuntu 24.04) — o piloto da ST-7.2.
#
#   sudo bash instalar.sh <url-do-repositorio> [branch]
#   sudo bash instalar.sh --pacote <url-de-um-.tgz>      (o código num pacote)
#
# `CONVITE=<chave>` no ambiente fixa a chave do convite na primeira instalação
# (o user-data de quem cria a instância de fora, e precisa saber o link).
#
# Roda DENTRO da instância (o terminal SSH do navegador, no console do
# Lightsail, ou o user-data da criação). Idempotente: rodar de novo atualiza o
# código e reinicia, sem perder o banco, o segredo de sessão nem o convite.
#
# O QUE FICA DE PÉ
#   node 22        o servidor do jogo (`server/principal.mjs`), em 127.0.0.1:8080,
#                  AMBIENTE=producao, como serviço do systemd (volta sozinho)
#   caddy          o HTTPS de verdade (Let's Encrypt) em https://<ip>.sslip.io,
#                  sem precisar de domínio — o endereço sai do IP de AGORA a
#                  cada boot (anexar um IP estático depois só pede um reboot)
#   o CONVITE      o build é PRIVADO (CLAUDE.md, §0.3.1: arte emprestada não se
#                  publica). Só entra quem abriu o link com a chave uma vez — ele
#                  deixa um cookie; quem chega sem ele lê "acesso por convite".
#                  Não é senha HTTP de propósito: o jogo usa o cabeçalho
#                  Authorization para a sessão da conta, e as duas brigariam.
#   a cópia diária do banco às 04:00 (`tools/banco-copia.mjs`), em dados/copias/
#
# Repositório privado: passe a URL com um token de LEITURA do GitHub
# (https://<token>@github.com/...). Depois do clone o token é tirado da
# configuração do git — ele não fica gravado na máquina.
set -euo pipefail
REPO="${1:?uso: sudo bash instalar.sh <url-do-repositorio> [branch] | --pacote <url>}"
BRANCH="${2:-claude/docs-planning-tests-6hjthq}"
PACOTE=""
if [ "$REPO" = "--pacote" ]; then PACOTE="${2:?a url do pacote}"; fi
BASE=/srv/pokearena
APP=$BASE/app
export DEBIAN_FRONTEND=noninteractive

# AS ETAPAS, para quem olha de fora: o user-data serve /var/lib/pokearena-diag
# na porta 80 até o Caddy entrar. Só o nome da etapa e a linha que falhou —
# nenhum segredo (o BASH_COMMAND sai com as variáveis por expandir).
DIAG=/var/lib/pokearena-diag
mkdir -p "$DIAG"
etapa() { echo "$(date -u +%H:%M:%S) $*" >> "$DIAG/estado.txt"; }
set -E
trap 'etapa "FALHOU na linha $LINENO: $BASH_COMMAND"' ERR

# O apt do PRIMEIRO BOOT: o unattended-upgrades segura o lock por minutos, e
# um apt-get que não espera derruba o script inteiro.
apt_() { for i in $(seq 1 20); do apt-get -o DPkg::Lock::Timeout=600 "$@" && return 0; sleep 15; done; return 1; }

etapa "apt: pacotes base"
apt_ update -y
apt_ install -y curl git ca-certificates gnupg openssl debian-keyring debian-archive-keyring apt-transport-https

# Node 22 (o banco é o node:sqlite, que pede 22.5+)
etapa "node 22"
if ! command -v node >/dev/null || ! node -e "process.exit(+process.versions.node.split('.')[0] >= 22 ? 0 : 1)"; then
  curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource.sh
  for i in 1 2 3; do bash /tmp/nodesource.sh && break; sleep 15; done
  apt_ install -y nodejs
fi
# Caddy
etapa "caddy"
# o servidor de etapas sai da porta 80 antes: o pacote do Caddy sobe nela
pkill -f "http.server 80" || true
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --batch --yes --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt_ update -y && apt_ install -y caddy
fi
etapa "o jogo"

id pokearena >/dev/null 2>&1 || useradd -r -m -d "$BASE" -s /usr/sbin/nologin pokearena
if [ -n "$PACOTE" ]; then
  # o pacote substitui o código e preserva dados/ (o banco e as cópias)
  curl -fsSL "$PACOTE" -o /tmp/pokearena.tgz
  mkdir -p "$APP"
  find "$APP" -mindepth 1 -maxdepth 1 ! -name dados -exec rm -rf {} +
  tar -xzf /tmp/pokearena.tgz -C "$APP"
  rm -f /tmp/pokearena.tgz
elif [ -d "$APP/.git" ]; then
  git -C "$APP" fetch --depth 1 origin "$BRANCH" && git -C "$APP" reset --hard FETCH_HEAD
else
  git clone --depth 1 -b "$BRANCH" "$REPO" "$APP"
fi
# o token, se veio na URL, sai da configuração
if [ -d "$APP/.git" ]; then git -C "$APP" remote set-url origin "$(echo "$REPO" | sed -E 's#https://[^@/]+@#https://#')"; fi
mkdir -p "$APP/dados/copias"
chown -R pokearena:pokearena "$BASE"

# o segredo de sessão e o convite: gerados UMA vez e guardados só para root
if [ ! -f /etc/pokearena.env ]; then
  umask 077
  {
    echo "AMBIENTE=producao"
    echo "SEGREDO_SESSAO=$(openssl rand -hex 32)"
    echo "PORTA=8080"
    echo "BANCO=$APP/dados/pokearena.db"
  } > /etc/pokearena.env
  umask 022
fi
if [ ! -f /etc/pokearena.convite ]; then
  umask 077; echo "${CONVITE:-$(openssl rand -hex 12)}" > /etc/pokearena.convite; umask 022
fi

{
  echo "[Unit]"
  echo "Description=PokeArena (piloto)"
  echo "After=network-online.target"
  echo "[Service]"
  echo "User=pokearena"
  echo "WorkingDirectory=$APP"
  echo "EnvironmentFile=/etc/pokearena.env"
  echo "ExecStart=/usr/bin/node server/principal.mjs"
  echo "Restart=always"
  echo "RestartSec=3"
  echo "[Install]"
  echo "WantedBy=multi-user.target"
} > /etc/systemd/system/pokearena.service

# O gerador do Caddyfile: lê o IP de agora e a chave do convite.
install -m 700 "$APP/deploy/lightsail/caddyfile.sh" /usr/local/bin/pokearena-caddyfile
{
  echo "[Unit]"
  echo "Description=PokeArena: o Caddyfile do IP de agora"
  echo "After=network-online.target"
  echo "Wants=network-online.target"
  echo "Before=caddy.service"
  echo "[Service]"
  echo "Type=oneshot"
  echo "ExecStart=/usr/local/bin/pokearena-caddyfile"
  echo "[Install]"
  echo "WantedBy=multi-user.target"
} > /etc/systemd/system/pokearena-endereco.service
/usr/local/bin/pokearena-caddyfile

# a cópia diária do banco (o banco ligado é um instante consistente — ST-7.1b)
echo "0 4 * * * pokearena cd $APP && /usr/bin/node tools/banco-copia.mjs copiar >> $BASE/copia.log 2>&1" > /etc/cron.d/pokearena-copia

systemctl daemon-reload
systemctl enable pokearena-endereco
systemctl enable pokearena
systemctl restart pokearena
systemctl restart caddy

for i in $(seq 1 60); do curl -fsS -o /dev/null http://127.0.0.1:8080/saude && break; sleep 1; done
etapa "PRONTO"
echo
echo "PRONTO. O link de convite (mande só para quem vai jogar):"
echo "  $(cat /etc/pokearena.link)"
echo "O certificado HTTPS sai no primeiro acesso (alguns segundos)."
