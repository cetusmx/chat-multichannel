import { cn } from '../../utils/cn.js';

/**
 * Underline tabs. items: [{ id, label, count? }]
 */
export default function Tabs({ items, value, onChange, className }) {
  return (
    <div role="tablist" className={cn('flex gap-1 border-b border-border overflow-x-auto custom-scrollbar', className)}>
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={cn(
              'relative -mb-px flex h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors',
              active ? 'border-accent text-fg' : 'border-transparent text-fg-muted hover:text-fg',
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className={cn('tnum font-mono text-[11px] rounded-sm px-1.5 py-px', active ? 'bg-accent/15 text-accent' : 'bg-surface-3 text-fg-subtle')}>
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
