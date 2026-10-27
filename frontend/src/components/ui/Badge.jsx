import { cn } from '../../utils/cn.js';

const tones = {
  neutral: 'bg-surface-3 text-fg-muted border-border-strong',
  accent: 'bg-accent/10 text-accent border-accent/40',
  success: 'bg-success/10 text-success border-success/40',
  warning: 'bg-warning/10 text-warning border-warning/40',
  danger: 'bg-danger/10 text-danger border-danger/40',
  info: 'bg-info/10 text-info border-info/40',
  /* Solid variants for things that must shout (ESCALADO). */
  'solid-danger': 'bg-danger text-white border-danger',
  'solid-accent': 'bg-accent text-accent-fg border-accent',
};

/**
 * Mono uppercase label chip. Used for statuses and metadata.
 */
export default function Badge({ tone = 'neutral', dot = false, className, children, ...props }) {
  return (
    <span
      className={cn(
        'eyebrow inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-[3px] whitespace-nowrap',
        tones[tone] || tones.neutral,
        className,
      )}
      {...props}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}
