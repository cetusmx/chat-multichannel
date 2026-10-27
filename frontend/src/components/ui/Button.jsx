import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn.js';

const base =
  'inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap select-none ' +
  'transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

const variants = {
  primary: 'bg-accent text-accent-fg hover:bg-accent-hover rounded-md',
  secondary: 'bg-surface-2 text-fg border border-border hover:bg-surface-3 hover:border-border-strong rounded-md',
  ghost: 'text-fg-muted hover:text-fg hover:bg-surface-2 rounded-md',
  outline: 'bg-transparent text-fg border border-border hover:bg-surface-2 hover:border-border-strong rounded-md',
  danger: 'bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20 rounded-md',
  success: 'bg-success/10 text-success border border-success/30 hover:bg-success/20 rounded-md',
  inverse: 'bg-surface-inverse text-fg-inverse hover:opacity-90 rounded-md',
  /* Mono uppercase chip, as in the composer toolbar. */
  chip: 'eyebrow bg-surface text-fg-muted border border-border hover:text-fg hover:border-border-strong rounded-md',
  'chip-accent': 'eyebrow bg-accent/10 text-accent border border-accent/40 hover:bg-accent/15 rounded-md',
};

const sizes = {
  xs: 'h-7 px-2.5 text-xs',
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-9 px-3.5 text-sm',
  lg: 'h-11 px-5 text-sm',
};

const chipSizes = {
  xs: 'h-7 px-2.5',
  sm: 'h-8 px-3',
  md: 'h-8 px-3',
  lg: 'h-9 px-4',
};

const Button = forwardRef(function Button(
  { variant = 'secondary', size = 'md', loading = false, icon: Icon, iconRight: IconRight, className, children, type = 'button', ...props },
  ref,
) {
  const isChip = variant.startsWith('chip');
  const iconSize = size === 'xs' ? 13 : size === 'lg' ? 16 : 14;

  return (
    <button
      ref={ref}
      type={type}
      className={cn(base, variants[variant], isChip ? chipSizes[size] : sizes[size], className)}
      disabled={props.disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 size={iconSize} className="animate-spin" aria-hidden /> : Icon && <Icon size={iconSize} aria-hidden />}
      {children}
      {IconRight && !loading && <IconRight size={iconSize} aria-hidden />}
    </button>
  );
});

export default Button;
