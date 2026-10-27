import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn.js';
import IconButton from './IconButton.jsx';

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

/**
 * Base dialog. Closes on Escape and backdrop click, restores focus on unmount.
 *
 * <Modal open onClose title="..." description="..." footer={<...>}>body</Modal>
 */
export default function Modal({ open, onClose, title, description, eyebrow, footer, size = 'md', children, className, closeOnBackdrop = true }) {
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement;
    const onKey = (e) => {
      if (e.key === 'Escape') onCloseRef.current?.();
    };
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => {
      const el = panelRef.current?.querySelector('[data-autofocus], input, textarea, select, button');
      el?.focus();
    }, 0);
    return () => {
      document.removeEventListener('keydown', onKey);
      clearTimeout(t);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose?.();
      }}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        className={cn(
          'w-full rounded-xl border border-border bg-surface shadow-2xl shadow-black/40 flex flex-col max-h-[90vh]',
          sizes[size],
          className,
        )}
      >
        {(title || eyebrow) && (
          <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
            <div className="min-w-0">
              {eyebrow && <div className="eyebrow text-fg-subtle mb-1.5">{eyebrow}</div>}
              {title && <h2 id="modal-title" className="text-base font-semibold text-fg leading-tight">{title}</h2>}
              {description && <p className="mt-1.5 text-sm text-fg-muted leading-relaxed">{description}</p>}
            </div>
            {onClose && <IconButton icon={X} label="Cerrar" size="sm" onClick={onClose} className="-mr-1 -mt-1" />}
          </div>
        )}
        <div className={cn('px-5 overflow-y-auto custom-scrollbar', title || eyebrow ? 'pb-5' : 'py-5')}>{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3.5">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
