import { cn } from '../../utils/cn.js';

/**
 * Centered empty/zero-data state with optional icon, eyebrow and action.
 */
export default function EmptyState({ icon: Icon, eyebrow, title, description, action, compact = false, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'py-8 px-4' : 'py-16 px-6', className)}>
      {Icon && (
        <div className={cn('mb-4 flex items-center justify-center rounded-lg border border-border bg-surface-2 text-fg-subtle', compact ? 'h-10 w-10' : 'h-12 w-12')}>
          <Icon size={compact ? 18 : 22} aria-hidden />
        </div>
      )}
      {eyebrow && <div className="eyebrow text-fg-subtle mb-2">{eyebrow}</div>}
      {title && <h3 className={cn('font-semibold text-fg', compact ? 'text-sm' : 'text-base')}>{title}</h3>}
      {description && <p className={cn('mt-1.5 max-w-sm text-fg-muted leading-relaxed', compact ? 'text-[13px]' : 'text-sm')}>{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
