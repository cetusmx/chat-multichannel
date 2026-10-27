import { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import ConfirmModal from '../../../components/ConfirmModal';
import useChatStore from '../../../stores/useChatStore';
import { Modal, Button, Field, Input, Select, Textarea } from '../../../components/ui/index.js';

const HOLD_REASONS = [
  'Esperando proveedor logístico',
  'Falla técnica / Soporte',
  'Validación de pago',
  'Esperando aprobación interna',
];

const toLocalInputValue = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export default function ChatActionModals({
  activeModal,
  onClose,
  onSubmit,
  isPatching,
  apiError,
}) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [timebombHours, setTimebombHours] = useState(24);
  const [scheduledAt, setScheduledAt] = useState('');
  const [formError, setFormError] = useState(null);

  const conversations = useChatStore(state => state.conversations);
  const currentConvId = useChatStore(state => state.currentConversationId);
  const hasCollision = useMemo(() => {
    if (activeModal !== 'SCHEDULED' || !scheduledAt) return false;
    const [year, month, day, hour, minute] = scheduledAt.split(/[-T:]/).map(Number);
    if (isNaN(year) || isNaN(hour)) return false;
    const selectedDate = new Date(year, month - 1, day, hour, minute).getTime();

    return conversations.some(c => {
      if (c.id === currentConvId) return false; // ignore self
      if (c.status !== 'SCHEDULED' || !c.scheduledAt) return false;
      const cTime = new Date(c.scheduledAt).getTime();
      return cTime === selectedDate;
    });
  }, [scheduledAt, activeModal, conversations, currentConvId]);

  // Clean form state when modal closes
  useEffect(() => {
    if (!activeModal) {
      setReason('');
      setNote('');
      setTimebombHours(24);
      setScheduledAt('');
      setFormError(null);
    }
  }, [activeModal]);

  // Set smart default for scheduledAt when modal opens
  useEffect(() => {
    if (activeModal === 'SCHEDULED') {
      const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
      date.setMinutes(0, 0, 0);
      setScheduledAt(toLocalInputValue(date));
    }
  }, [activeModal]);

  // Prevent closing while a request is in flight.
  const handleClose = useCallback(() => {
    if (!isPatching) onClose();
  }, [isPatching, onClose]);

  if (!activeModal) return null;

  const errorBlock = apiError ? (
    <p className="mb-4 text-sm text-danger" role="alert">{apiError}</p>
  ) : null;

  if (activeModal === 'RESOLVE') {
    return (
      <Modal
        open
        onClose={handleClose}
        size="sm"
        eyebrow="Conversación"
        title="Finalizar conversación"
        description="Elige cómo cerrar este chat. El resultado se refleja en tus métricas."
      >
        {errorBlock}
        <div className="flex flex-col gap-2">
          <Button
            variant="success"
            size="lg"
            iconRight={ArrowRight}
            className="w-full justify-between"
            onClick={() => onSubmit({ status: 'CLOSED_WON' })}
            loading={isPatching}
          >
            Cierre con venta
          </Button>
          <Button
            variant="secondary"
            size="lg"
            iconRight={ArrowRight}
            className="w-full justify-between"
            onClick={() => onSubmit({ status: 'CLOSED' })}
            disabled={isPatching}
          >
            Cierre sin venta
          </Button>
        </div>
      </Modal>
    );
  }

  if (activeModal === 'DISCARDED') {
    return (
      <ConfirmModal
        open
        title="Descartar conversación"
        message={
          <>
            {apiError && <span className="mb-2 block text-danger">{apiError}</span>}
            ¿Estás seguro de marcar este chat como spam? Esto no afectará tus métricas.
          </>
        }
        confirmText="Descartar"
        confirmVariant="danger"
        onConfirm={() => onSubmit({ status: 'DISCARDED' })}
        onCancel={handleClose}
        loading={isPatching}
      />
    );
  }

  const handleHoldSubmit = (e) => {
    e.preventDefault();
    setFormError(null);
    if (Number(timebombHours) % 1 !== 0) {
      setFormError('Las horas límite deben ser un número entero.');
      return;
    }
    const hours = parseInt(timebombHours, 10);
    if (!reason || !note.trim() || isNaN(hours) || hours <= 0 || hours > 168) return;

    onSubmit({
      status: 'ON_HOLD',
      reason: `[${reason}] ${note.trim()}`,
      timebombHours: hours,
    });
  };

  const handleScheduledSubmit = (e) => {
    e.preventDefault();
    setFormError(null);
    if (!scheduledAt) return;
    const [year, month, day, hour, minute] = scheduledAt.split(/[-T:]/).map(Number);
    if (minute !== 0) {
      setFormError('Selecciona una hora en punto (ej. 15:00). El sistema evalúa programaciones al inicio de cada hora.');
      return;
    }
    const selectedDate = new Date(year, month - 1, day, hour, minute);
    if (isNaN(selectedDate.getTime())) {
      setFormError('Fecha inválida.');
      return;
    }
    if (selectedDate.getTime() <= Date.now()) {
      setFormError('La fecha programada debe ser en el futuro.');
      return;
    }
    if (selectedDate.getTime() > Date.now() + 30 * 24 * 60 * 60000) {
      setFormError('La fecha programada no puede exceder los 30 días.');
      return;
    }

    onSubmit({
      status: 'SCHEDULED',
      scheduledAt: (() => {
        const [year, month, day, hour, minute] = scheduledAt.split(/[-T:]/).map(Number);
        return new Date(year, month - 1, day, hour, minute).toISOString();
      })(),
    });
  };

  if (activeModal === 'ON_HOLD') {
    return (
      <Modal
        open
        onClose={handleClose}
        eyebrow="Conversación"
        title="Poner en espera"
        description="La conversación se pausará y volverá a tu bandeja al cumplirse el plazo."
        footer={
          <>
            <Button variant="ghost" onClick={handleClose} disabled={isPatching}>Cancelar</Button>
            <Button variant="primary" type="submit" form="on-hold-form" loading={isPatching}>Confirmar espera</Button>
          </>
        }
      >
        {errorBlock}
        <form id="on-hold-form" onSubmit={handleHoldSubmit} className="space-y-4">
          <Field label="Razón" required>
            {(p) => (
              <Select {...p} required value={reason} onChange={(e) => setReason(e.target.value)} disabled={isPatching}>
                <option value="" disabled>Selecciona una razón</option>
                {HOLD_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Nota explicativa" required>
            {(p) => (
              <Textarea
                {...p}
                required
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Qué estamos esperando y de quién"
                disabled={isPatching}
              />
            )}
          </Field>
          <Field label="Horas límite" hint="Máximo 168 horas (7 días)." error={formError} required>
            {(p) => (
              <Input
                {...p}
                type="number"
                step="1"
                min="1"
                max="168"
                required
                mono
                value={timebombHours}
                onChange={(e) => setTimebombHours(e.target.value)}
                disabled={isPatching}
              />
            )}
          </Field>
        </form>
      </Modal>
    );
  }

  if (activeModal === 'SCHEDULED') {
    const minValue = (() => {
      const d = new Date();
      d.setHours(d.getHours() + 1, 0, 0, 0);
      return toLocalInputValue(d);
    })();
    const maxValue = (() => {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      d.setMinutes(0, 0, 0);
      return toLocalInputValue(d);
    })();

    return (
      <Modal
        open
        onClose={handleClose}
        eyebrow="Conversación"
        title="Programar seguimiento"
        description="La conversación volverá a tu bandeja en la fecha y hora indicadas."
        footer={
          <>
            <Button variant="ghost" onClick={handleClose} disabled={isPatching}>Cancelar</Button>
            <Button variant="primary" type="submit" form="scheduled-form" loading={isPatching}>Programar</Button>
          </>
        }
      >
        {errorBlock}
        <form id="scheduled-form" onSubmit={handleScheduledSubmit} className="space-y-4">
          <Field label="Fecha y hora" hint="Solo horas en punto, hasta 30 días adelante." error={formError} required>
            {(p) => (
              <Input
                {...p}
                type="datetime-local"
                required
                step="3600"
                min={minValue}
                max={maxValue}
                mono
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                disabled={isPatching}
              />
            )}
          </Field>
          {hasCollision && (
            <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2.5 text-xs text-warning" role="status">
              <AlertTriangle size={14} className="mt-px shrink-0" aria-hidden />
              <p>Ya tienes otra conversación programada para este mismo día y hora.</p>
            </div>
          )}
        </form>
      </Modal>
    );
  }

  return null;
}
