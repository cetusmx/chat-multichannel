import { X, Calendar, User, Building2, Filter } from 'lucide-react';
import { Button, Eyebrow, Field, IconButton, Input } from '../ui/index.js';
import { cn } from '../../utils/cn.js';

function FacetSection({ icon: Icon, label, children, scroll = false }) {
  return (
    <section className="space-y-2">
      <span className="inline-flex items-center gap-1.5">
        <Icon size={12} className="text-fg-subtle" aria-hidden />
        <Eyebrow tone="muted">{label}</Eyebrow>
      </span>
      <div className={cn('space-y-0.5', scroll && 'max-h-40 overflow-y-auto pr-1 custom-scrollbar')}>{children}</div>
    </section>
  );
}

function FacetOption({ checked, onChange, name, count, mono = false }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-fg transition-colors hover:bg-surface-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-3.5 w-3.5 shrink-0 rounded-sm border-border accent-accent"
      />
      <span className={cn('flex-1 truncate', mono && 'font-mono text-[13px] uppercase')} title={name}>{name}</span>
      <span className="tnum shrink-0 rounded-sm border border-border bg-surface-2 px-1.5 py-px font-mono text-[10px] text-fg-subtle">{count}</span>
    </label>
  );
}

export default function FiltersSidebar({ isOpen, currentFilters, onApply, onClose, facets }) {
  if (!isOpen) return null;

  const asesores = facets?.asesores || [];
  const clientes = facets?.clientes || [];

  return (
    <aside className="z-10 flex h-full w-64 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="inline-flex items-center gap-2">
          <Filter size={14} className="text-accent" aria-hidden />
          <h2 className="text-sm font-semibold text-fg">Filtros</h2>
        </span>
        <IconButton icon={X} label="Cerrar filtros" size="sm" onClick={onClose} />
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-4 custom-scrollbar">
        {asesores.length > 0 && (
          <FacetSection icon={User} label="Asesores">
            {asesores.map(a => (
              <FacetOption
                key={a.id}
                name={a.name}
                count={a.count}
                checked={currentFilters.vendorId === a.id}
                onChange={(e) => {
                  onApply({ ...currentFilters, vendorId: e.target.checked ? a.id : '' });
                }}
              />
            ))}
          </FacetSection>
        )}

        {clientes.length > 0 && (
          <FacetSection icon={User} label="Clientes en resultados" scroll>
            {clientes.map(c => (
              <FacetOption
                key={c.id}
                name={c.name}
                count={c.count}
                checked={currentFilters.clientId === c.id}
                onChange={(e) => {
                  onApply({ ...currentFilters, clientId: e.target.checked ? c.id : '' });
                }}
              />
            ))}
          </FacetSection>
        )}

        {facets?.rfcs?.length > 0 && (
          <FacetSection icon={Building2} label="RFC / Razón social" scroll>
            {facets.rfcs.map(r => (
              <FacetOption
                key={r.id}
                name={r.name}
                count={r.count}
                mono
                checked={currentFilters.rfc === r.id}
                onChange={(e) => {
                  onApply({ ...currentFilters, rfc: e.target.checked ? r.id : '' });
                }}
              />
            ))}
          </FacetSection>
        )}

        <FacetSection icon={Calendar} label="Fechas">
          <div className="space-y-3 pt-1">
            <Field label="Desde">
              {(a11y) => (
                <Input
                  {...a11y}
                  type="date"
                  size="sm"
                  value={currentFilters.dateFrom || ''}
                  onChange={e => onApply({ ...currentFilters, dateFrom: e.target.value })}
                />
              )}
            </Field>
            <Field label="Hasta">
              {(a11y) => (
                <Input
                  {...a11y}
                  type="date"
                  size="sm"
                  value={currentFilters.dateTo || ''}
                  onChange={e => onApply({ ...currentFilters, dateTo: e.target.value })}
                />
              )}
            </Field>
          </div>
        </FacetSection>
      </div>

      <div className="border-t border-border p-4">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            onApply({ vendorId: '', clientId: '', rfc: '', dateFrom: '', dateTo: '', status: '' });
          }}
        >
          Limpiar filtros
        </Button>
      </div>
    </aside>
  );
}
