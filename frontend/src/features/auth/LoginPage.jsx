import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import useAuthStore from '../../stores/useAuthStore.js';
import { connectSockets, disconnectSockets } from '../../services/socket.js';
import { Logo } from '../../components/Logo.jsx';
import { Button, Field, Input, Eyebrow } from '../../components/ui/index.js';

const BASE_URL = '/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const contentType = res.headers.get('content-type') || '';
      const body = contentType.includes('application/json') ? await res.json().catch(() => ({})) : {};

      if (!res.ok) {
        if (res.status === 502 || res.status === 503 || res.status === 504) {
          throw new Error('El servidor se está reiniciando temporalmente. Por favor, intenta de nuevo en unos segundos.');
        }
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

  async function handleForgotSubmit(e) {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const contentType = res.headers.get('content-type') || '';
      const body = contentType.includes('application/json') ? await res.json().catch(() => ({})) : {};
      if (!res.ok) {
        if (res.status === 502 || res.status === 503 || res.status === 504) {
          throw new Error('El servidor se está reiniciando temporalmente. Por favor, intenta de nuevo en unos segundos.');
        }
        throw new Error(body.error?.message || 'No se pudo procesar la solicitud');
      }

      setInfoMessage(
        body.data?.message ||
          'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.'
      );
    } catch (err) {
      setError(err.message);
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
          <h1 className="text-base font-semibold text-fg">
            {forgotMode ? 'Recuperar contraseña' : 'Inicia sesión'}
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            {forgotMode
              ? 'Ingresa tu correo para enviarte un enlace de restablecimiento.'
              : 'Usa la cuenta que te asignó tu administrador.'}
          </p>

          {error && (
            <div role="alert" className="mt-5 flex items-start gap-2.5 rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger">
              <AlertCircle size={16} className="mt-px shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          )}

          {infoMessage && (
            <div role="status" className="mt-5 flex items-start gap-2.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-400">
              <CheckCircle2 size={16} className="mt-px shrink-0" aria-hidden />
              <span>{infoMessage}</span>
            </div>
          )}

          {forgotMode ? (
            <form onSubmit={handleForgotSubmit} className="mt-5 space-y-4">
              <Field label="Correo electrónico" htmlFor="forgot-email">
                <Input
                  id="forgot-email"
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

              <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full mt-2">
                {loading ? 'Enviando…' : 'Enviar enlace de recuperación'}
              </Button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setForgotMode(false);
                    setError('');
                    setInfoMessage('');
                  }}
                  className="text-xs text-fg-muted hover:text-fg"
                >
                  Volver a iniciar sesión
                </button>
              </div>
            </form>
          ) : (
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

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setForgotMode(true);
                    setError('');
                    setInfoMessage('');
                  }}
                  className="text-xs text-accent hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full mt-1">
                {loading ? 'Entrando…' : 'Entrar'}
              </Button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-fg-subtle">
          Conexión segura · Los mensajes se envían por WhatsApp Business
        </p>
      </div>
    </div>
  );
}
