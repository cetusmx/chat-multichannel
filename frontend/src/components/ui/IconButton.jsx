import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn.js';

const variants = {
  ghost: 'text-fg-muted hover:text-fg hover:bg-surface-2',
  outline: 'text-fg-muted border border-border hover:text-fg hover:bg-surface-2 hover:border-border-strong',
  primary: 'bg-accent text-accent-fg hover:bg-accent-hover',
  inverse: 'bg-surface-inverse text-fg-inverse hover:opacity-90',
  danger: 'text-fg-muted hover:text-danger hover:bg-danger/10',
};

const sizes = {
  sm: 'h-7 w-7',
  md: 'h-8 w-8',
  lg: 'h-9 w-9',
  xl: 'h-10 w-10',
};

const iconSizes = { sm: 14, md: 16, lg: 16, xl: 18 };

/**
 * Icon-only button. `label` is required: it becomes aria-label and title.
 */
const IconButton = forwardRef(function IconButton(
  { icon: Icon, label, variant = 'ghost', size = 'md', loading = false, className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center rounded-md transition-colors duration-150 shrink-0',
        'disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading ? <Loader2 size={iconSizes[size]} className="animate-spin" aria-hidden /> : <Icon size={iconSizes[size]} aria-hidden />}
    </button>
  );
});

export default IconButton;
