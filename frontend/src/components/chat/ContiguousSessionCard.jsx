import { ChevronUp, ChevronDown, RotateCcw, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn.js';

export default function ContiguousSessionCard({ type, date: _date, loading, error, onClick }) {
  const isPrevious = type === 'previous';
  const DirectionIcon = isPrevious ? ChevronUp : ChevronDown;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-busy={loading}
      aria-disabled={loading}
      className={cn(
        'my-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-2.5 text-[13px] font-medium transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait',
        error
          ? 'border-danger/40 bg-danger/10 text-danger hover:bg-danger/20'
          : 'border-border-strong bg-surface text-fg-muted hover:bg-surface-2 hover:text-fg',
      )}
    >
      {loading ? (
        <>
          <Loader2 size={14} className="animate-spin" aria-hidden />
          Cargando {isPrevious ? 'mensajes anteriores' : 'mensajes siguientes'}
        </>
      ) : error ? (
        <>
          <RotateCcw size={14} aria-hidden />
          Error al cargar. Reintentar
        </>
      ) : (
        <>
          <DirectionIcon size={14} aria-hidden />
          {isPrevious ? 'Cargar conversación anterior' : 'Cargar conversación siguiente'}
        </>
      )}
    </button>
  );
}
