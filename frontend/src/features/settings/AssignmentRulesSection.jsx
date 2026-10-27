import { useState, useEffect } from 'react';
import { UserX } from 'lucide-react';
import { getAssignmentConfig, updateAssignmentConfig, getUsers } from '../../services/api.js';
import { Panel, Field, Select, Button, Spinner, EmptyState } from '../../components/ui/index.js';
import { toast } from '../../stores/useToastStore.js';
import { cn } from '../../utils/cn.js';

/**
 * AssignmentRulesSection component allows administrators to configure
 * the client assignment strategy (MANUAL vs ROUND_ROBIN) and select
 * the eligible vendors for automatic assignment.
 *
 * @component
 * @returns {JSX.Element} The rendered component
 */
export default function AssignmentRulesSection() {
  const [strategy, setStrategy] = useState('MANUAL');
  const [activeVendorIds, setActiveVendorIds] = useState([]);
  const [vendors, setVendors] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [configRes, usersRes] = await Promise.all([
          getAssignmentConfig(),
          getUsers('role=VENDOR&limit=100'),
        ]);

        if (!configRes.ok || !usersRes.ok) {
          throw new Error('No se pudo cargar la configuración o los usuarios.');
        }

        const configData = await configRes.json();
        const usersData = await usersRes.json();

        if (configData.data) {
          setStrategy(configData.data.strategy);
          setActiveVendorIds((configData.data.activeVendors || []).map(v => v.id));
        }

        if (usersData.data) {
          setVendors(usersData.data);
        }
      } catch (err) {
        setError(err.message);
        setFetchError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const validVendorIds = activeVendorIds.filter(id => (vendors || []).some(v => v.id === id));
      const res = await updateAssignmentConfig({
        strategy,
        activeVendorIds: strategy === 'ROUND_ROBIN' ? validVendorIds : [],
      });
      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error('Error al procesar la respuesta del servidor');
      }

      if (!res.ok) {
        throw new Error(data?.error?.message || 'Error saving assignment configuration');
      }

      setStrategy(data.data.strategy);
      setActiveVendorIds((data.data?.activeVendors || []).map(v => v.id));
      toast.success('Reglas de asignación guardadas');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleVendorToggle = (id) => {
    setActiveVendorIds((prev) =>
      prev.includes(id) ? prev.filter((vId) => vId !== id) : [...prev, id],
    );
  };

  const handleStrategyChange = (e) => {
    setStrategy(e.target.value);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={20} />
      </div>
    );
  }

  const errorAlert = error && (
    <div role="alert" className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger">
      {error}
    </div>
  );

  if (fetchError) {
    return (
      <Panel eyebrow="Equipo" title="Asignación de clientes">
        {errorAlert}
      </Panel>
    );
  }

  return (
    <Panel
      eyebrow="Equipo"
      title="Asignación de clientes"
      description="Define cómo se reparten las conversaciones nuevas entre los vendedores."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {errorAlert}

        <Field
          label="Estrategia"
          hint={
            strategy === 'ROUND_ROBIN'
              ? 'Cada conversación nueva se asigna de forma automática y equitativa.'
              : 'El coordinador asigna manualmente o los vendedores toman los chats.'
          }
          className="max-w-md"
        >
          {(p) => (
            <Select {...p} value={strategy} onChange={handleStrategyChange}>
              <option value="MANUAL">Manual</option>
              <option value="ROUND_ROBIN">Round-robin (automática)</option>
            </Select>
          )}
        </Field>

        {strategy === 'ROUND_ROBIN' && (
          <Field label="Vendedores elegibles" hint="Selecciona quiénes recibirán chats automáticamente.">
            <div className="max-h-64 overflow-y-auto rounded-md border border-border custom-scrollbar">
              {(vendors || []).length === 0 ? (
                <EmptyState compact icon={UserX} title="Sin vendedores" description="Crea usuarios con rol vendedor para habilitar la asignación automática." />
              ) : (
                <ul className="divide-y divide-border/70">
                  {vendors.map((vendor) => {
                    const checked = activeVendorIds.includes(vendor.id);
                    return (
                      <li key={vendor.id}>
                        <label className={cn('flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-surface-2/60', checked && 'bg-surface-2/40')}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleVendorToggle(vendor.id)}
                            className="h-4 w-4 shrink-0 rounded-sm border-border-strong bg-surface-2 accent-accent"
                          />
                          <span className="min-w-0 flex-1 truncate text-fg">{vendor.name}</span>
                          <span className="truncate text-[13px] text-fg-muted">{vendor.email}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Field>
        )}

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            loading={saving}
            disabled={strategy === 'ROUND_ROBIN' && activeVendorIds.length === 0}
          >
            {saving ? 'Guardando…' : 'Guardar reglas'}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
