#!/usr/bin/env bash
# Creates deploy/clients/<slug>/ from the template with freshly generated
# secrets. Usage:
#   deploy/scripts/new-client.sh <slug> <app-domain> "<Tenant name>" <admin-email>
set -euo pipefail

SLUG="${1:?slug requerido (ej. acme)}"
DOMAIN="${2:?dominio requerido (ej. acme.salesflow.mx)}"
TENANT_NAME="${3:?nombre del tenant requerido}"
ADMIN_EMAIL="${4:?correo del administrador requerido}"

if [[ ! "$SLUG" =~ ^[a-z0-9][a-z0-9-]{1,30}$ ]]; then
  echo "slug inválido: usa minúsculas, dígitos y guiones" >&2; exit 1
fi

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TEMPLATE="$ROOT/deploy/client-template"
TARGET="$ROOT/deploy/clients/$SLUG"

if [[ -e "$TARGET/.env" ]]; then
  echo "Ya existe $TARGET/.env; no se sobrescribe." >&2; exit 1
fi

gen() { openssl rand -base64 48 | tr -d '/+=\n' | cut -c1-"$1"; }

mkdir -p "$TARGET"
cp "$TEMPLATE/docker-compose.yml" "$TARGET/docker-compose.yml"

sed \
  -e "s|^CLIENT_SLUG=.*|CLIENT_SLUG=$SLUG|" \
  -e "s|^APP_DOMAIN=.*|APP_DOMAIN=$DOMAIN|" \
  -e "s|^TENANT_NAME=.*|TENANT_NAME=$TENANT_NAME|" \
  -e "s|^TENANT_ADMIN_EMAIL=.*|TENANT_ADMIN_EMAIL=$ADMIN_EMAIL|" \
  -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(gen 32)|" \
  -e "s|^JWT_SECRET=.*|JWT_SECRET=$(gen 48)|" \
  -e "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$(gen 48)|" \
  -e "s|^SUPERADMIN_JWT_SECRET=.*|SUPERADMIN_JWT_SECRET=$(gen 48)|" \
  -e "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=$(gen 32)|" \
  -e "s|^TENANT_ADMIN_PASSWORD=.*|TENANT_ADMIN_PASSWORD=$(gen 16)|" \
  "$TEMPLATE/.env.example" > "$TARGET/.env"
chmod 600 "$TARGET/.env"

echo "Stack creado en deploy/clients/$SLUG"
echo
echo "Siguientes pasos:"
echo "  1. Revisa y completa deploy/clients/$SLUG/.env (APP_IMAGE, GEMINI_API_KEY, catálogo)."
echo "  2. Apunta el DNS de $DOMAIN al host del proxy."
echo "  3. deploy/scripts/deploy-client.sh $SLUG"
echo
echo "Credenciales iniciales del administrador (guárdalas; ENCRYPTION_KEY no se puede rotar sin recifrar):"
grep -E '^(TENANT_ADMIN_EMAIL|TENANT_ADMIN_PASSWORD)=' "$TARGET/.env"
