import { useState, useEffect } from 'react';
import { getSlaConfig, updateSlaConfig } from '../../services/api.js';
import { Panel, Field, Input, Switch, Button, Spinner } from '../../components/ui/index.js';
import { toast } from '../../stores/useToastStore.js';

export default function SlaConfigSection() {
  const [firstResponseMins, setFirstResponseMins] = useState(15);
  const [resolutionMins, setResolutionMins] = useState(60);
  const [autoCloseInactiveHours, setAutoCloseInactiveHours] = useState(48);
  const [isSlaEnabled, setIsSlaEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchConfig() {
      try {
        const config = await getSlaConfig();
        if (config) {
          if (config.firstResponseMins !== undefined) setFirstResponseMins(config.firstResponseMins);
          if (config.resolutionMins !== undefined) setResolutionMins(config.resolutionMins);
          if (config.isSlaEnabled !== undefined) setIsSlaEnabled(config.isSlaEnabled);
          if (config.autoCloseInactiveHours !== undefined) setAutoCloseInactiveHours(config.autoCloseInactiveHours);
        }
      } catch (err) {
        setError(err.message || 'Error al cargar la configuración SLA');
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      await updateSlaConfig({
        firstResponseMins: Number(firstResponseMins),
        resolutionMins: Number(resolutionMins),
        autoCloseInactiveHours: Number(autoCloseInactiveHours),
        isSlaEnabled: Boolean(isSlaEnabled),
      });
      toast.success('Configuración de SLA guardada');
    } catch (err) {
      setError(err.message || 'Error al guardar la configuración SLA.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={20} />
      </div>
    );
  }

  return (
    <Panel
      eyebrow="Operación"
      title="SLA y tiempos de respuesta"
      description="Límites de tiempo para atender a los clientes. Se usan en alertas de vencimiento y reportes."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div role="alert" className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="flex items-start justify-between gap-6 rounded-md border border-border bg-surface-2/60 px-4 py-3.5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-fg">Flujos avanzados de SLA</p>
            <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">
              Activa los estados de seguimiento (en espera, agendado…) y las alertas de tiempo de vencimiento.
            </p>
          </div>
          <Switch checked={isSlaEnabled} onChange={setIsSlaEnabled} className="mt-0.5 shrink-0" />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Primer contacto (minutos)" hint="Tiempo máximo para la primera respuesta." htmlFor="firstResponseMins">
            {(p) => (
              <Input
                {...p}
                type="number"
                min="1"
                mono
                disabled={!isSlaEnabled}
                value={firstResponseMins}
                onChange={(e) => setFirstResponseMins(e.target.value)}
                required={isSlaEnabled}
              />
            )}
          </Field>

          <Field label="Resolución (minutos)" hint="Tiempo máximo estimado para cerrar la conversación." htmlFor="resolutionMins">
            {(p) => (
              <Input
                {...p}
                type="number"
                min="1"
                mono
                disabled={!isSlaEnabled}
                value={resolutionMins}
                onChange={(e) => setResolutionMins(e.target.value)}
                required={isSlaEnabled}
              />
            )}
          </Field>

          <Field
            label="Cierre por inactividad (horas)"
            hint="Horas que un chat permanece esperando al cliente antes de cerrarse solo."
            htmlFor="autoCloseInactiveHours"
          >
            {(p) => (
              <Input
                {...p}
                type="number"
                min="1"
                mono
                disabled={!isSlaEnabled}
                value={autoCloseInactiveHours}
                onChange={(e) => setAutoCloseInactiveHours(e.target.value)}
                required={isSlaEnabled}
              />
            )}
          </Field>
        </div>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={saving}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
