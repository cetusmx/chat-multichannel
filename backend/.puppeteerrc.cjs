const {join} = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Cambia la ubicación de la caché de Puppeteer al directorio actual
  // Esto soluciona problemas en Docker / CI donde la caché global de ~/.cache/puppeteer se pierde
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
