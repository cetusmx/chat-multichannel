import { cn } from '../../utils/cn.js';

/**
 * Flat surface with hairline border. Optional header row with eyebrow/title/actions.
 */
export default function Panel({ eyebrow, title, description, actions, padded = true, className, bodyClassName, children }) {
  const hasHeader = eyebrow || title || actions;
  return (
    <section className={cn('rounded-lg border border-border bg-surface', className)}>
      {hasHeader && (
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-3.5">
          <div className="min-w-0">
            {eyebrow && <div className="eyebrow text-fg-subtle">{eyebrow}</div>}
            {title && <h2 className={cn('font-semibold text-fg text-sm leading-snug', eyebrow && 'mt-1')}>{title}</h2>}
            {description && <p className="mt-1 text-[13px] text-fg-muted leading-relaxed">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn(padded && 'p-5', bodyClassName)}>{children}</div>
    </section>
  );
}
