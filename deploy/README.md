# Despliegue por cliente

Cada cliente corre en su propio stack Docker (base de datos, dominio y secretos
propios) a partir de **la misma imagen** que publica CI. El código sigue siendo
multi-tenant; cada stack simplemente tiene un solo tenant, creado en el primer
arranque por `backend/prisma/bootstrap.js`.

```
deploy/
├── proxy/             Traefik compartido: TLS automático y enrutado por dominio
├── client-template/   docker-compose.yml + .env.example que se copian por cliente
├── clients/<slug>/    un directorio por cliente (su .env NO se versiona)
├── backups/<slug>/    respaldos locales (no versionados)
└── scripts/           new-client, deploy-client, deploy-all, backup-client
```

## Preparar el host (una vez)

```bash
docker network create edge
cd deploy/proxy && cp .env.example .env && $EDITOR .env   # ACME_EMAIL
docker compose up -d
```

Recursos aproximados por stack en reposo: app ≈ 300–500 MB, Postgres+pgvector ≈ 150–300 MB.
Un host de 8 GB aloja cómodamente 8–10 clientes.

## Alta de un cliente

```bash
deploy/scripts/new-client.sh acme acme.salesflow.mx "ACME Refacciones" admin@acme.mx
```

El script copia la plantilla a `deploy/clients/acme/`, genera secretos únicos
(`POSTGRES_PASSWORD`, `JWT_*`, `ENCRYPTION_KEY`, contraseña del admin) e imprime
las credenciales iniciales. Después:

1. Edita `deploy/clients/acme/.env`:
   - `APP_IMAGE`: fija una etiqueta (`ghcr.io/<owner>/salesflow-app:<sha|vX.Y.Z>`).
   - `GEMINI_API_KEY` si quieres clave global; si no, el admin del tenant la configura en la app.
   - `TENANT_CATALOG_CONFIG_JSON` para dejar el catálogo listo desde el primer arranque
     (misma forma que *Configuración → Catálogo*; también puede hacerse después desde la UI).
2. DNS: `acme.salesflow.mx` → IP del host.
3. `deploy/scripts/deploy-client.sh acme`

El bootstrap crea el tenant, su administrador y (si se indicó) el catálogo. Es
idempotente: en reinicios posteriores no modifica nada.

### Webhook de WhatsApp

La URL por cliente es `https://<APP_DOMAIN>/api/whatsapp/webhook/<tenantId>`.
El `tenantId` aparece en *Configuración → WhatsApp* dentro de la app del cliente.

### Portal superadmin por cliente (opcional)

Define `SUPERADMIN_EMAIL`/`SUPERADMIN_PASSWORD` en el `.env` y despliega con
`deploy/scripts/deploy-client.sh acme --superadmin`. Se publica en
`admin.<APP_DOMAIN>` (o `SUPERADMIN_DOMAIN`). La imagen del portal debe
compilarse con `VITE_API_URL=https://<APP_DOMAIN>` (variable `SUPERADMIN_API_URL`
del workflow) o usarse un dominio de API común.

## Actualizar

```bash
# Un cliente, a una versión concreta
deploy/scripts/deploy-client.sh acme --image ghcr.io/<owner>/salesflow-app:abc1234

# Todos, en orden, deteniéndose si alguno no pasa el health check
deploy/scripts/deploy-all.sh --image ghcr.io/<owner>/salesflow-app:abc1234
```

El esquema de base de datos se aplica en el arranque (`prisma db push`), igual
que en el despliegue compartido actual.

## Respaldos

```bash
deploy/scripts/backup-client.sh acme --keep 14     # dump SQL + volumen de uploads
```

Programa un cron por cliente o un bucle sobre `deploy/clients/*`.

## Migrar un tenant del stack compartido a uno propio

Todas las tablas llevan `tenant_id`, así que la exportación es por filas:

1. `new-client.sh` para el cliente **sin** variables `TENANT_*` (evita crear un tenant vacío).
2. En el stack compartido, exporta las filas del tenant (tenants, users, branches, groups,
   clients, conversations, messages, attachments, documents, document_chunks, *_configs,
   canned_responses, ai_rules) con `pg_dump --data-only` filtrado o un script SQL `COPY ... WHERE tenant_id = ...`.
3. Importa en el stack nuevo, copia la carpeta `uploads/<tenantId>` al volumen `app_uploads`
   y actualiza el webhook de WhatsApp al nuevo dominio.
4. Los secretos cifrados (`ai_configs.api_key`, `catalog_configs.api_key`) dependen de
   `ENCRYPTION_KEY`: usa la misma clave del stack origen o vuelve a capturarlos en la UI.

## Variables sensibles

`deploy/clients/*/.env` y `deploy/backups/` están en `.gitignore`. Guarda las
credenciales iniciales en el gestor de secretos del equipo; `ENCRYPTION_KEY` no
puede rotarse sin recifrar las claves guardadas.
