import { memo, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { MessageSquare, User, Phone } from 'lucide-react';
import { Eyebrow } from '../ui/index.js';
import { cn } from '../../utils/cn.js';

export const MARK_CLASS = 'bg-accent/25 text-fg rounded-sm px-0.5';

function safeString(value, fallback = '') {
  try {
    if (value === null || value === undefined || value === '') return fallback;
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  } catch {
    return fallback;
  }
}

function formatCardDate(value) {
  try {
    if (!value) return 'Fecha desconocida';
    const date = new Date(value);
    if (isNaN(date.getTime())) return 'Fecha desconocida';
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(date);
  } catch {
    return 'Fecha desconocida';
  }
}

const ResultCard = memo(({ item, isActive, onClick }) => {
  const handleClick = useCallback(() => {
    onClick(item);
  }, [item, onClick]);

  const dateStr = formatCardDate(item?.createdAt);
  const nameStr = safeString(item?.clientName || item?.name || item?.phone, 'Contacto desconocido');
  const vendorNameStr = safeString(item?.vendorName);
  const prevContextStr = safeString(item?.previousMessageContext);
  const snippetStr = safeString(item?.snippet || item?.body || item?.content, 'Coincidencia en metadatos');
  const phoneStr = safeString(item?.phone);
  const isChat = item?.type === 'chat';
  const TypeIcon = isChat ? MessageSquare : User;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cn(
        'cursor-pointer rounded-lg border p-4 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
        isActive ? 'border-accent/60 bg-accent/[0.06]' : 'border-border bg-surface hover:bg-surface-2/60',
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-semibold text-fg">{nameStr}</h4>
          <span className="mt-0.5 inline-flex items-center gap-1.5">
            <TypeIcon size={11} className="text-fg-subtle" aria-hidden />
            <Eyebrow tone="muted">{isChat ? 'Mensaje' : 'Cliente'}{vendorNameStr && ` · ${vendorNameStr}`}</Eyebrow>
          </span>
        </div>
        <span className="tnum shrink-0 text-right font-mono text-[10px] text-fg-subtle">{dateStr}</span>
      </div>

      {isChat && (
        <div className="text-sm text-fg-muted">
          {prevContextStr !== '' && (
            <p className="mb-1.5 line-clamp-1 border-l-2 border-border pl-2 text-[13px] italic text-fg-subtle">
              {prevContextStr}
            </p>
          )}
          <p
            className="line-clamp-3 whitespace-pre-wrap break-words rounded-md border border-border bg-surface-2 px-2.5 py-2 text-[13px] leading-relaxed text-fg"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(snippetStr, {
                ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'mark', 'br'],
                ALLOWED_ATTR: ['class'],
              })
                .replace(/<b>/g, `<mark class="${MARK_CLASS}">`)
                .replace(/<\/b>/g, '</mark>'),
            }}
          />
        </div>
      )}

      {item?.type === 'client' && phoneStr && (
        <p className="inline-flex items-center gap-1.5 text-[13px] text-fg-muted">
          <Phone size={12} className="text-fg-subtle" aria-hidden />
          <span className="tnum font-mono">{phoneStr}</span>
        </p>
      )}
    </div>
  );
});

ResultCard.displayName = 'ResultCard';
export default ResultCard;
