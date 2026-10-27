import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import useToastStore from '../../stores/useToastStore.js';
import { cn } from '../../utils/cn.js';

const icons = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  info: Info,
  neutral: Info,
};

const toneText = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
  neutral: 'text-fg-muted',
};

/** Mount once in App. Renders toasts pushed through `toast.*`. */
export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[200] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2" role="region" aria-label="Notificaciones">
      {toasts.map((t) => {
        const Icon = icons[t.tone] || Info;
        return (
          <div
            key={t.id}
            role="status"
            className="animate-toast-in pointer-events-auto flex items-start gap-3 rounded-lg border border-border bg-surface px-3.5 py-3 shadow-xl shadow-black/40"
          >
            <Icon size={16} className={cn('mt-0.5 shrink-0', toneText[t.tone])} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-fg leading-snug">{t.title}</p>
              {t.description && <p className="mt-0.5 text-[13px] text-fg-muted leading-snug break-words">{t.description}</p>}
              {t.action && (
                <button
                  onClick={() => {
                    t.action.onClick?.();
                    dismiss(t.id);
                  }}
                  className="mt-1.5 text-[13px] font-medium text-accent hover:text-accent-hover"
                >
                  {t.action.label}
                </button>
              )}
            </div>
            <button onClick={() => dismiss(t.id)} aria-label="Cerrar notificación" className="-mr-1 -mt-1 rounded-md p-1 text-fg-subtle hover:text-fg hover:bg-surface-2">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
