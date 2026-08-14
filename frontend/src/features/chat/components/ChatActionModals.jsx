import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ConfirmModal from '../../../components/ConfirmModal';

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
  const modalRef = React.useRef(null);

  // Clean form state when modal closes
  useEffect(() => {
    if (!activeModal) {
      setReason('');
      setNote('');
      setTimebombHours(24);
      setScheduledAt('');
    }
  }, [activeModal]);

  // Set smart default for scheduledAt when modal opens
  useEffect(() => {
    if (activeModal === 'SCHEDULED') {
      const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
      setScheduledAt(new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    }
  }, [activeModal]);

  // Accessibility: Escape key and click-outside
  useEffect(() => {
    if (!activeModal) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isPatching) onClose();
    };

    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        // Prevent closing if we are patching to avoid interrupting requests
        if (!isPatching) onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeModal, onClose, isPatching]);

  if (!activeModal) return null;

  if (activeModal === 'DISCARDED') {
    return (
      <ConfirmModal
        open={true}
        title="Descartar Conversación"
        message={
          <div>
            {apiError && <div className="text-red-500 mb-2 font-medium">{apiError}</div>}
            ¿Estás seguro de marcar este chat como spam? Esto no afectará tus métricas.
          </div>
        }
        confirmText="Descartar"
        confirmVariant="danger"
        onConfirm={() => onSubmit({ status: 'DISCARDED' })}
        onCancel={onClose}
        disabled={isPatching}
      />
    );
  }

  const handleHoldSubmit = (e) => {
    e.preventDefault();
    if (Number(timebombHours) % 1 !== 0) {
      alert("Las horas límite deben ser un número entero.");
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
    if (!scheduledAt) return;
    const selectedDate = new Date(scheduledAt);
    if (isNaN(selectedDate.getTime())) {
      alert('Fecha inválida.');
      return;
    }
    if (selectedDate.getTime() < Date.now() + 15 * 60000) {
      alert('La fecha programada debe ser al menos 15 minutos en el futuro.');
      return;
    }
    if (selectedDate.getTime() > Date.now() + 30 * 24 * 60 * 60000) {
      alert('La fecha programada no puede exceder los 30 días.');
      return;
    }

    onSubmit({
      status: 'SCHEDULED',
      scheduledAt: new Date(scheduledAt).toISOString(),
    });
  };

  const modalContent = (
    <div className="fixed inset-0 bg-sales-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div ref={modalRef} className="bg-sales-slate-900 border border-sales-slate-800 rounded-lg shadow-2xl w-full max-w-md overflow-hidden">

        {activeModal === 'ON_HOLD' && (
          <form onSubmit={handleHoldSubmit} className="flex flex-col">
            <div className="p-4 border-b border-sales-slate-800">
              <h3 className="text-lg font-bold text-white">Poner en Espera</h3>
            </div>
            {apiError && (
              <div className="mx-4 mt-4 p-3 bg-red-900/50 border border-red-500/50 rounded text-red-200 text-sm">
                {apiError}
              </div>
            )}
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-sales-slate-300 mb-1">Razón</label>
                <select
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-sales-slate-800 border border-sales-slate-700 rounded p-2 text-white focus:border-sales-cyan-500 focus:outline-none"
                  disabled={isPatching}
                >
                  <option value="" disabled>Seleccione una razón...</option>
                  <option value="Esperando proveedor logístico">Esperando proveedor logístico</option>
                  <option value="Falla técnica / Soporte">Falla técnica / Soporte</option>
                  <option value="Validación de pago">Validación de pago</option>
                  <option value="Esperando aprobación interna">Esperando aprobación interna</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-sales-slate-300 mb-1">Nota Explicativa</label>
                <textarea
                  required
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-sales-slate-800 border border-sales-slate-700 rounded p-2 text-white focus:border-sales-cyan-500 focus:outline-none"
                  rows={3}
                  disabled={isPatching}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-sales-slate-300 mb-1">Horas límite (Max 168)</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="168"
                  required
                  value={timebombHours}
                  onChange={(e) => setTimebombHours(e.target.value)}
                  className="w-full bg-sales-slate-800 border border-sales-slate-700 rounded p-2 text-white focus:border-sales-cyan-500 focus:outline-none"
                  disabled={isPatching}
                />
              </div>
            </div>
            <div className="p-4 border-t border-sales-slate-800 flex justify-end gap-3 bg-sales-slate-800/50">
              <button type="button" onClick={onClose} disabled={isPatching} className="px-4 py-2 rounded text-sales-slate-300 hover:text-white font-medium">Cancelar</button>
              <button type="submit" disabled={isPatching} className="px-4 py-2 rounded bg-sales-cyan-600 hover:bg-sales-cyan-500 text-white font-medium flex items-center gap-2">
                {isPatching && <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>}
                Confirmar Espera
              </button>
            </div>
          </form>
        )}

        {activeModal === 'SCHEDULED' && (
          <form onSubmit={handleScheduledSubmit} className="flex flex-col">
            <div className="p-4 border-b border-sales-slate-800">
              <h3 className="text-lg font-bold text-white">Programar Seguimiento</h3>
            </div>
            {apiError && (
              <div className="mx-4 mt-4 p-3 bg-red-900/50 border border-red-500/50 rounded text-red-200 text-sm">
                {apiError}
              </div>
            )}
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-sales-slate-300 mb-1">Fecha y Hora</label>
                <input
                  type="datetime-local"
                  required
                  min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000 + 15 * 60000).toISOString().slice(0, 16)}
                  max={new Date(Date.now() - new Date().getTimezoneOffset() * 60000 + 30 * 24 * 60 * 60000).toISOString().slice(0, 16)}
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full bg-sales-slate-800 border border-sales-slate-700 rounded p-2 text-white focus:border-sales-cyan-500 focus:outline-none [color-scheme:dark]"
                  disabled={isPatching}
                />
              </div>
            </div>
            <div className="p-4 border-t border-sales-slate-800 flex justify-end gap-3 bg-sales-slate-800/50">
              <button type="button" onClick={onClose} disabled={isPatching} className="px-4 py-2 rounded text-sales-slate-300 hover:text-white font-medium">Cancelar</button>
              <button type="submit" disabled={isPatching} className="px-4 py-2 rounded bg-sales-cyan-600 hover:bg-sales-cyan-500 text-white font-medium flex items-center gap-2">
                {isPatching && <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>}
                Programar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
