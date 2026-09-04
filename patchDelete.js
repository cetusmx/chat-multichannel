const fs = require('fs');
const filepath = 'frontend/src/features/users/UserListPage.jsx';
let code = fs.readFileSync(filepath, 'utf8');

// 1. Add Trash2 to imports
code = code.replace(/import \{ Pencil, X \} from 'lucide-react';/, "import { Pencil, X, Trash2 } from 'lucide-react';");

// 2. Add ConfirmDeactivateModal
const confirmModalStr = `function ConfirmDeactivateModal({ user, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleConfirm() {
    setError('');
    setLoading(true);
    try {
      const payload = { isActive: false };
      const res = await put(\`/users/\${user.id}\`, payload);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || 'Error al borrar usuario');
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-sales-slate-100 mb-2">Confirmar Eliminación</h3>
        <p className="text-sm text-sales-slate-400 mb-6">
          ¿Estás seguro de que deseas desactivar (borrar) al usuario <strong>{user.name}</strong>?
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-sales-slate-400 hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-colors disabled:opacity-50"
          >
            {loading ? 'Borrando...' : 'Borrar'}
          </button>
        </div>
      </div>
    </div>
  );
}

`;
code = code.replace(/function EditUserModal\(\{/, confirmModalStr + 'function EditUserModal({');

// 3. Remove handleDeactivate and Borrar button from EditUserModal
code = code.replace(/async function handleDeactivate\(\) \{[\s\S]*?\}\n\n\s*async function handleSubmit/, "async function handleSubmit");
code = code.replace(/\{isActive && \(\s*<button\s*type="button"\s*onClick=\{handleDeactivate\}[\s\S]*?Borrar\s*<\/button>\s*\)\}/, "");

// 4. Add deactivatingUser state to UserListPage
code = code.replace(/const \[editingUser, setEditingUser\] = useState\(null\);/, "const [editingUser, setEditingUser] = useState(null);\n  const [deactivatingUser, setDeactivatingUser] = useState(null);");

// 5. Add Delete button to table actions and ConfirmDeactivateModal render
const actionsOld = /<td className="px-4 py-3 text-right">\s*<button\s*onClick=\{[^}]+\}\s*className="rounded-lg p-1\.5 text-sales-slate-400 hover:bg-slate-700 hover:text-sales-slate-200 transition-colors"\s*title="Editar usuario"\s*>\s*<Pencil size=\{16\} \/>\s*<\/button>\s*<\/td>/;
const actionsNew = `<td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingUser(u)}
                            className="rounded-lg p-1.5 text-sales-slate-400 hover:bg-slate-700 hover:text-sales-slate-200 transition-colors"
                            title="Editar usuario"
                          >
                            <Pencil size={16} />
                          </button>
                          {u.isActive && u.role !== 'ADMIN' && (
                            <button
                              onClick={() => setDeactivatingUser(u)}
                              className="rounded-lg p-1.5 text-sales-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                              title="Borrar usuario"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>`;
code = code.replace(actionsOld, actionsNew);

const renderModalOld = /\{editingUser && \(\s*<EditUserModal/;
const renderModalNew = `{deactivatingUser && (
        <ConfirmDeactivateModal
          user={deactivatingUser}
          onClose={() => setDeactivatingUser(null)}
          onSaved={() => {
            setDeactivatingUser(null);
            loadUsers(meta.page);
            loadTenantProfile();
          }}
        />
      )}
      {editingUser && (
        <EditUserModal`;
code = code.replace(renderModalOld, renderModalNew);

fs.writeFileSync(filepath, code);
console.log('Patched delete UI.');
