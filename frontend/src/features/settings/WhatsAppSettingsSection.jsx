import { useState, useEffect } from 'react';
import { get, put } from '../../services/api.js';
import useAuthStore from '../../stores/useAuthStore.js';

/**
 * WhatsAppSettingsSection - Componente para administrar las credenciales de la API de WhatsApp Business
 * 
 * @component
 * @returns {JSX.Element}
 * 
 * @example
 * <WhatsAppSettingsSection />
 */
export default function WhatsAppSettingsSection() {
  const user = useAuthStore((s) => s.user);
  
  const [form, setForm] = useState({
    phoneNumberId: '',
    businessAccountId: '',
    accessToken: '',
    verifyToken: '',
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  
  // URL base, en producción será api.chat.sealmarket.net o equivalente
  const webhookUrl = `${window.location.origin}/api/whatsapp/webhook/${user?.tenantId}`;

  useEffect(() => {
    get('/whatsapp/settings')
      .then(async (res) => {
        const body = await res.json();
        if (res.ok && body.data) {
          setForm({
            phoneNumberId: body.data.phoneNumberId || '',
            businessAccountId: body.data.businessAccountId || '',
            accessToken: body.data.accessToken || '',
            verifyToken: body.data.verifyToken || '',
          });
        }
      })
      .catch(() => setError('Error al cargar configuración de WhatsApp'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      const res = await put('/whatsapp/settings', form);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || 'Error al guardar');
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-sales-slate-400">Cargando...</p>;

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold text-sales-slate-100">WhatsApp Business API</h3>
      <p className="mb-6 text-sm text-sales-slate-400">
        Configura las credenciales de Meta Graph API para habilitar la recepción y envío de mensajes vía WhatsApp.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {saved && (
        <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-400">
          Credenciales actualizadas correctamente
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm text-sales-slate-400">Phone Number ID</label>
            <input
              value={form.phoneNumberId}
              onChange={(e) => setForm({ ...form, phoneNumberId: e.target.value })}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-sales-slate-100 focus:outline-none focus:ring-2 focus:ring-sales-coral/50"
              placeholder="Ej. 10293847561"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-sales-slate-400">Business Account ID</label>
            <input
              value={form.businessAccountId}
              onChange={(e) => setForm({ ...form, businessAccountId: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-sales-slate-100 focus:outline-none focus:ring-2 focus:ring-sales-coral/50"
              placeholder="Ej. 1092837465"
            />
          </div>
          <div className="col-span-1 md:col-span-2">
            <label className="mb-1 block text-sm text-sales-slate-400">Access Token (Permanent)</label>
            <input
              type="password"
              value={form.accessToken}
              onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-sales-slate-100 focus:outline-none focus:ring-2 focus:ring-sales-coral/50"
              placeholder="EAAG..."
            />
          </div>
          <div className="col-span-1 md:col-span-2 border-t border-slate-800 pt-4 mt-2">
            <h4 className="text-sm font-medium text-sales-slate-300 mb-3">Configuración del Webhook</h4>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-sales-slate-400">Verify Token (Personalizado)</label>
                <input
                  value={form.verifyToken}
                  onChange={(e) => setForm({ ...form, verifyToken: e.target.value })}
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-sales-slate-100 focus:outline-none focus:ring-2 focus:ring-sales-coral/50"
                  placeholder="Un token secreto inventado por ti"
                />
              </div>
              
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                <label className="mb-1 block text-xs text-sales-slate-500 uppercase tracking-wider">Callback URL (Copiar a Meta)</label>
                <code className="text-sm text-sales-coral block break-all select-all">
                  {webhookUrl}
                </code>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-sales-orange px-6 py-2 text-sm font-medium text-white hover:bg-sales-orange-light transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar Credenciales'}
          </button>
        </div>
      </form>
    </div>
  );
}
