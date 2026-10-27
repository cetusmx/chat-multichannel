import { useState, useEffect } from 'react';
import { get, put } from '../../services/api';
import { Panel, Field, Input, Switch, Button, Badge, Spinner } from '../../components/ui/index.js';
import { toast } from '../../stores/useToastStore.js';

export default function EmailConfigSection() {
  const [config, setConfig] = useState({
    host: '',
    port: 465,
    secure: true,
    user: '',
    password: '',
    fromName: '',
    fromEmail: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await get('/tenant/email-config');
      if (res.data?.isConfigured) {
        setConfig({
          host: res.data.host || '',
          port: res.data.port || 465,
          secure: res.data.secure !== false,
          user: res.data.user || '',
          password: res.data.password || '',
          fromName: res.data.fromName || '',
          fromEmail: res.data.fromEmail || '',
        });
        setIsConfigured(true);
      }
    } catch (err) {
      console.error('Error fetching email config:', err);
      setError('Error al cargar la configuración de correo');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      await put('/tenant/email-config', config);
      toast.success('Configuración de correo guardada');
      setIsConfigured(true);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al guardar configuración');
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
      eyebrow="Canal"
      title="Correo saliente"
      description="Servidor SMTP que se usa para enviar cotizaciones a los clientes."
      actions={
        isConfigured
          ? <Badge tone="success" dot>Configurado</Badge>
          : <Badge tone="warning" dot>Sin configurar</Badge>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div role="alert" className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Servidor" required>
            {(p) => (
              <Input
                {...p}
                type="text"
                mono
                required
                placeholder="smtp.gmail.com"
                value={config.host}
                onChange={e => setConfig({ ...config, host: e.target.value })}
              />
            )}
          </Field>
          <Field label="Puerto" required>
            {(p) => (
              <Input
                {...p}
                type="number"
                mono
                required
                value={config.port}
                onChange={e => setConfig({ ...config, port: parseInt(e.target.value) })}
              />
            )}
          </Field>
          <Field label="Usuario" hint="Normalmente la dirección de correo." required>
            {(p) => (
              <Input
                {...p}
                type="text"
                required
                value={config.user}
                onChange={e => setConfig({ ...config, user: e.target.value })}
              />
            )}
          </Field>
          <Field label="Contraseña" required>
            {(p) => (
              <Input
                {...p}
                type="password"
                mono
                required
                value={config.password}
                onChange={e => setConfig({ ...config, password: e.target.value })}
              />
            )}
          </Field>
          <Field label="Nombre del remitente" hint="Opcional">
            {(p) => (
              <Input
                {...p}
                type="text"
                placeholder="Ej. Ventas Empresa"
                value={config.fromName}
                onChange={e => setConfig({ ...config, fromName: e.target.value })}
              />
            )}
          </Field>
          <Field label="Correo del remitente" hint="Opcional">
            {(p) => (
              <Input
                {...p}
                type="email"
                value={config.fromEmail}
                onChange={e => setConfig({ ...config, fromEmail: e.target.value })}
              />
            )}
          </Field>
        </div>

        <Switch
          checked={config.secure}
          onChange={(checked) => setConfig({ ...config, secure: checked })}
          label="Usar conexión segura (SSL/TLS)"
        />

        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={saving}>
            {saving ? 'Guardando…' : 'Guardar configuración'}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
