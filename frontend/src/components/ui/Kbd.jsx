import { cn } from '../../utils/cn.js';

export default function Kbd({ className, children }) {
  return (
    <kbd className={cn('inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-border bg-surface-2 px-1.5 font-mono text-[10px] text-fg-muted', className)}>
      {children}
    </kbd>
  );
}
