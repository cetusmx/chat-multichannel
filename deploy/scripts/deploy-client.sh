#!/usr/bin/env bash
# Pulls the configured image and (re)starts one client stack.
# Usage: deploy/scripts/deploy-client.sh <slug> [--superadmin] [--image <ref>]
set -euo pipefail

SLUG="${1:?slug requerido}"; shift || true
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DIR="$ROOT/deploy/clients/$SLUG"
[[ -f "$DIR/.env" ]] || { echo "No existe $DIR/.env" >&2; exit 1; }

PROFILE=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --superadmin) PROFILE=(--profile superadmin); shift ;;
    --image) sed -i.bak "s|^APP_IMAGE=.*|APP_IMAGE=$2|" "$DIR/.env" && rm -f "$DIR/.env.bak"; shift 2 ;;
    *) echo "opción desconocida: $1" >&2; exit 1 ;;
  esac
done

docker network inspect edge >/dev/null 2>&1 || docker network create edge

cd "$DIR"
docker compose "${PROFILE[@]}" pull
docker compose "${PROFILE[@]}" up -d --remove-orphans
echo
docker compose ps
echo
echo "Bootstrap:"
docker compose logs --no-log-prefix app 2>/dev/null | grep -E '\[BOOTSTRAP\]' | tail -n 5 || true
