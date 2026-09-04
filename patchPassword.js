const fs = require('fs');
const filepath = 'frontend/src/features/users/UserListPage.jsx';
let code = fs.readFileSync(filepath, 'utf8');

// 1. Update form initial state
const form_old = /const \[form, setForm\] = useState\(\{ name: user\.name, email: user\.email, phone: user\.phone \|\| '' \}\);/;
const form_new = "const [form, setForm] = useState({ name: user.name, email: user.email, phone: user.phone || '', password: '' });";
code = code.replace(form_old, form_new);

// 2. Update payload
const payload_old = /const payload = \{ name: form\.name, email: form\.email, phone: form\.phone, isActive \};/;
const payload_new = `const payload = { name: form.name, email: form.email, phone: form.phone, isActive };
      if (form.password) {
        payload.password = form.password;
      }`;
code = code.replace(payload_old, payload_new);

// 3. Add password input
const input_old = /<div className="flex items-center gap-3">/;
const input_new = `<div>
            <label className="mb-1 block text-sm text-sales-slate-400">Contraseña <span className="text-xs text-sales-slate-500">(Dejar en blanco para no cambiarla)</span></label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Nueva contraseña"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-sales-slate-100 focus:outline-none focus:ring-2 focus:ring-sales-coral/50"
            />
          </div>

          <div className="flex items-center gap-3">`;
code = code.replace(input_old, input_new);

fs.writeFileSync(filepath, code);
console.log('Patched UserListPage UI to include password.');
