#!/usr/bin/env bash
# Rolls out an image to every client stack, one at a time, stopping on the
# first failure so a bad build never reaches all clients.
# Usage: deploy/scripts/deploy-all.sh [--image <ref>]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ARGS=("$@")

shopt -s nullglob
STACKS=("$ROOT"/deploy/clients/*/.env)
[[ ${#STACKS[@]} -gt 0 ]] || { echo "No hay stacks en deploy/clients/"; exit 0; }

for env in "${STACKS[@]}"; do
  slug="$(basename "$(dirname "$env")")"
  echo "=== $slug ==="
  "$ROOT/deploy/scripts/deploy-client.sh" "$slug" "${ARGS[@]}"
  # Give the app a moment and verify it answers before moving on.
  for i in $(seq 1 12); do
    if docker exec "sf-$slug-app" wget -qO- http://localhost:4000/api/health >/dev/null 2>&1; then
      echo "$slug: saludable"; break
    fi
    [[ $i -eq 12 ]] && { echo "$slug: la app no respondió al health check" >&2; exit 1; }
    sleep 5
  done
done

docker image prune -f >/dev/null
echo "Despliegue completo."
