#!/bin/bash
# ATUALIZAR SÓ O CÓDIGO (09/10/2026) — o user-data de uma instância nova feita
# do snapshot de uma que já tem tudo instalado (node, caddy, serviço, segredo).
#
# Existe porque o `instalar.sh --pacote` refaz `apt update` a cada
# atualização, e em 09/10 os espelhos do apt seguraram o script ANTES da troca
# do código, duas vezes: a máquina nova subia com o jogo velho, sem erro à
# vista. Aqui não há apt: baixa o pacote, troca o código preservando dados/
# (banco e cópias) e reinicia o serviço. Para máquina NOVA, sem snapshot, o
# caminho continua sendo o `instalar.sh`.
#
# Uso: o conteúdo deste arquivo, com PACOTE='<url pré-assinada>' preenchida,
# vai como user-data no CreateInstancesFromSnapshot.
exec > /var/log/pokearena-atualizar.log 2>&1
set -u
PACOTE='__PACOTE__'
APP=/srv/pokearena/app
for i in 1 2 3 4 5 6 7 8; do
  curl -fsSL "$PACOTE" -o /tmp/pa.tgz && tar -tzf /tmp/pa.tgz >/dev/null && break
  sleep 15
done
tar -tzf /tmp/pa.tgz >/dev/null || exit 1   # pacote ruim: fica o código de antes, inteiro
find "$APP" -mindepth 1 -maxdepth 1 ! -name dados -exec rm -rf {} +
tar -xzf /tmp/pa.tgz -C "$APP" && rm -f /tmp/pa.tgz
mkdir -p "$APP/dados/copias"
chown -R pokearena:pokearena /srv/pokearena
systemctl restart pokearena
