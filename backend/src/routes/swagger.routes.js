const { Router } = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../config/swagger');

const router = Router();

router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'SalesFlow API Docs',
  customCss: '.swagger-ui .topbar { display: none }',
}));

router.get('/spec.json', (req, res) => {
  res.json(swaggerSpec);
});

module.exports = router;
