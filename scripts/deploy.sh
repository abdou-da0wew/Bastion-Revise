#!/bin/sh
# One-shot host deploy: /opt/celecdn layout + compose up (self-healing).
set -eu
sudo mkdir -p /opt/celecdn/public /opt/celecdn/packages /opt/celecdn/data /opt/celecdn/logs
sudo chown -R "$(id -u)":"$(id -g)" /opt/celecdn
[ -f .env ] || { cp .env.example .env; echo "Created .env — set CDN_ADMIN_TOKEN and TUNNEL_TOKEN, then re-run."; exit 1; }
docker compose up -d --build
docker compose ps
echo "Local:  http://127.0.0.1:3005/health"
echo "Tunnel: docker compose --profile tunnel up -d   →  https://cdn.celestialb.cv"
