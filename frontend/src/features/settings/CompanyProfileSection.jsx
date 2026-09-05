import { useState, useEffect, useRef } from 'react';
import { get, put, postFormData } from '../../services/api.js';

const DAYS_MAP = [
  { id: 'monday', name: 'Lunes' },
  { id: 'tuesday', name: 'Martes' },
  { id: 'wednesday', name: 'Miercoles' },
  { id: 'thursday', name: 'Jueves' },
  { id: 'friday', name: 'Viernes' },
  { id: 'saturday', name: 'Sabado' },
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

export default function CompanyProfileSection() {
  const [profile, setProfile] = useState(null);
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
  const [saved, setSaved] = useState(false);
  
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
          [field]: value
        }
      }
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
      
      const formData = new FormData();
      formData.append('logo', file);
      
      const res = await postFormData('/tenant/profile/logo', formData);
      const data = await res.json();
      
      setForm(prev => ({ ...prev, logoUrl: data.data.logoUrl }));
      setSaved(true);
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
    setSaved(false);
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
          clabe: form.clabe
        },
        theme: {
          primary: form.primaryColor,
          secondary: form.secondaryColor,
          tertiary: form.tertiaryColor,
          background: form.backgroundColor
        },
        businessHours: {
          timezone: form.bhTimezone,
          schedule: form.schedule
        }
      };
      await put('/tenant/profile', payload);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-sales-slate-400">Cargando...</p>;

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold text-sales-slate-100">Perfil de la Empresa</h3>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {saved && (
        <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-400">
          Perfil actualizado correctamente
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm text-sales-slate-400">Nombre de la empresa</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-sales-slate-100 focus:outline-none focus:ring-2 focus:ring-sales-coral/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-sales-slate-400">Dominio</label>
            <input
              value={form.domain}
              onChange={(e) => setForm({ ...form, domain: e.target.value })}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-sales-slate-100 focus:outline-none focus:ring-2 focus:ring-sales-coral/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-sales-slate-400">RFC</label>
            <input
              value={form.rfc}
              onChange={(e) => setForm({ ...form, rfc: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-sales-slate-100 focus:outline-none focus:ring-2 focus:ring-sales-coral/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-sales-slate-400">Teléfono</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-sales-slate-100 focus:outline-none focus:ring-2 focus:ring-sales-coral/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-sales-slate-400">Email de contacto</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-sales-slate-100 focus:outline-none focus:ring-2 focus:ring-sales-coral/50"
            />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-sm text-sales-slate-400">Dirección</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-sales-slate-100 focus:outline-none focus:ring-2 focus:ring-sales-coral/50"
            />
          </div>
          </div>

          <div className="mt-8">
            <div className="flex flex-col border-t border-slate-700 pt-6">
              <h4 className="mb-4 text-lg font-semibold text-sales-slate-100">Datos bancarios</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
            <label className="mb-1 block text-sm text-sales-slate-400">Banco</label>
            <input
              value={form.bank}
              onChange={(e) => setForm({ ...form, bank: e.target.value })}
              placeholder="Ej. BBVA"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-sales-slate-100 focus:outline-none focus:ring-2 focus:ring-sales-coral/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-sales-slate-400">Cuenta</label>
            <input
              value={form.account}
              onChange={(e) => setForm({ ...form, account: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-sales-slate-100 focus:outline-none focus:ring-2 focus:ring-sales-coral/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-sales-slate-400">CLABE</label>
            <input
              value={form.clabe}
              onChange={(e) => setForm({ ...form, clabe: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-sales-slate-100 focus:outline-none focus:ring-2 focus:ring-sales-coral/50"
            />
          </div>
              </div>
            </div>
          </div>


          <div className="mt-8">
            <div className="flex flex-col border-t border-slate-700 pt-6">
              <h4 className="mb-4 text-lg font-semibold text-sales-slate-100">Identidad de la empresa</h4>
              {/* Logo Section */}
        <div className="mb-6 bg-sales-slate-800 p-4 rounded-lg border border-slate-700 flex items-center gap-6">
          <div className="w-32 h-20 bg-slate-900 border border-slate-700 flex items-center justify-center rounded-md overflow-hidden shrink-0">
            {form.logoUrl ? (
              <img src={form.logoUrl} alt="Logo Empresa" className="max-w-full max-h-full object-contain" />
            ) : (
              <span className="text-slate-500 text-xs text-center px-2">Sin Logo</span>
            )}
          </div>
          <div>
            <h4 className="text-sm font-medium text-sales-slate-200 mb-1">Logo para Cotizaciones</h4>
            <p className="text-xs text-sales-slate-400 mb-3 max-w-sm">
              Se recomienda PNG con fondo transparente o SVG. Orientación horizontal. Máximo 2MB. (Ideal: 400x150px) para evitar romper el layout del PDF.
            </p>
            <input 
              type="file" 
              accept="image/png, image/jpeg, image/webp, image/svg+xml"
              className="hidden" 
              ref={fileInputRef}
              onChange={handleLogoChange}
            />
            <button
              type="button"
              disabled={uploadingLogo}
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
            >
              {uploadingLogo ? 'Subiendo...' : 'Cambiar Logo'}
            </button>
          </div>
        </div>
              <div className="mt-4">
                {/* Colors Section */}
        <div className="mb-6 bg-sales-slate-800 p-4 rounded-lg border border-slate-700">
          <h4 className="text-sm font-medium text-sales-slate-200 mb-4">Colores Corporativos (Cotización)</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="mb-1 block text-xs text-sales-slate-400">Color Primario (Encabezado)</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.primaryColor} onChange={(e) => setForm({...form, primaryColor: e.target.value})} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0" />
                <span className="text-sm text-sales-slate-300 font-mono">{form.primaryColor}</span>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-sales-slate-400">Color Secundario (Borde Datos)</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.secondaryColor} onChange={(e) => setForm({...form, secondaryColor: e.target.value})} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0" />
                <span className="text-sm text-sales-slate-300 font-mono">{form.secondaryColor}</span>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-sales-slate-400">Color Terciario (Instrucciones)</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.tertiaryColor} onChange={(e) => setForm({...form, tertiaryColor: e.target.value})} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0" />
                <span className="text-sm text-sales-slate-300 font-mono">{form.tertiaryColor}</span>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-sales-slate-400">Fondo Contenedores</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.backgroundColor} onChange={(e) => setForm({...form, backgroundColor: e.target.value})} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0" />
                <span className="text-sm text-sales-slate-300 font-mono">{form.backgroundColor}</span>
              </div>
            </div>
          </div>
        </div>
              </div>
            </div>
          </div>


          <div className="mt-8">
          <div className="flex flex-col border-t border-slate-700 pt-6">
            <h4 className="mb-1 text-lg font-semibold text-sales-slate-100">Horarios de Operación (Business Hours)</h4>
            <p className="mb-6 text-sm text-sales-slate-400">
              Define los horarios laborales. Los relojes del SLA se pausarán fuera de estos horarios y el agente IA enviará notificaciones de Fuera de Horario.
            </p>

            <div className="mb-6 max-w-sm">
              <label className="mb-1 block text-sm font-medium text-sales-slate-300">Zona Horaria de Operación</label>
              <select
                value={form.bhTimezone}
                onChange={(e) => setForm({ ...form, bhTimezone: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-sales-slate-100 focus:outline-none focus:ring-2 focus:ring-sales-cyan-500/50"
              >
                <option value="America/Mexico_City">Ciudad de México / Centro</option>
                <option value="America/Tijuana">Tijuana / Pacífico</option>
                <option value="America/Mazatlan">Mazatlán / Montaña</option>
                <option value="America/Cancun">Cancún / Sureste</option>
                <option value="America/Bogota">Bogotá / Lima / Quito</option>
                <option value="America/Argentina/Buenos_Aires">Buenos Aires</option>
              </select>
            </div>

            <div className="flex flex-col gap-3">
              {DAYS_MAP.map(day => {
                const dayConfig = form.schedule[day.id] || DEFAULT_SCHEDULE[day.id];
                return (
                  <div key={day.id} className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${dayConfig.isOpen ? 'bg-sales-slate-800/80 border-sales-slate-700' : 'bg-sales-slate-900/50 border-sales-slate-800'}`}>
                    <div className="w-32 flex items-center gap-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={dayConfig.isOpen}
                          onChange={(e) => handleDayChange(day.id, 'isOpen', e.target.checked)}
                        />
                        <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sales-cyan-500"></div>
                      </label>
                      <span className={`text-sm font-medium ${dayConfig.isOpen ? 'text-sales-slate-200' : 'text-sales-slate-500'}`}>{day.name}</span>
                    </div>

                    <div className="flex-1 flex items-center gap-3">
                      {dayConfig.isOpen ? (
                        <>
                          <input
                            type="time"
                            value={dayConfig.start}
                            onChange={(e) => handleDayChange(day.id, 'start', e.target.value)}
                            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-sales-slate-100 focus:outline-none focus:ring-1 focus:ring-sales-cyan-500"
                          />
                          <span className="text-sales-slate-500">a</span>
                          <input
                            type="time"
                            value={dayConfig.end}
                            onChange={(e) => handleDayChange(day.id, 'end', e.target.value)}
                            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-sales-slate-100 focus:outline-none focus:ring-1 focus:ring-sales-cyan-500"
                          />
                        </>
                      ) : (
                        <span className="text-sm font-medium text-sales-slate-500/70 italic px-2">Cerrado</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-500 transition-colors shadow-md disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar Configuración Global'}
          </button>
        </div>
      </form>
    </div>
  );
}
