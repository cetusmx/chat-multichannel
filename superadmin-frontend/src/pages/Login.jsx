import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, ArrowRight, Loader2, Mail, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Logo } from '../components/ui/Logo';
import { api } from '../services/api';
import useAuthStore from '../store/authStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      const response = await api.post('/api/superadmin/auth/login', { email: email.trim(), password });

      if (response && response.data) {
        setAuth(response.data.token, response.data.admin);
        navigate('/');
      } else {
        throw new Error('Formato de respuesta inválido');
      }
    } catch (err) {
      if (err.status === 429) {
        setError('Demasiados intentos. Por favor, espere un minuto.');
      } else if (err.status === 401 || err.status === 403) {
        setError('Credenciales inválidas o acceso denegado.');
      } else {
        setError(err.message || 'Ocurrió un error al iniciar sesión.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      const res = await api.post('/api/superadmin/auth/forgot-password', { email: email.trim() });
      const msg = res?.data?.message || 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.';
      setInfoMessage(msg);
    } catch (err) {
      setError(err.message || 'No se pudo procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-8 relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-slate-800/30 text-blue-400 mb-6 border border-white/5 shadow-2xl">
            <Logo className="w-14 h-14" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Superadmin Portal</h1>
          <p className="text-slate-400 mt-2 text-sm">
            {forgotMode ? 'Recupera el acceso a tu cuenta' : 'Identifícate para gestionar la plataforma'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
            {error}
          </div>
        )}

        {infoMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-medium">
            {infoMessage}
          </div>
        )}

        {forgotMode ? (
          <form onSubmit={handleForgotSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Correo Electrónico</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  disabled={loading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-700 text-white rounded-xl pl-11 pr-4 py-3.5 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="admin@salesflow.app"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl px-4 py-3.5 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Enviando enlace...
                </>
              ) : (
                'Enviar enlace de recuperación'
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setForgotMode(false);
                setError('');
                setInfoMessage('');
              }}
              className="w-full flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-white transition-colors pt-1"
            >
              <ArrowLeft size={14} />
              Volver a iniciar sesión
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Correo Electrónico</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  disabled={loading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-700 text-white rounded-xl px-4 py-3.5 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="admin@salesflow.app"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-300 ml-1">Contraseña</label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotMode(true);
                    setError('');
                    setInfoMessage('');
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500">
                  <KeyRound size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-700 text-white rounded-xl pl-11 pr-11 py-3.5 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  className="absolute inset-y-0 right-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full relative group bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl px-4 py-3.5 transition-all overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-500 -translate-x-full" />
              <span className="relative flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    Iniciar Sesión
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
