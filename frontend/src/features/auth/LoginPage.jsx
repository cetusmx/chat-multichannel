import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import useAuthStore from '../../stores/useAuthStore.js';
import { connectSockets, disconnectSockets } from '../../services/socket.js';
import { Logo } from '../../components/Logo.jsx';
import { Button, Field, Input, Eyebrow } from '../../components/ui/index.js';

const BASE_URL = '/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error?.message || 'Error al iniciar sesión');
      }

      const { user, token, refreshToken } = body.data;
      setAuth(user, token, refreshToken);
      connectSockets(token);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
      disconnectSockets();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-grid flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <Logo className="h-9 w-9" />
          <div>
            <div className="text-lg font-semibold tracking-tight text-fg leading-none">SalesFlow</div>
            <Eyebrow tone="muted" className="mt-1.5 block">Bandeja de ventas</Eyebrow>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 shadow-2xl shadow-black/30">
          <h1 className="text-base font-semibold text-fg">Inicia sesión</h1>
          <p className="mt-1 text-sm text-fg-muted">Usa la cuenta que te asignó tu administrador.</p>

          {error && (
            <div role="alert" className="mt-5 flex items-start gap-2.5 rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger">
              <AlertCircle size={16} className="mt-px shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <Field label="Correo electrónico" htmlFor="login-email">
              <Input
                id="login-email"
                type="email"
                size="lg"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
                autoComplete="email"
                required
                autoFocus
              />
            </Field>

            <Field label="Contraseña" htmlFor="login-password">
              <Input
                id="login-password"
                type="password"
                size="lg"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                minLength={6}
              />
            </Field>

            <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full mt-2">
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-fg-subtle">
          Conexión segura · Los mensajes se envían por WhatsApp Business
        </p>
      </div>
    </div>
  );
}
