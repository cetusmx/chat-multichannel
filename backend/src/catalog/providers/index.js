const BaseCatalogProvider = require('./base.provider');
const SealMarketProvider = require('./sealmarket.provider');
const GenericRestProvider = require('./generic-rest.provider');

/** Provider used when a tenant has no catalog: every capability is off. */
class NoneProvider extends BaseCatalogProvider {
  static get name() {
    return 'none';
  }

  get capabilities() {
    return { textSearch: false, attributeSearch: false, customerLookup: false, csfExtraction: false, stockByLocation: false, productImages: false };
  }

  async testConnection() {
    return { ok: true, message: 'Sin catálogo configurado' };
  }
}

const registry = new Map([
  [NoneProvider.name, NoneProvider],
  [SealMarketProvider.name, SealMarketProvider],
  [GenericRestProvider.name, GenericRestProvider],
]);

/** Allows a custom adapter (e.g. providers/acme.provider.js) to register itself at boot. */
function registerProvider(ProviderClass) {
  if (!ProviderClass?.name || typeof ProviderClass !== 'function') throw new Error('Proveedor de catálogo inválido');
  registry.set(ProviderClass.name, ProviderClass);
}

function getProviderClass(name) {
  const Cls = registry.get((name || 'none').toLowerCase());
  if (!Cls) {
    const err = new Error(`Proveedor de catálogo desconocido: ${name}`);
    err.status = 500;
    throw err;
  }
  return Cls;
}

function listProviders() {
  return [...registry.keys()];
}

module.exports = { registerProvider, getProviderClass, listProviders, NoneProvider, SealMarketProvider, GenericRestProvider };
