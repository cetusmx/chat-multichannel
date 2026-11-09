const express = require('express');
const superadminTenantController = require('../controllers/superadmin.tenant.controller');
const superadminAuth = require('../middleware/superadmin.auth.middleware');

const router = express.Router();

router.use(superadminAuth);

router.get('/', superadminTenantController.getTenants);

/**
 * @swagger
 * /superadmin/tenants:
 *   post:
 *     summary: Crea un tenant con su usuario administrador
 *     tags: [Superadmin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, slug, firstName, lastName, email, password]
 *             properties:
 *               name: { type: string }
 *               slug: { type: string }
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string }
 *               catalogConfig:
 *                 type: object
 *                 nullable: true
 *                 description: >
 *                   Configuración inicial opcional del catálogo de productos. Misma forma que
 *                   PUT /superadmin/tenants/{id}/catalog-config (provider, isActive, baseUrl,
 *                   apiKey, connection, searchSchema, pricing, features, aiRules).
 *                   Si se omite, el tenant se crea sin catálogo.
 *     responses:
 *       201: { description: Tenant, usuario admin y (si aplica) catalogConfig creados }
 *       400: { description: Datos inválidos (incluye proveedor o searchSchema de catálogo inválidos) }
 *       409: { description: Dominio o email ya existen }
 */
router.post('/', superadminTenantController.createTenant);
router.get('/:id', superadminTenantController.getTenantById);
router.patch('/:id/status', superadminTenantController.updateTenantStatus);
router.put('/:id/licenses', superadminTenantController.updateTenantLicenses);
router.post('/:id/reset-admin-password', superadminTenantController.resetTenantAdminPassword);

/**
 * @swagger
 * /superadmin/tenants/{id}/catalog-config:
 *   get:
 *     summary: Configuración del catálogo de un tenant (sin credenciales) y proveedores disponibles
 *     tags: [Superadmin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: "{ data: CatalogConfig | null, providers: string[] }" }
 *       404: { description: Tenant no encontrado }
 *   put:
 *     summary: Crea o actualiza la configuración del catálogo de un tenant
 *     tags: [Superadmin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: "{ data: CatalogConfig }" }
 *       400: { description: Proveedor o searchSchema inválidos }
 *       404: { description: Tenant no encontrado }
 */
router.get('/:id/catalog-config', superadminTenantController.getTenantCatalogConfig);
router.put('/:id/catalog-config', superadminTenantController.updateTenantCatalogConfig);

/**
 * @swagger
 * /superadmin/tenants/{id}/catalog-config/test:
 *   post:
 *     summary: Prueba la conexión del catálogo guardado del tenant
 *     tags: [Superadmin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: "{ data: { ok: true, message } }" }
 *       502: { description: "{ data: { ok: false, message } }" }
 *       404: { description: Tenant no encontrado }
 */
router.post('/:id/catalog-config/test', superadminTenantController.testTenantCatalogConnection);

module.exports = router;
