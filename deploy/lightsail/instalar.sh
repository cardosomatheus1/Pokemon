#!/usr/bin/env bash
# PÕE O POKEARENA NO AR NUMA INSTÂNCIA LIGHTSAIL (Ubuntu 24.04) — o piloto da ST-7.2.
#
#   sudo bash instalar.sh <url-do-repositorio> [branch]
#
# Roda DENTRO da instância (o terminal SSH do navegador, no console do
# Lightsail). Idempotente: rodar de novo atualiza o código e reinicia, sem
# perder o banco, o segredo de sessão nem o convite.
#
# O QUE FICA DE PÉ
#   node 22        o servidor do jogo (`server/principal.mjs`), em 127.0.0.1:8080,
#                  AMBIENTE=producao, como serviço do systemd (volta sozinho)
#   caddy          o HTTPS de verdade (Let's Encrypt) em https://<ip>.sslip.io,
#                  sem precisar de domínio
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
REPO="${1:?uso: sudo bash instalar.sh <url-do-repositorio> [branch]}"
BRANCH="${2:-claude/docs-planning-tests-6hjthq}"
BASE=/srv/pokearena
APP=$BASE/app

apt-get update -y
apt-get install -y curl git ca-certificates gnupg openssl debian-keyring debian-archive-keyring apt-transport-https

# Node 22 (o banco é o node:sqlite, que pede 22.5+)
if ! command -v node >/dev/null || ! node -e "process.exit(+process.versions.node.split('.')[0] >= 22 ? 0 : 1)"; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
# Caddy
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y && apt-get install -y caddy
fi

id pokearena >/dev/null 2>&1 || useradd -r -m -d "$BASE" -s /usr/sbin/nologin pokearena
if [ -d "$APP/.git" ]; then
  git -C "$APP" fetch --depth 1 origin "$BRANCH" && git -C "$APP" reset --hard FETCH_HEAD
else
  git clone --depth 1 -b "$BRANCH" "$REPO" "$APP"
fi
# o token, se veio na URL, sai da configuração
git -C "$APP" remote set-url origin "$(echo "$REPO" | sed -E 's#https://[^@/]+@#https://#')"
mkdir -p "$APP/dados/copias"
chown -R pokearena:pokearena "$BASE"

# o segredo de sessão e o convite: gerados UMA vez e guardados só para root
if [ ! -f /etc/pokearena.env ]; then
  ( umask 077; cat > /etc/pokearena.env <<EOF
AMBIENTE=producao
SEGREDO_SESSAO=$(openssl rand -hex 32)
PORTA=8080
BANCO=$APP/dados/pokearena.db
EOF
  )
fi
[ -f /etc/pokearena.convite ] || ( umask 077; openssl rand -hex 12 > /etc/pokearena.convite )
CONVITE=$(cat /etc/pokearena.convite)

cat > /etc/systemd/system/pokearena.service <<EOF
[Unit]
Description=PokeArena (piloto)
After=network-online.target
[Service]
User=pokearena
WorkingDirectory=$APP
EnvironmentFile=/etc/pokearena.env
ExecStart=/usr/bin/node server/principal.mjs
Restart=always
RestartSec=3
[Install]
WantedBy=multi-user.target
EOF

IP=$(curl -fsS https://checkip.amazonaws.com | tr -d '\n')
HOST="${IP//./-}.sslip.io"
cat > /etc/caddy/Caddyfile <<EOF
$HOST {
	encode gzip
	@convite query k=$CONVITE
	handle @convite {
		header Set-Cookie "pa_convite=$CONVITE; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax"
		redir /app/index.html 302
	}
	@temconvite header Cookie *pa_convite=$CONVITE*
	handle @temconvite {
		reverse_proxy 127.0.0.1:8080
	}
	handle {
		respond "PokeArena - acesso por convite." 403
	}
}
EOF

# a cópia diária do banco (o banco ligado é um instante consistente — ST-7.1b)
cat > /etc/cron.d/pokearena-copia <<EOF
0 4 * * * pokearena cd $APP && /usr/bin/node tools/banco-copia.mjs copiar >> $BASE/copia.log 2>&1
EOF

systemctl daemon-reload
systemctl enable --now pokearena
systemctl restart pokearena
systemctl reload caddy 2>/dev/null || systemctl restart caddy

for i in $(seq 1 30); do curl -fsS -o /dev/null http://127.0.0.1:8080/saude && break; sleep 1; done
echo
echo "PRONTO. O link de convite (mande só para quem vai jogar):"
echo "  https://$HOST/?k=$CONVITE"
echo "O certificado HTTPS sai no primeiro acesso (alguns segundos)."
