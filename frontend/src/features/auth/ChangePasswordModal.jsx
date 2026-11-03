import { useState } from 'react';
import { post } from '../../services/api.js';
import useAuthStore from '../../stores/useAuthStore.js';
import { toast } from '../../stores/useToastStore.js';
import { Button, Field, Input, Modal } from '../../components/ui/index.js';

export default function ChangePasswordModal({ open, onClose, forced = false }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { user, token, refreshToken, setAuth } = useAuthStore();

  function handleClose() {
    if (forced || loading) return;
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    onClose?.();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('La nueva contraseña y su confirmación no coinciden.');
      return;
    }

    if (
      newPassword.length < 8 ||
      !/[A-Z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword) ||
      !/[^A-Za-z0-9]/.test(newPassword)
    ) {
      setError('La contraseña debe tener al menos 8 caracteres, una letra mayúscula, un número y un carácter especial.');
      return;
    }

    setLoading(true);
    try {
      const res = await post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      const contentType = res.headers.get('content-type') || '';
      const body = contentType.includes('application/json') ? await res.json().catch(() => ({})) : {};
      if (!res.ok) {
        if (res.status === 502 || res.status === 503 || res.status === 504) {
          throw new Error('El servidor se está reiniciando temporalmente. Por favor, intenta de nuevo en unos segundos.');
        }
        throw new Error(body.error?.message || 'Error al actualizar la contraseña');
      }

      if (user) {
        setAuth({ ...user, mustChangePassword: false }, token, refreshToken);
      }

      toast.success('Contraseña actualizada exitosamente');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      eyebrow="Seguridad"
      title={forced ? 'Actualización obligatoria de contraseña' : 'Cambiar contraseña'}
      description={
        forced
          ? 'Por seguridad, debes establecer una nueva contraseña antes de continuar usando tu cuenta.'
          : 'Ingresa tu contraseña actual y define tu nueva contraseña.'
      }
      size="md"
      footer={
        <>
          {!forced && (
            <Button variant="ghost" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
          )}
          <Button variant="primary" type="submit" form="change-password-form" loading={loading}>
            Actualizar contraseña
          </Button>
        </>
      }
    >
      {error && (
        <div role="alert" className="mb-4 rounded-md border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
          {error}
        </div>
      )}

      <form id="change-password-form" onSubmit={handleSubmit} className="space-y-4">
        <Field label="Contraseña actual" required>
          {(a) => (
            <Input
              {...a}
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          )}
        </Field>

        <Field
          label="Nueva contraseña"
          hint="Mínimo 8 caracteres, 1 mayúscula, 1 número y 1 carácter especial"
          required
        >
          {(a) => (
            <Input
              {...a}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
          )}
        </Field>

        <Field label="Confirmar nueva contraseña" required>
          {(a) => (
            <Input
              {...a}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}
