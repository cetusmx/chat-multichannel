import { useEffect, useRef, useState } from 'react';
import { Search, Plus, FileText, ShoppingCart, SlidersHorizontal, Check } from 'lucide-react';
import { searchCatalog, updateClientCart, downloadQuotePdf } from '../../../services/api';
import { toast } from '../../../stores/useToastStore.js';
import useCatalogStore from '../../../stores/useCatalogStore.js';
import CatalogProductRow from '../../catalog/CatalogProductRow.jsx';
import { Eyebrow, Button, Input, Spinner, EmptyState } from '../../../components/ui/index.js';
import { getCartItems, cartTotals, withAddedItem, catalogProductToItem } from '../../../utils/cart.js';
import { formatMoney } from '../../../utils/formatDate.js';
import { cn } from '../../../utils/cn.js';

/**
 * Right rail of the vendor chat: quick catalog text search + cart summary +
 * quote CTA. Everything it shows comes from the tenant's catalog schema.
 */
export default function CatalogPanel({ client, conversationId, disabled, onOpenCart }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [state, setState] = useState('idle'); // idle | loading | done | error
  const [addedKey, setAddedKey] = useState(null);
  const [generating, setGenerating] = useState(false);
  const debounceRef = useRef(null);

  const schema = useCatalogStore((s) => s.schema);
  const capabilities = useCatalogStore((s) => s.capabilities);
  const pricing = useCatalogStore((s) => s.pricing);
  const load = useCatalogStore((s) => s.load);

  useEffect(() => {
    load();
  }, [load]);

  const items = getCartItems(client);
  const totals = cartTotals(items, pricing.taxRate);
  const textEnabled = !!capabilities.textSearch;
  const minLength = schema.textSearch?.minLength || 2;

  useEffect(() => {
    setQuery('');
    setResults([]);
    setState('idle');
  }, [client?.id]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!textEnabled || q.length < minLength) {
      setResults([]);
      setState('idle');
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setState('loading');
      try {
        const data = await searchCatalog({ q }, { limit: 30 });
        setResults(data);
        setState('done');
      } catch {
        setResults([]);
        setState('error');
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query, textEnabled, minLength]);

  const addProduct = async (product) => {
    if (!client?.id) return;
    const item = catalogProductToItem(product, 1);
    try {
      await updateClientCart(client.id, withAddedItem(client.cartData ?? client.cart, item));
      setAddedKey(item.clave);
      setTimeout(() => setAddedKey(null), 1500);
      toast.success('Añadido al carrito', { description: item.clave });
    } catch (err) {
      toast.error('No se pudo añadir al carrito', { description: err.message });
    }
  };

  const generatePdf = async () => {
    setGenerating(true);
    try {
      await downloadQuotePdf(client, client.cartData ?? client.cart, conversationId);
      toast.success('Cotización generada', { description: conversationId ? 'Descargada y enviada al cliente por WhatsApp' : undefined });
    } catch (err) {
      toast.error('No se pudo generar la cotización', { description: err.message });
    } finally {
      setGenerating(false);
    }
  };

  const advancedButton = (
    <Button variant="chip" size="xs" icon={SlidersHorizontal} onClick={onOpenCart}>
      {schema.attributes.length > 0 ? 'Búsqueda avanzada' : 'Abrir carrito'}
    </Button>
  );

  return (
    <aside className="flex h-full w-full flex-col bg-surface" aria-label="Catálogo y carrito">
      <div className="border-b border-border px-4 pb-3 pt-4">
        <Eyebrow tone="muted" className="mb-2.5 block">Catálogo</Eyebrow>
        {textEnabled ? (
          <Input
            leftIcon={Search}
            mono
            size="md"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={schema.textSearch.placeholder}
            aria-label={schema.textSearch.label}
            disabled={disabled}
          />
        ) : (
          <p className="text-[13px] text-fg-muted">Este catálogo se consulta por atributos.</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {state === 'loading' && <div className="flex justify-center py-8"><Spinner /></div>}

        {state === 'idle' && (
          <EmptyState
            compact
            icon={Search}
            title={textEnabled ? 'Busca un producto' : 'Búsqueda por atributos'}
            description={textEnabled ? 'Escribe una clave o parte de la descripción para agregarlo al pedido sin salir del chat.' : 'Usa la búsqueda avanzada para filtrar por las características del producto.'}
            action={advancedButton}
          />
        )}

        {(state === 'done' && results.length === 0) || state === 'error' ? (
          <EmptyState
            compact
            icon={Search}
            title={state === 'error' ? 'El catálogo no respondió' : 'Sin resultados'}
            description={state === 'error' ? 'Intenta de nuevo o usa la búsqueda avanzada.' : `Nada coincide con “${query.trim()}”.`}
            action={advancedButton}
          />
        ) : null}

        {state === 'done' && results.length > 0 && (
          <ul className="divide-y divide-border/70">
            {results.map((p, i) => {
              const isAdded = addedKey === p.sku;
              return (
                <CatalogProductRow
                  key={`${p.sku}-${i}`}
                  product={p}
                  compact
                  actions={
                    <button
                      onClick={() => addProduct(p)}
                      disabled={disabled}
                      className={cn('inline-flex items-center gap-0.5 font-mono text-[11px] transition-colors disabled:opacity-50', isAdded ? 'text-success' : 'text-accent hover:text-accent-hover')}
                    >
                      {isAdded ? <><Check size={11} /> añadido</> : <><Plus size={11} /> agregar</>}
                    </button>
                  }
                />
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-border px-4 py-3.5">
        <button onClick={onOpenCart} className="mb-3 flex w-full items-center justify-between text-left" title="Abrir carrito">
          <span className="inline-flex items-center gap-2 text-sm text-fg-muted">
            <ShoppingCart size={14} aria-hidden />
            Carrito · {totals.count} {totals.count === 1 ? 'partida' : 'partidas'}
          </span>
          <span className="tnum text-sm font-semibold text-fg">{formatMoney(totals.total, pricing.currency)}</span>
        </button>
        <Button variant="primary" size="lg" icon={FileText} className="w-full" loading={generating} disabled={disabled || totals.count === 0} onClick={generatePdf}>
          Generar cotización PDF
        </Button>
      </div>
    </aside>
  );
}
