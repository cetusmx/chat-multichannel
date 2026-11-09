import { create } from 'zustand';
import { getCatalogSchema, getCatalogOptions } from '../services/api';

const EMPTY_SCHEMA = { textSearch: { enabled: false, param: 'q', label: 'Buscar', placeholder: '' }, attributes: [], display: { title: '{{name}}', subtitle: '{{sku}}', badges: [] } };

/**
 * Tenant catalog description (schema, capabilities, pricing) shared by the
 * cart modal and any search form. Loaded once per session; remote select
 * options are fetched lazily and cached per attribute.
 * Mirrors frontend/src/stores/useCatalogStore.js but uses the mobile api client.
 */
const useCatalogStore = create((set, get) => ({
  status: 'idle', // idle | loading | ready | error
  error: null,
  provider: 'none',
  isConfigured: false,
  schema: EMPTY_SCHEMA,
  capabilities: {},
  pricing: { taxRate: 0.16, pricesIncludeTax: false, currency: 'MXN' },
  requiredAttributes: [],
  options: {}, // attributeKey -> [{ value, label }]
  optionsLoading: {},

  async load({ force = false } = {}) {
    const { status } = get();
    if (!force && (status === 'ready' || status === 'loading')) return get();
    set({ status: 'loading', error: null });
    try {
      const d = await getCatalogSchema();
      const staticOptions = {};
      for (const a of d.schema?.attributes || []) if (a.options) staticOptions[a.key] = a.options;
      set({
        status: 'ready',
        provider: d.provider,
        isConfigured: !!d.isConfigured,
        schema: d.schema || EMPTY_SCHEMA,
        capabilities: d.capabilities || {},
        pricing: d.pricing || get().pricing,
        requiredAttributes: d.requiredAttributes || [],
        options: { ...staticOptions },
      });
    } catch (e) {
      set({ status: 'error', error: e.message, isConfigured: false, schema: EMPTY_SCHEMA, capabilities: {} });
    }
    return get();
  },

  async loadOptions(attributeKey) {
    const { options, optionsLoading } = get();
    if (options[attributeKey] || optionsLoading[attributeKey]) return options[attributeKey] || [];
    set((s) => ({ optionsLoading: { ...s.optionsLoading, [attributeKey]: true } }));
    try {
      const list = await getCatalogOptions(attributeKey);
      set((s) => ({ options: { ...s.options, [attributeKey]: list } }));
      return list;
    } catch {
      set((s) => ({ options: { ...s.options, [attributeKey]: [] } }));
      return [];
    } finally {
      set((s) => ({ optionsLoading: { ...s.optionsLoading, [attributeKey]: false } }));
    }
  },

  reset() {
    set({ status: 'idle', error: null, provider: 'none', isConfigured: false, schema: EMPTY_SCHEMA, capabilities: {}, requiredAttributes: [], options: {}, optionsLoading: {} });
  },
}));

export default useCatalogStore;
