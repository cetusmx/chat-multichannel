import { useState, useEffect } from 'react';
import { get, post } from '../../services/api.js';
import { useNavigate } from 'react-router-dom';
import { ROLE_LABELS } from '../../utils/constants.js';
import { Badge, Button, Field, Input, PageHeader, Panel, Select } from '../../components/ui/index.js';

export default function CreateUserForm({ onSuccess }) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', role: 'VENDOR', groupIds: [],
  });
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [tenantProfile, setTenantProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    get('/groups').then(async (res) => {
      const body = await res.json();
      if (res.ok) setGroups(body.data || []);
    });
    get('/tenant/profile').then(async (res) => {
      const body = await res.json();
      if (res.ok) setTenantProfile(body.data);
    });
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleGroupChange(groupId) {
    setForm((prev) => ({
      ...prev,
      groupIds: groupId ? [groupId] : [],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        name: form.name, email: form.email, phone: form.phone,
        password: form.password, role: form.role,
        groupIds: form.role !== 'ADMIN' ? form.groupIds : undefined,
      };
      const res = await post('/users', payload);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || 'Error creating user');
      }
      onSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const isQuotaExceeded = tenantProfile && tenantProfile.maxUsers !== -1 && tenantProfile.currentUsersCount >= tenantProfile.maxUsers;

  function handleCancel() {
    if (onSuccess) onSuccess();
    else navigate(-1);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Usuarios"
        title="Nuevo usuario"
        description="Crea una cuenta para un miembro de tu equipo."
        actions={
          tenantProfile && tenantProfile.maxUsers !== -1 && (
            <Badge tone={isQuotaExceeded ? 'warning' : 'neutral'}>
              Asientos {tenantProfile.currentUsersCount}/{tenantProfile.maxUsers}
            </Badge>
          )
        }
      />

      <Panel title="Datos de la cuenta" description="Los campos marcados con * son obligatorios.">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-md border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-sm text-danger" role="alert">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" required>
              {(a) => <Input {...a} name="name" value={form.name} onChange={handleChange} required />}
            </Field>
            <Field label="Correo" required>
              {(a) => <Input {...a} name="email" type="email" value={form.email} onChange={handleChange} required />}
            </Field>
            <Field label="Teléfono">
              {(a) => <Input {...a} name="phone" value={form.phone} onChange={handleChange} />}
            </Field>
            <Field label="Contraseña" required hint="Mínimo 6 caracteres">
              {(a) => (
                <Input
                  {...a}
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              )}
            </Field>
            <Field label="Rol" hint={form.role === 'VENDOR' ? 'El coordinador se asigna automáticamente según el grupo seleccionado.' : undefined}>
              {(a) => (
                <Select {...a} name="role" value={form.role} onChange={handleChange}>
                  <option value="ADMIN">{ROLE_LABELS.ADMIN}</option>
                  <option value="COORDINATOR">{ROLE_LABELS.COORDINATOR}</option>
                  <option value="VENDOR">{ROLE_LABELS.VENDOR}</option>
                </Select>
              )}
            </Field>

            {form.role !== 'ADMIN' && (
              <Field label={form.role === 'VENDOR' ? 'Grupo' : 'Grupos'}>
                {(a) =>
                  form.role === 'VENDOR' ? (
                    <Select {...a} value={form.groupIds[0] || ''} onChange={(e) => handleGroupChange(e.target.value)}>
                      <option value="">Seleccionar grupo</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </Select>
                  ) : (
                    <div className="flex min-h-9 flex-wrap items-center gap-2">
                      {groups.length === 0 && <span className="text-[13px] text-fg-subtle">No hay grupos disponibles</span>}
                      {groups.map((g) => (
                        <Button
                          key={g.id}
                          size="sm"
                          variant={form.groupIds.includes(g.id) ? 'chip-accent' : 'chip'}
                          onClick={() => handleGroupChange(g.id)}
                          aria-pressed={form.groupIds.includes(g.id)}
                        >
                          {g.name}
                        </Button>
                      ))}
                    </div>
                  )
                }
              </Field>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border pt-5">
            <Button variant="ghost" onClick={handleCancel}>Cancelar</Button>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              disabled={isQuotaExceeded}
              title={isQuotaExceeded ? 'Límite de asientos alcanzado' : undefined}
            >
              Crear usuario
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
