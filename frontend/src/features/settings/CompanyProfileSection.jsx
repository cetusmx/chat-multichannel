import { useState, useEffect, useRef } from 'react';
import { ImageIcon, Upload } from 'lucide-react';
import { get, put, postFormData } from '../../services/api.js';
import { Panel, Field, Input, Textarea, Select, Switch, Button, Spinner } from '../../components/ui/index.js';
import { toast } from '../../stores/useToastStore.js';
import { cn } from '../../utils/cn.js';

const DAYS_MAP = [
  { id: 'monday', name: 'Lunes' },
  { id: 'tuesday', name: 'Martes' },
  { id: 'wednesday', name: 'Miércoles' },
  { id: 'thursday', name: 'Jueves' },
  { id: 'friday', name: 'Viernes' },
  { id: 'saturday', name: 'Sábado' },
  { id: 'sunday', name: 'Domingo' },
];

const DEFAULT_SCHEDULE = {
  monday: { isOpen: true, start: '09:00', end: '18:00' },
  tuesday: { isOpen: true, start: '09:00', end: '18:00' },
  wednesday: { isOpen: true, start: '09:00', end: '18:00' },
  thursday: { isOpen: true, start: '09:00', end: '18:00' },
  friday: { isOpen: true, start: '09:00', end: '18:00' },
  saturday: { isOpen: false, start: '09:00', end: '14:00' },
  sunday: { isOpen: false, start: '09:00', end: '14:00' },
};

const COLOR_FIELDS = [
  { key: 'primaryColor', label: 'Primario', hint: 'Encabezado' },
  { key: 'secondaryColor', label: 'Secundario', hint: 'Borde de datos' },
  { key: 'tertiaryColor', label: 'Terciario', hint: 'Instrucciones' },
  { key: 'backgroundColor', label: 'Fondo', hint: 'Contenedores' },
];

function ErrorAlert({ children }) {
  return (
    <div role="alert" className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger">
      {children}
    </div>
  );
}

export default function CompanyProfileSection() {
  const [, setProfile] = useState(null);
  const [form, setForm] = useState({
    name: '', domain: '', phone: '', email: '', address: '',
    rfc: '', logoUrl: '', bank: '', account: '', clabe: '',
    primaryColor: '#002B59', secondaryColor: '#FF0010', tertiaryColor: '#FF0010', backgroundColor: '#F8FAFC',
    bhTimezone: 'America/Mexico_City',
    schedule: { ...DEFAULT_SCHEDULE },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    get('/tenant/profile').then(async (res) => {
      const data = await res.json();
      setProfile(data.data);
      setForm(prev => ({
        ...prev,
        name: data.data.name || '',
        domain: data.data.domain || '',
        phone: data.data.phone || '',
        email: data.data.email || '',
        address: data.data.address || '',
        rfc: data.data.rfc || '',
        logoUrl: data.data.logoUrl || '',
        bank: data.data.bankDetails?.bank || '',
        account: data.data.bankDetails?.account || '',
        clabe: data.data.bankDetails?.clabe || '',
        primaryColor: data.data.theme?.primary || '#002B59',
        secondaryColor: data.data.theme?.secondary || '#FF0010',
        tertiaryColor: data.data.theme?.tertiary || '#FF0010',
        backgroundColor: data.data.theme?.background || '#F8FAFC',
        bhTimezone: data.data.businessHours?.timezone || 'America/Mexico_City',
        schedule: { ...DEFAULT_SCHEDULE, ...(data.data.businessHours?.schedule || {}) },
      }));
    }).catch(err => {
      console.error(err);
      setError('Error al cargar perfil');
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  const handleDayChange = (dayId, field, value) => {
    setForm(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [dayId]: {
          ...prev.schedule[dayId],
          [field]: value,
        },
      },
    }));
  };

  async function handleLogoChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('El archivo no debe exceder 2MB');
      return;
    }

    try {
      setUploadingLogo(true);
      setError('');

      const formData = new window.FormData();
      formData.append('logo', file);

      const res = await postFormData('/tenant/profile/logo', formData);
      const data = await res.json();

      setForm(prev => ({ ...prev, logoUrl: data.data.logoUrl }));
      toast.success('Logo actualizado');
    } catch (err) {
      setError(err.message || 'Error al subir el logo');
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        domain: form.domain,
        phone: form.phone,
        email: form.email,
        address: form.address,
        rfc: form.rfc,
        bankDetails: {
          bank: form.bank,
          account: form.account,
          clabe: form.clabe,
        },
        theme: {
          primary: form.primaryColor,
          secondary: form.secondaryColor,
          tertiary: form.tertiaryColor,
          background: form.backgroundColor,
        },
        businessHours: {
          timezone: form.bhTimezone,
          schedule: form.schedule,
        },
      };
      await put('/tenant/profile', payload);
      toast.success('Perfil actualizado');
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
      {error && <ErrorAlert>{error}</ErrorAlert>}

      <Panel eyebrow="Empresa" title="Datos generales" description="Identidad fiscal y de contacto que aparece en cotizaciones.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre de la empresa" required>
            {(p) => <Input {...p} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />}
          </Field>
          <Field label="Dominio" required>
            {(p) => <Input {...p} value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} required />}
          </Field>
          <Field label="RFC">
            {(p) => <Input {...p} mono value={form.rfc} onChange={(e) => setForm({ ...form, rfc: e.target.value })} />}
          </Field>
          <Field label="Teléfono">
            {(p) => <Input {...p} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />}
          </Field>
          <Field label="Correo de contacto">
            {(p) => <Input {...p} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}
          </Field>
          <Field label="Dirección" className="sm:col-span-2">
            {(p) => <Textarea {...p} rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />}
          </Field>
        </div>
      </Panel>

      <Panel eyebrow="Pagos" title="Datos bancarios" description="Se incluyen en las cotizaciones y en la respuesta rápida de pago.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Banco">
            {(p) => <Input {...p} value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} placeholder="Ej. BBVA" />}
          </Field>
          <Field label="Cuenta">
            {(p) => <Input {...p} mono value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })} />}
          </Field>
          <Field label="CLABE">
            {(p) => <Input {...p} mono value={form.clabe} onChange={(e) => setForm({ ...form, clabe: e.target.value })} />}
          </Field>
        </div>
      </Panel>

      <Panel eyebrow="Marca" title="Identidad visual" description="Logo y colores que se usan en el PDF de cotización.">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex h-24 w-40 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-surface-2">
            {form.logoUrl ? (
              <img src={form.logoUrl} alt="Logo de la empresa" className="max-h-full max-w-full object-contain" />
            ) : (
              <ImageIcon size={20} className="text-fg-subtle" aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-fg">Logo para cotizaciones</p>
            <p className="mt-1 max-w-md text-[13px] leading-relaxed text-fg-muted">
              PNG con fondo transparente o SVG, orientación horizontal, máximo 2 MB. Ideal 400×150 px.
            </p>
            <input
              type="file"
              accept="image/png, image/jpeg, image/webp, image/svg+xml"
              className="hidden"
              ref={fileInputRef}
              onChange={handleLogoChange}
            />
            <Button
              variant="outline"
              size="sm"
              icon={Upload}
              loading={uploadingLogo}
              onClick={() => fileInputRef.current?.click()}
              className="mt-3"
            >
              {uploadingLogo ? 'Subiendo…' : 'Cambiar logo'}
            </Button>
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-5">
          <p className="mb-3 text-sm font-medium text-fg">Colores corporativos</p>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {COLOR_FIELDS.map(({ key, label, hint }) => (
              <Field key={key} label={label} hint={hint}>
                {(p) => (
                  <div className="flex h-9 items-center gap-2.5 rounded-md border border-border bg-surface-2 px-2">
                    <input
                      {...p}
                      type="color"
                      value={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      aria-label={`Color ${label.toLowerCase()}`}
                      className="h-6 w-6 shrink-0 cursor-pointer rounded-sm border-0 bg-transparent p-0"
                    />
                    <span className="tnum font-mono text-xs uppercase text-fg-muted">{form[key]}</span>
                  </div>
                )}
              </Field>
            ))}
          </div>
        </div>
      </Panel>

      <Panel
        eyebrow="Operación"
        title="Horario de atención"
        description="Fuera de este horario los relojes de SLA se pausan y el asistente avisa al cliente."
      >
        <Field label="Zona horaria" className="mb-5 max-w-sm">
          {(p) => (
            <Select {...p} value={form.bhTimezone} onChange={(e) => setForm({ ...form, bhTimezone: e.target.value })}>
              <option value="America/Mexico_City">Ciudad de México / Centro</option>
              <option value="America/Tijuana">Tijuana / Pacífico</option>
              <option value="America/Mazatlan">Mazatlán / Montaña</option>
              <option value="America/Cancun">Cancún / Sureste</option>
              <option value="America/Bogota">Bogotá / Lima / Quito</option>
              <option value="America/Argentina/Buenos_Aires">Buenos Aires</option>
            </Select>
          )}
        </Field>

        <div className="divide-y divide-border/70 rounded-md border border-border">
          {DAYS_MAP.map(day => {
            const dayConfig = form.schedule[day.id] || DEFAULT_SCHEDULE[day.id];
            return (
              <div key={day.id} className={cn('flex items-center gap-4 px-4 py-3', !dayConfig.isOpen && 'bg-surface-2/40')}>
                <div className="flex w-36 shrink-0 items-center gap-3">
                  <Switch
                    checked={dayConfig.isOpen}
                    onChange={(checked) => handleDayChange(day.id, 'isOpen', checked)}
                    label={day.name}
                  />
                </div>

                <div className="flex flex-1 items-center gap-3">
                  {dayConfig.isOpen ? (
                    <>
                      <Input
                        type="time"
                        size="sm"
                        mono
                        value={dayConfig.start}
                        onChange={(e) => handleDayChange(day.id, 'start', e.target.value)}
                        aria-label={`Apertura ${day.name}`}
                        className="w-28"
                      />
                      <span className="text-xs text-fg-subtle">a</span>
                      <Input
                        type="time"
                        size="sm"
                        mono
                        value={dayConfig.end}
                        onChange={(e) => handleDayChange(day.id, 'end', e.target.value)}
                        aria-label={`Cierre ${day.name}`}
                        className="w-28"
                      />
                    </>
                  ) : (
                    <span className="text-[13px] text-fg-subtle">Cerrado</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="flex justify-end">
        <Button type="submit" variant="primary" loading={saving}>
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  );
}
