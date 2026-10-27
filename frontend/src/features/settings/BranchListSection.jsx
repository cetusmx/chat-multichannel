import { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus, Building2 } from 'lucide-react';
import { get, post, put, del } from '../../services/api.js';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import { Panel, Modal, Field, Input, Button, IconButton, EmptyState, Eyebrow, Spinner } from '../../components/ui/index.js';

function ErrorAlert({ children, className = '' }) {
  return (
    <div role="alert" className={`rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger ${className}`}>
      {children}
    </div>
  );
}

function BranchForm({ branch, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: branch?.name || '',
    address: branch?.address || '',
    phone: branch?.phone || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = branch
        ? await put(`/branches/${branch.id}`, form)
        : await post('/branches', form);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || 'Error al guardar');
      }
      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onCancel}
      eyebrow="Sucursal"
      title={branch ? 'Editar sucursal' : 'Nueva sucursal'}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={saving}>Cancelar</Button>
          <Button type="submit" form="branch-form" variant="primary" loading={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </>
      }
    >
      <form id="branch-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorAlert>{error}</ErrorAlert>}
        <Field label="Nombre" required>
          {(p) => <Input {...p} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required data-autofocus />}
        </Field>
        <Field label="Dirección">
          {(p) => <Input {...p} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />}
        </Field>
        <Field label="Teléfono">
          {(p) => <Input {...p} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />}
        </Field>
      </form>
    </Modal>
  );
}

export default function BranchListSection() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  async function loadBranches() {
    setLoading(true);
    setError('');
    try {
      const res = await get('/branches');
      const body = await res.json();
      if (res.ok) {
        setBranches(body.data || []);
      } else {
        setError(body.error?.message || 'Error al cargar');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadBranches(); }, []);

  async function handleDelete(branch) {
    setDeleteError('');
    try {
      const res = await del(`/branches/${branch.id}`);
      if (!res.ok) {
        const body = await res.json();
        setDeleteError(body.error?.message || 'Error al eliminar');
        return;
      }
      setConfirmDelete(null);
      loadBranches();
    } catch {
      setDeleteError('Error de conexión');
    }
  }

  const newButton = (
    <Button variant="primary" size="sm" icon={Plus} onClick={() => { setEditingBranch(null); setShowForm(true); }}>
      Nueva sucursal
    </Button>
  );

  return (
    <Panel
      eyebrow="Organización"
      title="Sucursales"
      description="Ubicaciones físicas a las que pertenecen los grupos de venta."
      actions={newButton}
      padded={false}
    >
      {error && <ErrorAlert className="m-5">{error}</ErrorAlert>}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size={20} />
        </div>
      ) : branches.length === 0 ? (
        <EmptyState
          compact
          icon={Building2}
          title="Sin sucursales"
          description="Crea la primera sucursal para organizar tus grupos de venta."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="border-b border-border px-4 py-2.5 text-left"><Eyebrow tone="muted">Nombre</Eyebrow></th>
                <th className="border-b border-border px-4 py-2.5 text-left"><Eyebrow tone="muted">Dirección</Eyebrow></th>
                <th className="border-b border-border px-4 py-2.5 text-left"><Eyebrow tone="muted">Teléfono</Eyebrow></th>
                <th className="border-b border-border px-4 py-2.5 text-right"><Eyebrow tone="muted">Grupos</Eyebrow></th>
                <th className="border-b border-border px-4 py-2.5"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b.id} className="border-b border-border/70 last:border-0 hover:bg-surface-2/60">
                  <td className="px-4 py-3 font-medium text-fg">{b.name}</td>
                  <td className="px-4 py-3 text-fg-muted">{b.address || '—'}</td>
                  <td className="px-4 py-3 font-mono text-[13px] text-fg-muted">{b.phone || '—'}</td>
                  <td className="tnum px-4 py-3 text-right font-mono text-fg-muted">{b.groupCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <IconButton icon={Pencil} label="Editar sucursal" size="sm" onClick={() => { setEditingBranch(b); setShowForm(true); }} />
                      <IconButton icon={Trash2} label="Eliminar sucursal" size="sm" variant="danger" onClick={() => setConfirmDelete(b)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteError && <ErrorAlert className="m-5">{deleteError}</ErrorAlert>}

      <ConfirmModal
        open={!!confirmDelete}
        title="Eliminar sucursal"
        message={`¿Eliminar la sucursal "${confirmDelete?.name}"? Esta acción no se puede deshacer.`}
        onConfirm={() => handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />

      {showForm && (
        <BranchForm
          branch={editingBranch}
          onSave={() => { setShowForm(false); loadBranches(); }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </Panel>
  );
}
