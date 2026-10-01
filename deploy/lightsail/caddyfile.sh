#!/usr/bin/env bash
# O CADDYFILE DO IP DE AGORA (instalado como /usr/local/bin/pokearena-caddyfile).
#
# Roda a cada boot, antes do Caddy: o endereço é <ip-com-traços>.sslip.io, e o
# IP pode mudar (um IP estático anexado depois, um stop/start). Quem entra é
# quem tem o cookie do convite; o link do convite grava o cookie e manda para
# o jogo. O resto lê "acesso por convite".
set -euo pipefail
CONVITE=$(cat /etc/pokearena.convite)
IP=""
for i in $(seq 1 30); do IP=$(curl -fsS https://checkip.amazonaws.com | tr -d '\n') && [ -n "$IP" ] && break; sleep 2; done
HOST="${IP//./-}.sslip.io"
{
  echo "$HOST {"
  echo "	encode gzip"
  echo "	@convite query k=$CONVITE"
  echo "	handle @convite {"
  echo "		header Set-Cookie \"pa_convite=$CONVITE; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax\""
  echo "		redir /app/index.html 302"
  echo "	}"
  echo "	@temconvite header Cookie *pa_convite=$CONVITE*"
  echo "	handle @temconvite {"
  echo "		reverse_proxy 127.0.0.1:8080"
  echo "	}"
  echo "	handle {"
  echo "		respond \"PokeArena - acesso por convite.\" 403"
  echo "	}"
  echo "}"
} > /etc/caddy/Caddyfile
echo "https://$HOST/?k=$CONVITE" > /etc/pokearena.link
