import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Logo } from '../../components/Logo.jsx';
import { Button, Field, Input, Eyebrow } from '../../components/ui/index.js';

const BASE_URL = '/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('El enlace no contiene un token válido.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
      setError('La contraseña debe tener al menos 8 caracteres, una letra mayúscula, un número y un carácter especial.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const contentType = res.headers.get('content-type') || '';
      const body = contentType.includes('application/json') ? await res.json().catch(() => ({})) : {};
      if (!res.ok) {
        if (res.status === 502 || res.status === 503 || res.status === 504) {
          throw new Error('El servidor se está reiniciando temporalmente. Por favor, intenta de nuevo en unos segundos.');
        }
        throw new Error(body.error?.message || 'El enlace es inválido o ha expirado');
      }

      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 2500);
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
          <h1 className="text-base font-semibold text-fg">Definir nueva contraseña</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Crea una contraseña segura para acceder a tu cuenta.
          </p>

          {done ? (
            <div className="mt-6 text-center space-y-3 py-2">
              <CheckCircle2 className="mx-auto text-emerald-500" size={38} />
              <p className="text-sm font-medium text-fg">Contraseña actualizada exitosamente</p>
              <p className="text-xs text-fg-muted">Redirigiendo al inicio de sesión...</p>
              <Link to="/login" className="inline-block text-xs text-accent hover:underline pt-1">
                Ir a Iniciar sesión
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div role="alert" className="mt-5 flex items-start gap-2.5 rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger">
                  <AlertCircle size={16} className="mt-px shrink-0" aria-hidden />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <Field
                  label="Nueva contraseña"
                  htmlFor="reset-password"
                  hint="Mín. 8 caracteres, 1 mayúscula, 1 número y 1 símbolo"
                >
                  <Input
                    id="reset-password"
                    type="password"
                    size="lg"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                  />
                </Field>

                <Field label="Confirmar contraseña" htmlFor="reset-confirm-password">
                  <Input
                    id="reset-confirm-password"
                    type="password"
                    size="lg"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                  />
                </Field>

                <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full mt-2">
                  {loading ? 'Guardando…' : 'Guardar contraseña'}
                </Button>

                <div className="text-center pt-1">
                  <Link to="/login" className="text-xs text-fg-muted hover:text-fg">
                    Volver al inicio de sesión
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
