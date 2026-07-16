import { useState, useEffect } from 'react';
import { getAiConfig, updateAiConfig } from '../../services/api.js';

/**
 * @component AiConfigSection
 * @description Provides a UI for admins to configure the AI provider settings and credentials.
 * Handles fetching current configuration status and securely updating the API key.
 */
export default function AiConfigSection() {
  const [provider, setProvider] = useState('gemini');
  const [apiKey, setApiKey] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function fetchConfig() {
      try {
        const data = await getAiConfig();
        if (data.isConfigured) {
          setIsConfigured(true);
          setProvider(data.provider);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!apiKey || !apiKey.trim()) {
      setError('API Key is required');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const result = await updateAiConfig({ provider, apiKey });
      setIsConfigured(true);
      setProvider(result.provider || provider);
      setApiKey(''); // Clear for security
      setSuccess('AI Configuration saved successfully');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-sales-slate-400">Loading AI configuration...</div>;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="mb-4 text-lg font-medium text-sales-slate-100">Configuración de Inteligencia Artificial</h2>
      
      <div className="mb-6 rounded-lg bg-slate-800/50 p-4">
        <p className="text-sm text-sales-slate-300">
          Estado: {isConfigured ? (
            <span className="font-semibold text-emerald-400">Configurado ({provider})</span>
          ) : (
            <span className="font-semibold text-amber-400">No Configurado</span>
          )}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
        {error && (
          <div className="rounded-lg bg-red-900/50 p-3 text-sm text-red-400 border border-red-900/50">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-emerald-900/50 p-3 text-sm text-emerald-400 border border-emerald-900/50">
            {success}
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-sales-slate-300">
            Proveedor de IA
          </label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sales-slate-100 focus:border-sales-coral focus:outline-none"
          >
            <option value="gemini">Google Gemini</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-sales-slate-300">
            API Key {isConfigured && '(Sobrescribirá la actual)'}
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={isConfigured ? '••••••••••••••••••••••••' : 'Ingresa la API Key'}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sales-slate-100 focus:border-sales-coral focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={saving || !apiKey}
          className="rounded-lg bg-sales-coral px-4 py-2 font-medium text-white transition-colors hover:bg-sales-coral/90 disabled:opacity-50"
        >
          {saving ? 'Validando y Guardando...' : 'Guardar Configuración'}
        </button>
      </form>
    </div>
  );
}
