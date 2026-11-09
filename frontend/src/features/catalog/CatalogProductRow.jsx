import useCatalogStore from '../../stores/useCatalogStore.js';
import { Badge } from '../../components/ui/index.js';
import { productTitle, productSubtitle, productBadges, stockLabel } from '../../utils/catalog.js';
import { formatMoney } from '../../utils/formatDate.js';
import { cn } from '../../utils/cn.js';

/**
 * One catalog result (Product DTO) rendered according to the tenant's
 * display template. `actions` is a slot for buttons.
 */
export default function CatalogProductRow({ product, actions, compact = false, className }) {
  const schema = useCatalogStore((s) => s.schema);
  const capabilities = useCatalogStore((s) => s.capabilities);
  const title = productTitle(product, schema.display);
  const subtitle = productSubtitle(product, schema.display);
  const badges = productBadges(product, schema.display, schema);
  const stock = stockLabel(product);

  return (
    <li className={cn('flex gap-3 px-4 py-3 hover:bg-surface-2/60', compact ? 'items-start' : 'flex-col', className)}>
      {!compact && capabilities.productImages && product.imageUrl && (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-surface-2">
          <img src={product.imageUrl} alt="" className="max-h-full max-w-full object-contain p-1" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {subtitle && <div className="truncate font-mono text-[11px] text-fg-subtle">{subtitle}</div>}
            <div className={cn('mt-0.5 text-sm text-fg', compact ? 'line-clamp-2' : 'line-clamp-2')} title={title}>{title}</div>
            {badges.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {badges.map((b) => <Badge key={b}>{b}</Badge>)}
              </div>
            )}
          </div>
          {stock && (
            <Badge tone={product.stock.total > 0 ? 'success' : 'neutral'} className="shrink-0">{stock}</Badge>
          )}
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="tnum text-sm">
            <span className="font-mono font-semibold text-fg">{formatMoney(product.priceNet, product.currency)}</span>
            <span className="ml-1.5 text-xs text-fg-subtle">IVA incluido{product.unit ? ` · ${product.unit}` : ''}</span>
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
        </div>
      </div>
    </li>
  );
}
