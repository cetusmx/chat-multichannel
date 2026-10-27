import { useState, useEffect } from 'react';
import { getAiConfig, updateAiConfig } from '../../services/api.js';
import { Panel, Field, Input, Select, Switch, Button, Badge, Spinner } from '../../components/ui/index.js';
import { toast } from '../../stores/useToastStore.js';

/**
 * @component AiConfigSection
 * @description Provides a UI for admins to configure the AI provider settings and credentials.
 * Handles fetching current configuration status and securely updating the API key.
 */
export default function AiConfigSection() {
  const [provider, setProvider] = useState('gemini');
  const [apiKey, setApiKey] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchConfig() {
      try {
        const data = await getAiConfig();
        if (data.isConfigured) {
          setIsConfigured(true);
          setProvider(data.provider);
          if (data.isActive !== undefined) setIsActive(data.isActive);
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
      setError('La API key es obligatoria');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateAiConfig({ provider, apiKey, isActive });
      setIsConfigured(true);
      setProvider(provider);
      setApiKey(''); // Clear for security
      toast.success('Configuración del asistente guardada');
    } catch (err) {
      setError(err.message);
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
      eyebrow="Asistente IA"
      title="Proveedor y credenciales"
      description="Conecta el modelo que atiende a los clientes y genera el carrito automático."
      actions={
        isConfigured
          ? <Badge tone="success" dot>Configurado · {provider}</Badge>
          : <Badge tone="warning" dot>Sin configurar</Badge>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div role="alert" className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="flex items-start justify-between gap-6 rounded-md border border-border bg-surface-2/60 px-4 py-3.5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-fg">Asistente activo</p>
            <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">
              Si está inactivo, los chats se escalan al equipo y se oculta el carrito automático para que el vendedor lo arme manualmente.
            </p>
          </div>
          <Switch checked={isActive} onChange={setIsActive} className="mt-0.5 shrink-0" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Proveedor">
            {(p) => (
              <Select {...p} value={provider} onChange={(e) => setProvider(e.target.value)}>
                <option value="gemini">Google Gemini</option>
              </Select>
            )}
          </Field>
          <Field label="API key" hint={isConfigured ? 'Al guardar se sobrescribirá la clave actual.' : undefined}>
            {(p) => (
              <Input
                {...p}
                type="password"
                mono
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={isConfigured ? '••••••••••••••••••••••••' : 'Ingresa la API key'}
              />
            )}
          </Field>
        </div>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={saving} disabled={!apiKey}>
            {saving ? 'Validando y guardando…' : 'Guardar configuración'}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
