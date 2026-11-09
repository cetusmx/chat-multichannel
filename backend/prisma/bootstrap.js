/**
 * Production bootstrap. Runs on every container start (see docker-compose)
 * and is strictly idempotent:
 *
 *  - Superadmin: created from SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD only when
 *    no superadmin with that email exists. Passwords are NEVER reset unless
 *    SUPERADMIN_RESET_PASSWORD=true is set for a single run.
 *  - Tenant (single-tenant stacks): created from TENANT_* variables only when
 *    no tenant with TENANT_DOMAIN exists. Optional TENANT_CATALOG_CONFIG_JSON
 *    seeds the catalog integration.
 *  - Demo data lives in seed.js and is only for development/CI (SEED_DEMO=true).
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const log = (...a) => console.log('[BOOTSTRAP]', ...a);
const warn = (...a) => console.warn('[BOOTSTRAP]', ...a);

async function ensureSuperadmin() {
  const email = (process.env.SUPERADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD;
  const existingCount = await prisma.superadmin.count();

  if (!email || !password) {
    if (existingCount === 0) warn('No hay superadmin y SUPERADMIN_EMAIL/SUPERADMIN_PASSWORD no están definidos. El portal superadmin no tendrá acceso.');
    return;
  }
  if (password.length < 12) warn('SUPERADMIN_PASSWORD tiene menos de 12 caracteres.');

  const existing = await prisma.superadmin.findUnique({ where: { email } });
  if (!existing) {
    await prisma.superadmin.create({
      data: { email, name: process.env.SUPERADMIN_NAME || 'Superadmin', passwordHash: await bcrypt.hash(password, 10) },
    });
    log(`Superadmin creado: ${email}`);
    return;
  }
  if (process.env.SUPERADMIN_RESET_PASSWORD === 'true') {
    await prisma.superadmin.update({ where: { email }, data: { passwordHash: await bcrypt.hash(password, 10) } });
    warn(`Contraseña de superadmin ${email} restablecida por SUPERADMIN_RESET_PASSWORD=true. Quita la variable después de este arranque.`);
  }
}

async function ensureTenant() {
  const name = process.env.TENANT_NAME;
  const domain = (process.env.TENANT_DOMAIN || '').trim().toLowerCase();
  const adminEmail = (process.env.TENANT_ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPassword = process.env.TENANT_ADMIN_PASSWORD;
  if (!name || !domain || !adminEmail || !adminPassword) return;

  const existing = await prisma.tenant.findUnique({ where: { domain } });
  if (existing) {
    log(`Tenant "${domain}" ya existe; sin cambios.`);
    return;
  }
  const emailTaken = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (emailTaken) {
    warn(`El correo ${adminEmail} ya pertenece a un usuario; no se crea el tenant "${domain}".`);
    return;
  }

  let catalogConfig;
  if (process.env.TENANT_CATALOG_CONFIG_JSON) {
    try {
      catalogConfig = JSON.parse(process.env.TENANT_CATALOG_CONFIG_JSON);
    } catch (e) {
      warn(`TENANT_CATALOG_CONFIG_JSON inválido (${e.message}); el tenant se crea sin catálogo.`);
    }
  }

  const { createTenantWithAdmin } = require('../src/services/superadmin.tenant.service');
  const result = await createTenantWithAdmin({
    name,
    domain,
    adminName: process.env.TENANT_ADMIN_NAME || 'Administrador',
    adminEmail,
    password: adminPassword,
    catalogConfig,
  });
  log(`Tenant creado: ${result.tenant.name} (${domain}) · admin ${adminEmail}${result.catalogConfig ? ` · catálogo ${result.catalogConfig.provider}` : ''}`);

  const extras = {};
  if (process.env.TENANT_PHONE) extras.phone = process.env.TENANT_PHONE;
  if (process.env.TENANT_EMAIL) extras.email = process.env.TENANT_EMAIL;
  if (process.env.TENANT_MAX_USERS) extras.maxUsers = parseInt(process.env.TENANT_MAX_USERS, 10);
  if (process.env.TENANT_MAX_AI_TOKENS) extras.maxAiTokens = parseInt(process.env.TENANT_MAX_AI_TOKENS, 10);
  if (Object.keys(extras).length) await prisma.tenant.update({ where: { id: result.tenant.id }, data: extras });
}

async function main() {
  await ensureSuperadmin();
  await ensureTenant();
  if (process.env.SEED_DEMO === 'true') {
    log('SEED_DEMO=true: ejecutando datos de demostración (solo desarrollo).');
    await prisma.$disconnect();
    require('./seed.js');
    return;
  }
  const tenants = await prisma.tenant.count();
  log(`Listo. Tenants: ${tenants}.`);
}

main()
  .catch((e) => {
    console.error('[BOOTSTRAP] Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect().catch(() => {}));
