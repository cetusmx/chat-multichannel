#!/usr/bin/env bash
# Dumps one client's database and uploads volume to deploy/backups/<slug>/.
# Usage: deploy/scripts/backup-client.sh <slug> [--keep 14]
set -euo pipefail

SLUG="${1:?slug requerido}"; shift || true
KEEP=14
[[ "${1:-}" == "--keep" ]] && KEEP="${2:-14}"

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DIR="$ROOT/deploy/clients/$SLUG"
[[ -f "$DIR/.env" ]] || { echo "No existe $DIR/.env" >&2; exit 1; }
# shellcheck disable=SC1091
set -a; source "$DIR/.env"; set +a

OUT="$ROOT/deploy/backups/$SLUG"
mkdir -p "$OUT"
STAMP="$(date +%Y%m%d-%H%M%S)"

docker exec "sf-$SLUG-db" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner | gzip > "$OUT/db-$STAMP.sql.gz"
docker run --rm -v "salesflow-${SLUG}_app_uploads:/data:ro" -v "$OUT:/out" alpine tar czf "/out/uploads-$STAMP.tar.gz" -C /data .

ls -t "$OUT"/db-*.sql.gz | tail -n +$((KEEP + 1)) | xargs -r rm -f
ls -t "$OUT"/uploads-*.tar.gz | tail -n +$((KEEP + 1)) | xargs -r rm -f

echo "Respaldo de $SLUG: $OUT/db-$STAMP.sql.gz, $OUT/uploads-$STAMP.tar.gz (conservando $KEEP)"
