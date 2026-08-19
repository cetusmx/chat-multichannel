import { useState, useEffect } from 'react';
import { getSlaConfig, updateSlaConfig } from '../../services/api.js';

export default function SlaConfigSection() {
  const [firstResponseMins, setFirstResponseMins] = useState(15);
  const [resolutionMins, setResolutionMins] = useState(60);
  const [autoCloseInactiveHours, setAutoCloseInactiveHours] = useState(48);
  const [isSlaEnabled, setIsSlaEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
    setSuccess('');
    setSaving(true);

    try {
      await updateSlaConfig({
        firstResponseMins: Number(firstResponseMins),
        resolutionMins: Number(resolutionMins),
        autoCloseInactiveHours: Number(autoCloseInactiveHours),
        isSlaEnabled: Boolean(isSlaEnabled)
      });
      setSuccess('Configuración SLA guardada exitosamente.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Error al guardar la configuración SLA.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-sales-slate-400">Cargando configuración...</div>;
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
      <h2 className="mb-4 text-lg font-medium text-sales-slate-200">
        Configuración de Tiempos de Respuesta (SLA)
      </h2>
      <p className="mb-6 text-sm text-sales-slate-400">
        Define los límites de tiempo aceptables para responder a los clientes.
        Estos valores se usarán para alertas de "vencimiento" y reportes.
      </p>

      {error && (
        <div className="mb-4 rounded bg-red-500/10 p-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded bg-green-500/10 p-3 text-sm text-green-500">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
        <div className="flex items-center gap-3 bg-sales-slate-800 p-4 rounded-md border border-slate-700">
          <input
            id="isSlaEnabled"
            type="checkbox"
            checked={isSlaEnabled}
            onChange={(e) => setIsSlaEnabled(e.target.checked)}
            className="w-4 h-4 text-sales-coral bg-sales-slate-900 border-sales-slate-600 rounded focus:ring-sales-coral focus:ring-2"
          />
          <label htmlFor="isSlaEnabled" className="text-sm font-medium text-sales-slate-200">
            Habilitar flujos avanzados de SLA
            <p className="mt-0.5 text-xs text-sales-slate-400 font-normal">
              Activa los estados complejos (En Espera, Programado, etc.) y las alertas de tiempo de vencimiento.
            </p>
          </label>
        </div>

        <div>
          <label htmlFor="firstResponseMins" className={`mb-2 block text-sm font-medium ${!isSlaEnabled ? 'text-sales-slate-500' : 'text-sales-slate-300'}`}>
            Primer Contacto (minutos)
          </label>
          <input
            id="firstResponseMins"
            type="number"
            min="1"
            disabled={!isSlaEnabled}
            value={firstResponseMins}
            onChange={(e) => setFirstResponseMins(e.target.value)}
            className={`w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 ${!isSlaEnabled ? 'opacity-50 cursor-not-allowed' : 'text-sales-slate-200 focus:border-sales-coral focus:outline-none'}`}
            required={isSlaEnabled}
          />
          <p className="mt-1 text-xs text-sales-slate-400">
            Tiempo máximo esperado para la primera respuesta.
          </p>
        </div>

        <div>
          <label htmlFor="resolutionMins" className={`mb-2 block text-sm font-medium ${!isSlaEnabled ? 'text-sales-slate-500' : 'text-sales-slate-300'}`}>
            Resolución (minutos)
          </label>
          <input
            id="resolutionMins"
            type="number"
            min="1"
            disabled={!isSlaEnabled}
            value={resolutionMins}
            onChange={(e) => setResolutionMins(e.target.value)}
            className={`w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 ${!isSlaEnabled ? 'opacity-50 cursor-not-allowed' : 'text-sales-slate-200 focus:border-sales-coral focus:outline-none'}`}
            required={isSlaEnabled}
          />
          <p className="mt-1 text-xs text-sales-slate-400">
            Tiempo máximo estimado para cerrar la conversación.
          </p>
        </div>

        <div>
          <label htmlFor="autoCloseInactiveHours" className={`mb-2 block text-sm font-medium ${!isSlaEnabled ? 'text-sales-slate-500' : 'text-sales-slate-300'}`}>
            Auto-Cierre por Inactividad (horas)
          </label>
          <input
            id="autoCloseInactiveHours"
            type="number"
            min="1"
            disabled={!isSlaEnabled}
            value={autoCloseInactiveHours}
            onChange={(e) => setAutoCloseInactiveHours(e.target.value)}
            className={`w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 ${!isSlaEnabled ? 'opacity-50 cursor-not-allowed' : 'text-sales-slate-200 focus:border-sales-coral focus:outline-none'}`}
            required={isSlaEnabled}
          />
          <p className="mt-1 text-xs text-sales-slate-400">
            Horas límite para mantener un chat en "Esperando al Cliente" antes de cerrarlo automáticamente.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-sales-coral px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sales-coral/90 disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </form>
    </div>
  );
}
