import { cn } from '../../utils/cn.js';

/**
 * Standard page title block: eyebrow + title + optional description and actions.
 */
export default function PageHeader({ eyebrow, title, description, actions, className }) {
  return (
    <div className={cn('mb-6 flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow text-fg-subtle mb-1.5">{eyebrow}</div>}
        <h1 className="text-xl font-semibold tracking-tight text-fg">{title}</h1>
        {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
