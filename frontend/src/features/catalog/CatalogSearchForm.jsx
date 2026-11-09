import { useEffect } from 'react';
import { Search } from 'lucide-react';
import useCatalogStore from '../../stores/useCatalogStore.js';
import { Field, Input, Select, Button, Switch } from '../../components/ui/index.js';
import { hasRequiredValues } from '../../utils/catalog.js';
import { cn } from '../../utils/cn.js';

/**
 * Search form rendered from the tenant's catalog schema. Controlled:
 * `values` is { q, <attributeKey>: string }, `onChange(next)`.
 */
export default function CatalogSearchForm({ values, onChange, onSubmit, loading = false, error = null, className, columns = 2 }) {
  const schema = useCatalogStore((s) => s.schema);
  const options = useCatalogStore((s) => s.options);
  const optionsLoading = useCatalogStore((s) => s.optionsLoading);
  const loadOptions = useCatalogStore((s) => s.loadOptions);

  useEffect(() => {
    for (const a of schema.attributes) {
      if (a.type === 'select' && !a.options && a.optionsSource) loadOptions(a.key);
    }
  }, [schema, loadOptions]);

  const set = (key, value) => onChange({ ...values, [key]: value });
  const canSubmit = hasRequiredValues(schema, values) && (values.q?.trim() || schema.attributes.some((a) => values[a.key] !== '' && values[a.key] != null));

  const renderAttribute = (a) => {
    const common = { label: a.unit ? `${a.label} (${a.unit})` : a.label, required: a.required, key: a.key };
    switch (a.type) {
      case 'select': {
        const list = options[a.key] || a.options || [];
        return (
          <Field {...common} hint={optionsLoading[a.key] ? 'Cargando opciones…' : undefined}>
            {(p) => (
              <Select {...p} value={values[a.key] ?? ''} onChange={(e) => set(a.key, e.target.value)} disabled={optionsLoading[a.key]}>
                <option value="">{a.placeholder || `Seleccionar ${a.label.toLowerCase()}`}</option>
                {list.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            )}
          </Field>
        );
      }
      case 'boolean':
        return (
          <Field {...common}>
            {() => (
              <div className="flex h-9 items-center">
                <Switch checked={values[a.key] === true || values[a.key] === 'true'} onChange={(v) => set(a.key, v ? 'true' : '')} label={values[a.key] === 'true' || values[a.key] === true ? 'Sí' : 'No'} />
              </div>
            )}
          </Field>
        );
      case 'range':
        return (
          <Field {...common} hint="min-max o un valor">
            {(p) => <Input {...p} mono value={values[a.key] ?? ''} onChange={(e) => set(a.key, e.target.value)} placeholder={a.placeholder || '91-94'} />}
          </Field>
        );
      case 'number':
        return (
          <Field {...common}>
            {(p) => <Input {...p} mono inputMode="decimal" value={values[a.key] ?? ''} onChange={(e) => set(a.key, e.target.value)} placeholder={a.placeholder || ''} />}
          </Field>
        );
      default:
        return (
          <Field {...common}>
            {(p) => <Input {...p} value={values[a.key] ?? ''} onChange={(e) => set(a.key, e.target.value)} placeholder={a.placeholder || ''} />}
          </Field>
        );
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit && !loading) onSubmit?.(values);
      }}
      className={cn('grid gap-3', columns === 2 ? 'grid-cols-2' : 'grid-cols-1', className)}
    >
      {schema.textSearch.enabled && (
        <Field label={schema.textSearch.label} className={columns === 2 ? 'col-span-2' : ''}>
          {(p) => <Input {...p} leftIcon={Search} mono value={values.q ?? ''} onChange={(e) => set('q', e.target.value)} placeholder={schema.textSearch.placeholder} />}
        </Field>
      )}
      {schema.attributes.map((a) => (
        <div key={a.key} className={a.type === 'select' && schema.attributes.length > 3 && a.required ? (columns === 2 ? 'col-span-2' : '') : ''}>
          {renderAttribute(a)}
        </div>
      ))}
      <div className={cn('flex flex-col gap-2', columns === 2 && 'col-span-2')}>
        <Button type="submit" variant="primary" icon={Search} loading={loading} disabled={!canSubmit} className="w-full">
          Buscar
        </Button>
        {error && <p className="text-xs text-danger" role="alert">{error}</p>}
      </div>
    </form>
  );
}
