import { useState, useEffect } from 'react';
import { get, put } from '../../services/api.js';
import useAuthStore from '../../stores/useAuthStore.js';
import { Panel, Field, Input, Button, Spinner, Eyebrow } from '../../components/ui/index.js';
import { toast } from '../../stores/useToastStore.js';

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
    setSaving(true);
    try {
      const res = await put('/whatsapp/settings', form);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || 'Error al guardar');
      }
      toast.success('Credenciales actualizadas');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={20} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div role="alert" className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger">
          {error}
        </div>
      )}

      <Panel
        eyebrow="Canal"
        title="WhatsApp Business"
        description="Credenciales de Meta Graph API para recibir y enviar mensajes por WhatsApp."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone Number ID" required>
            {(p) => (
              <Input
                {...p}
                mono
                value={form.phoneNumberId}
                onChange={(e) => setForm({ ...form, phoneNumberId: e.target.value })}
                required
                placeholder="Ej. 10293847561"
              />
            )}
          </Field>
          <Field label="Business Account ID">
            {(p) => (
              <Input
                {...p}
                mono
                value={form.businessAccountId}
                onChange={(e) => setForm({ ...form, businessAccountId: e.target.value })}
                placeholder="Ej. 1092837465"
              />
            )}
          </Field>
          <Field label="Access token" hint="Token permanente de la app de Meta." required className="sm:col-span-2">
            {(p) => (
              <Input
                {...p}
                type="password"
                mono
                value={form.accessToken}
                onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
                required
                placeholder="EAAG…"
              />
            )}
          </Field>
        </div>
      </Panel>

      <Panel
        eyebrow="Webhook"
        title="Recepción de mensajes"
        description="Registra esta URL y el token de verificación en la configuración del webhook de Meta."
      >
        <div className="space-y-4">
          <Field label="Verify token" hint="Un secreto que tú defines; Meta lo usará para validar el webhook." required>
            {(p) => (
              <Input
                {...p}
                mono
                value={form.verifyToken}
                onChange={(e) => setForm({ ...form, verifyToken: e.target.value })}
                required
                placeholder="Un token secreto inventado por ti"
              />
            )}
          </Field>

          <div className="rounded-md border border-border bg-surface-2 px-4 py-3">
            <Eyebrow tone="muted" className="mb-1.5 block">Callback URL</Eyebrow>
            <code className="block select-all break-all font-mono text-[13px] text-accent">{webhookUrl}</code>
          </div>
        </div>
      </Panel>

      <div className="flex justify-end">
        <Button type="submit" variant="primary" loading={saving}>
          {saving ? 'Guardando…' : 'Guardar credenciales'}
        </Button>
      </div>
    </form>
  );
}
