import { useState, useEffect } from 'react';
import { get, put } from '../../services/api.js';

const DAYS_MAP = [
  { id: 1, name: 'Lunes' },
  { id: 2, name: 'Martes' },
  { id: 3, name: 'Miércoles' },
  { id: 4, name: 'Jueves' },
  { id: 5, name: 'Viernes' },
  { id: 6, name: 'Sábado' },
  { id: 0, name: 'Domingo' },
];

const DEFAULT_SCHEDULE = {
  1: { isOpen: true, start: '09:00', end: '18:00' },
  2: { isOpen: true, start: '09:00', end: '18:00' },
  3: { isOpen: true, start: '09:00', end: '18:00' },
  4: { isOpen: true, start: '09:00', end: '18:00' },
  5: { isOpen: true, start: '09:00', end: '18:00' },
  6: { isOpen: false, start: '09:00', end: '14:00' },
  0: { isOpen: false, start: '09:00', end: '14:00' },
};

export default function CompanyProfileSection() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    name: '', domain: '', phone: '', email: '', address: '',
    rfc: '', bank: '', account: '', clabe: '',
    bhTimezone: 'America/Mexico_City',
    schedule: { ...DEFAULT_SCHEDULE },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    get('/tenant/profile').then(async (res) => {
      const body = await res.json();
      if (res.ok) {
        setProfile(body.data);

        let initialSchedule = { ...DEFAULT_SCHEDULE };
        let timezone = 'America/Mexico_City';

        // Convert old legacy format to new format if needed
        if (body.data.businessHours) {
          const bh = body.data.businessHours;
          timezone = bh.timezone || timezone;

          if (bh.schedule) {
            initialSchedule = { ...DEFAULT_SCHEDULE, ...bh.schedule };
          } else if (bh.start && bh.end && bh.days) {
            // Legacy conversion
            const legacySched = {};
            [0,1,2,3,4,5,6].forEach(d => {
              const isOpen = bh.days.includes(d);
              legacySched[d] = { isOpen, start: bh.start, end: bh.end };
            });
            initialSchedule = legacySched;
          }
        }

        setForm({
          name: body.data.name || '',
          domain: body.data.domain || '',
          phone: body.data.phone || '',
          email: body.data.email || '',
          address: body.data.address || '',
          rfc: body.data.rfc || '',
          bank: body.data.bankDetails?.bank || '',
          account: body.data.bankDetails?.account || '',
          clabe: body.data.bankDetails?.clabe || '',
          bhTimezone: timezone,
          schedule: initialSchedule,
        });
      } else {
        setError(body.error?.message || 'Error al cargar perfil');
      }
    }).catch(() => setError('Error de conexión'))
      .finally(() => setLoading(false));
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
          clabe: form.clabe,
        },
        businessHours: {
          timezone: form.bhTimezone,
          schedule: form.schedule,
        },
      };
      const res = await put('/tenant/profile', payload);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || 'Error al guardar');
      }
      const body = await res.json();
      setProfile(body.data);
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
      <h3 className="mb-4 text-lg font-semibold text-sales-slate-100">Perfil de la Empresa</h3>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {saved && (
        <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-400">
          Perfil y horarios actualizados correctamente
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
            <h4 className="mb-1 text-lg font-semibold text-sales-slate-100">Horarios de Operación (Business Hours)</h4>
            <p className="mb-6 text-sm text-sales-slate-400">
              Define los horarios laborales. Los relojes del SLA se pausarán fuera de estos horarios y el agente IA enviará notificaciones de "Fuera de Horario".
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
                const dayConfig = form.schedule[day.id];
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
