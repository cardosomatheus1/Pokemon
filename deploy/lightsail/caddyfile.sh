#!/usr/bin/env bash
# O CADDYFILE DO IP DE AGORA (instalado como /usr/local/bin/pokearena-caddyfile).
#
# Roda a cada boot, antes do Caddy: o endereço é <ip-com-traços>.sslip.io, e o
# IP pode mudar (um IP estático anexado depois, um stop/start).
#
# ABERTO, SEM CONVITE (DEC-23, decisão do dono em 01/10: "não quero invite,
# qualquer um pode acessar o link"). O que fica é o `noindex`: o link funciona
# para quem o recebe, e o jogo não aparece em busca — a arte ainda é emprestada
# (§0.3.1), e ser achado por quem não recebeu o link é outra coisa.
#
# O convite antigo (`/?k=…`) continua caindo no jogo: a raiz manda para ele, e
# a chave na query é ignorada.
set -euo pipefail
IP=""
for i in $(seq 1 30); do IP=$(curl -fsS https://checkip.amazonaws.com | tr -d '\n') && [ -n "$IP" ] && break; sleep 2; done
HOST="${IP//./-}.sslip.io"
{
  echo "$HOST {"
  echo "	encode gzip"
  echo "	header X-Robots-Tag \"noindex, nofollow\""
  echo "	redir / /app/index.html 302"
  echo "	reverse_proxy 127.0.0.1:8080"
  echo "}"
} > /etc/caddy/Caddyfile
echo "https://$HOST/" > /etc/pokearena.link
