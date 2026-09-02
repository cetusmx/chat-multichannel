const fs = require('fs');
const filepath = 'frontend/src/features/users/UserListPage.jsx';
let code = fs.readFileSync(filepath, 'utf8');

const submit_old = /async function handleSubmit\(e\) \{[\s\S]*?\}\s*return \(\s*<div className="fixed inset-0/;

const submit_new = `async function handleDeactivate() {
    if (!window.confirm('¿Estás seguro de que deseas borrar (desactivar) a este usuario?')) return;
    setError('');
    setLoading(true);
    try {
      const payload = { name: form.name, email: form.email, phone: form.phone, isActive: false };
      if (user.role !== 'ADMIN') {
        payload.groupIds = groupIds;
      }
      const res = await put(\`/users/\${user.id}\`, payload);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || 'Error al borrar');
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { name: form.name, email: form.email, phone: form.phone, isActive };
      if (user.role !== 'ADMIN') {
        payload.groupIds = groupIds;
      }
      const res = await put(\`/users/\${user.id}\`, payload);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || 'Error al actualizar');
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
    <div className="fixed inset-0`;

if (submit_old.test(code)) {
    code = code.replace(submit_old, submit_new);
} else {
    console.log('Could not find match for handleDeactivate addition.');
}

const buttons_old = /<div className="flex gap-3 pt-2">\s*<button\s*type="submit"\s*disabled=\{loading\}[\s\S]*?Cancelar\s*<\/button>\s*<\/div>/;

const buttons_new = `<div className="flex gap-3 pt-2 w-full">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-sales-orange px-6 py-2 text-sm font-medium text-white hover:bg-sales-orange-light transition-colors disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 px-6 py-2 text-sm text-sales-slate-400 hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            {isActive && (
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={loading}
                className="ml-auto rounded-lg border border-red-500/30 px-6 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                Borrar
              </button>
            )}
          </div>`;

if (buttons_old.test(code)) {
    code = code.replace(buttons_old, buttons_new);
} else {
    console.log('Could not find match for buttons addition.');
}

fs.writeFileSync(filepath, code);
console.log('Patched UserListPage UI.');
