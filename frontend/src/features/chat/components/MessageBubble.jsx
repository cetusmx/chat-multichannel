import { memo, useState } from 'react';
import { Lock, Share2, ShoppingCart, Plus, Minus, Tag, X, Truck, Check, Paperclip } from 'lucide-react';
import SecureMedia from '../../../components/SecureMedia.jsx';
import { Eyebrow, Button } from '../../../components/ui/index.js';
import { renderWhatsAppText, stripMediaPrefix } from '../../../utils/whatsappFormat.jsx';
import { formatTime, formatMoney } from '../../../utils/formatDate.js';
import { cn } from '../../../utils/cn.js';

export const TEAM_SENDERS = ['VENDOR', 'SYSTEM', 'COORDINATOR', 'ADMIN', 'IA'];

const SENDER_EYEBROW = {
  IA: 'Asistente IA',
  SYSTEM: 'Automático',
  COORDINATOR: 'Coordinador',
  ADMIN: 'Administrador',
};

/**
 * Author attribution for internal notes.
 * Contract: msg.sender = { name, role } (optional). Falls back gracefully.
 */
function authorLabel(msg) {
  const name = msg.sender?.name || msg.senderName;
  if (!name) return null;
  const roleWord = { VENDOR: 'vendedor', COORDINATOR: 'coordinador', ADMIN: 'admin' }[msg.sender?.role || msg.senderType];
  return roleWord ? `${name} (${roleWord})` : name;
}

function Timestamp({ msg, inverse }) {
  return (
    <span className={cn('tnum mt-1.5 block text-right font-mono text-[10px]', inverse ? 'text-fg-inverse/55' : 'text-fg-subtle')}>
      {formatTime(msg.createdAt)}
      {msg.status === 'SENDING' && ' · enviando'}
      {msg.status === 'FAILED' && <span className="text-danger"> · falló</span>}
    </span>
  );
}

function Tags({ msg, canEdit, onAddTag, onRemoveTag, side }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const tags = msg.tags || [];
  if (!canEdit && tags.length === 0) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (value.trim()) await onAddTag(msg.id, value.trim());
    setEditing(false);
    setValue('');
  };

  /* No tags yet: keep the bubble compact and float the trigger beside it. */
  if (tags.length === 0 && !editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className={cn(
          'absolute top-1 inline-flex h-6 w-6 items-center justify-center rounded-md border border-border bg-surface text-fg-subtle opacity-0 transition-opacity hover:text-fg group-hover:opacity-100 focus-visible:opacity-100',
          side === 'right' ? '-left-8' : '-right-8',
        )}
        aria-label="Añadir etiqueta"
      >
        <Tag size={11} />
      </button>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1">
      {tags.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-sm border border-border bg-surface px-1.5 py-px font-mono text-[10px] text-fg-muted">
          {t}
          {canEdit && (
            <button onClick={() => onRemoveTag(msg.id, t)} className="text-fg-subtle hover:text-danger" aria-label={`Quitar etiqueta ${t}`}>
              <X size={10} />
            </button>
          )}
        </span>
      ))}
      {canEdit && (editing ? (
        <form onSubmit={submit} className="inline-flex">
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
            placeholder="etiqueta"
            aria-label="Nueva etiqueta"
            className="h-5 w-24 rounded-sm border border-accent bg-surface px-1.5 font-mono text-[10px] text-fg focus:outline-none"
          />
        </form>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-fg-subtle opacity-0 transition-opacity hover:bg-surface hover:text-fg group-hover:opacity-100 focus-visible:opacity-100"
          aria-label="Añadir etiqueta"
        >
          <Tag size={10} />
        </button>
      ))}
    </div>
  );
}

function Attachment({ msg, canForward, onForward, uploading }) {
  const att = msg.attachments?.[0];
  if (!att) return null;
  return (
    <div className="relative mb-2">
      <SecureMedia url={att.url} type={att.type} alt={att.name || 'Adjunto'} className="max-w-full rounded-md" fallbackText={att.name} />
      {canForward && (
        <Button
          size="xs"
          variant="inverse"
          icon={Share2}
          loading={uploading}
          onClick={() => onForward(msg.id)}
          className={cn('absolute -right-2 -top-2 shadow-lg', !uploading && 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100')}
          title="Reenviar al cliente"
        >
          {uploading ? 'Enviando' : 'Compartir'}
        </Button>
      )}
    </div>
  );
}

function ProductCard({ msg, onAddToCart }) {
  const m = msg.metadata || {};
  const [qty, setQty] = useState(1);
  const [state, setState] = useState('idle');

  const add = async () => {
    setState('loading');
    try {
      await onAddToCart({ clave: m.clave, descripcion: m.description, precio: parseFloat(m.priceNet || 0), cantidad: qty });
      setState('done');
      setTimeout(() => setState('idle'), 2000);
    } catch {
      setState('idle');
    }
  };

  return (
    <div className="w-[280px] max-w-full overflow-hidden rounded-lg border border-border bg-surface text-fg">
      <div className="flex h-24 items-center justify-center border-b border-border bg-surface-2">
        {m.imageUrl ? (
          <img
            src={m.imageUrl}
            alt={m.clave}
            className="max-h-full max-w-full object-contain p-2"
            onError={(e) => {
              if (e.target.src.endsWith('.jpg')) e.target.src = e.target.src.replace('.jpg', '.png');
              else { e.target.onerror = null; e.target.style.display = 'none'; }
            }}
          />
        ) : (
          <Eyebrow tone="muted">Imagen del producto</Eyebrow>
        )}
      </div>
      <div className="px-3.5 py-3">
        <div className="text-sm font-semibold text-fg leading-snug">
          {m.description && <span className="line-clamp-2">{m.description}</span>}
          <span className="mt-0.5 block font-mono text-[11px] font-medium text-accent">{m.clave}</span>
        </div>
        <div className="tnum mt-1 text-[13px] text-fg-muted">
          {formatMoney(m.priceNet)} <span className="text-fg-subtle">· IVA incluido</span>
        </div>
      </div>
      {onAddToCart && (
        <div className="flex items-center border-t border-border">
          <div className="flex items-center border-r border-border">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="flex h-9 w-8 items-center justify-center text-fg-muted hover:bg-surface-2 hover:text-fg" aria-label="Menos">
              <Minus size={12} />
            </button>
            <span className="tnum w-6 text-center font-mono text-xs text-fg">{qty}</span>
            <button onClick={() => setQty(qty + 1)} className="flex h-9 w-8 items-center justify-center text-fg-muted hover:bg-surface-2 hover:text-fg" aria-label="Más">
              <Plus size={12} />
            </button>
          </div>
          <button
            onClick={add}
            disabled={state !== 'idle'}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 text-[13px] font-medium text-accent transition-colors hover:bg-accent/10 disabled:opacity-70"
          >
            {state === 'done' ? <><Check size={13} /> Añadido</> : <><Plus size={13} /> Agregar a mi pedido</>}
          </button>
        </div>
      )}
    </div>
  );
}

function CartSummaryCard({ msg }) {
  const m = msg.metadata || {};
  const items = m.items || [];
  return (
    <div className="w-[300px] max-w-full overflow-hidden rounded-lg border border-border bg-surface text-fg">
      <div className="flex items-center gap-2 border-b border-border px-3.5 py-2.5">
        <ShoppingCart size={13} className="text-fg-muted" aria-hidden />
        <span className="text-sm font-semibold">Resumen de cotización</span>
      </div>
      <div className="max-h-44 space-y-2 overflow-y-auto px-3.5 py-2.5 custom-scrollbar">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-start gap-2 text-xs">
            <span className="tnum shrink-0 rounded-sm border border-border bg-surface-2 px-1 font-mono text-[10px] text-fg-muted">{item.cantidad}×</span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-mono text-[11px] font-medium text-fg">{item.clave}</div>
              <div className="line-clamp-1 text-[11px] text-fg-subtle">{item.descripcion}</div>
            </div>
            <span className="tnum shrink-0 font-mono text-[11px] text-fg-muted">{formatMoney((item.precio || 0) * (item.cantidad || 0))}</span>
          </div>
        ))}
      </div>
      <div className="space-y-1 border-t border-border px-3.5 py-2.5 text-xs">
        <div className="flex justify-between text-fg-muted"><span>Subtotal</span><span className="tnum font-mono">{formatMoney(m.subtotal)}</span></div>
        <div className="flex justify-between text-fg-muted"><span>IVA (16%)</span><span className="tnum font-mono">{formatMoney(m.iva)}</span></div>
        <div className="flex justify-between pt-1 text-sm font-semibold text-fg"><span>Total</span><span className="tnum font-mono">{formatMoney(m.total)}</span></div>
      </div>
      {m.shippingAddress && (
        <div className="flex items-start gap-2 border-t border-border bg-surface-2 px-3.5 py-2 text-[11px] text-fg-muted">
          <Truck size={12} className="mt-px shrink-0" aria-hidden />
          <span>{m.shippingAddress}</span>
        </div>
      )}
    </div>
  );
}

/** Centered timeline event, e.g. "El cliente agregó X a su pedido". */
function EventLine({ msg }) {
  const tone = msg.metadata?.tone || 'success';
  return (
    <div className="flex w-full justify-center">
      <div className="inline-flex max-w-[85%] items-center gap-2.5 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm text-fg-muted">
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', { success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger', info: 'bg-info', accent: 'bg-accent' }[tone] || 'bg-success')} aria-hidden />
        <span>{renderWhatsAppText(msg.content)}</span>
      </div>
    </div>
  );
}

function MessageBubble({ msg, user, highlighted, highlightRef, onAddToCart, onForwardMedia, forwardUploading, onAddTag, onRemoveTag }) {
  const isTeam = TEAM_SENDERS.includes(msg.senderType);
  const isInternal = !!msg.isInternal;
  const canEdit = ['ADMIN', 'COORDINATOR', 'VENDOR'].includes(user?.role);

  if (msg.type === 'EVENT') {
    return (
      <div ref={highlighted ? highlightRef : null} className={cn('transition-colors', highlighted && 'rounded-lg bg-accent/10 p-1')}>
        <EventLine msg={msg} />
      </div>
    );
  }

  const isRich = msg.type === 'PRODUCT_CARD' || msg.type === 'CART_SUMMARY';
  const inverse = isTeam && !isInternal && !isRich;
  const author = authorLabel(msg);
  const eyebrow = !isInternal && SENDER_EYEBROW[msg.senderType];
  const bodyText = stripMediaPrefix(msg.content);

  return (
    <div
      ref={highlighted ? highlightRef : null}
      className={cn('flex w-full', isTeam ? 'justify-end' : 'justify-start', highlighted && 'rounded-lg bg-accent/10 p-1.5 transition-colors duration-700')}
    >
      <div
        className={cn(
          'group relative min-w-0',
          isInternal
            ? 'max-w-[82%] rounded-lg border border-dashed border-accent/60 bg-accent/[0.06] px-3.5 py-2.5 text-fg'
            : isRich
              ? 'max-w-[85%]'
              : inverse
                ? 'max-w-[72%] rounded-lg rounded-br-sm bg-surface-inverse px-3.5 py-2.5 text-fg-inverse'
                : 'max-w-[72%] rounded-lg rounded-bl-sm bg-surface-3 px-3.5 py-2.5 text-fg',
        )}
      >
        {isInternal && (
          <div className="mb-1.5 flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-1.5">
              <Lock size={11} className="text-accent" aria-hidden />
              <Eyebrow tone="accent">Nota interna</Eyebrow>
            </span>
            {author && <span className="truncate font-mono text-[10px] text-fg-subtle">{author}</span>}
          </div>
        )}
        {eyebrow && !isRich && <Eyebrow tone="muted" className={cn('mb-1 block', inverse && 'text-fg-inverse/50')}>{eyebrow}</Eyebrow>}

        <Attachment msg={msg} canForward={canEdit && !!onForwardMedia} onForward={onForwardMedia} uploading={forwardUploading} />

        {msg.type === 'CART_SUMMARY' && msg.metadata ? (
          <CartSummaryCard msg={msg} />
        ) : msg.type === 'PRODUCT_CARD' && msg.metadata ? (
          <ProductCard msg={msg} onAddToCart={canEdit ? onAddToCart : null} />
        ) : bodyText ? (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{renderWhatsAppText(bodyText)}</p>
        ) : !msg.attachments?.length ? (
          <p className="inline-flex items-center gap-1.5 text-sm italic text-fg-subtle"><Paperclip size={12} /> Sin contenido</p>
        ) : null}

        {!isRich && <Timestamp msg={msg} inverse={inverse} />}
        {isRich && <Timestamp msg={msg} inverse={false} />}

        <Tags msg={msg} canEdit={canEdit && !!onAddTag} onAddTag={onAddTag} onRemoveTag={onRemoveTag} side={isTeam ? 'right' : 'left'} />
      </div>
    </div>
  );
}

export default memo(MessageBubble);
