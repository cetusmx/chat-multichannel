import { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn.js';

const control =
  'w-full rounded-md border border-border bg-surface-2 text-fg placeholder:text-fg-subtle ' +
  'transition-colors duration-150 hover:border-border-strong ' +
  'focus:outline-none focus:border-accent focus:ring-2 focus:ring-ring/40 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed aria-[invalid=true]:border-danger';

const sizes = {
  sm: 'h-8 px-2.5 text-[13px]',
  md: 'h-9 px-3 text-sm',
  lg: 'h-11 px-3.5 text-sm',
};

/**
 * Label + control + hint/error wrapper. Pass `label`, `hint`, `error`.
 * Children receive `id` and `aria-describedby` automatically when a function.
 */
export function Field({ label, hint, error, required, className, children, htmlFor }) {
  const autoId = useId();
  const id = htmlFor || autoId;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const content = typeof children === 'function' ? children({ id, 'aria-describedby': describedBy, 'aria-invalid': !!error }) : children;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-[13px] font-medium text-fg-muted">
          {label}
          {required && <span className="text-accent ml-0.5">*</span>}
        </label>
      )}
      {content}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-fg-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef(function Input({ size = 'md', mono = false, leftIcon: LeftIcon, className, ...props }, ref) {
  if (LeftIcon) {
    return (
      <div className="relative">
        <LeftIcon size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden />
        <input ref={ref} className={cn(control, sizes[size], 'pl-9', mono && 'font-mono', className)} {...props} />
      </div>
    );
  }
  return <input ref={ref} className={cn(control, sizes[size], mono && 'font-mono', className)} {...props} />;
});

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(control, 'px-3 py-2 text-sm leading-relaxed resize-y min-h-[80px]', className)} {...props} />;
});

export const Select = forwardRef(function Select({ size = 'md', className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(control, sizes[size], 'appearance-none pr-9', className)} {...props}>
        {children}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden />
    </div>
  );
});

export function Switch({ checked, onChange, label, disabled, className }) {
  return (
    <label className={cn('inline-flex items-center gap-2.5 cursor-pointer select-none', disabled && 'opacity-50 cursor-not-allowed', className)}>
      <span className="relative inline-flex">
        <input type="checkbox" className="peer sr-only" checked={!!checked} onChange={(e) => onChange?.(e.target.checked)} disabled={disabled} />
        <span className="h-5 w-9 rounded-full bg-surface-3 border border-border transition-colors peer-checked:bg-accent peer-checked:border-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent" />
        <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-fg-muted transition-transform peer-checked:translate-x-4 peer-checked:bg-white" />
      </span>
      {label && <span className="text-sm text-fg">{label}</span>}
    </label>
  );
}
