import { cn } from '../../utils/cn.js';

const sizes = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-7 w-7 text-[11px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
};

export function getInitials(name) {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Initials avatar. `tone="inverse"` is the high-contrast style from the header.
 */
export default function Avatar({ name, size = 'md', tone = 'inverse', className }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-wide select-none',
        tone === 'inverse' ? 'bg-surface-inverse text-fg-inverse' : 'bg-surface-3 text-fg border border-border',
        sizes[size],
        className,
      )}
      aria-hidden
    >
      {getInitials(name)}
    </span>
  );
}
