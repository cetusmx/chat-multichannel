import Modal from './ui/Modal.jsx';
import Button from './ui/Button.jsx';

/**
 * Confirmation dialog. `confirmVariant` is 'danger' (default) or 'primary'.
 */
export default function ConfirmModal({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Eliminar',
  cancelText = 'Cancelar',
  confirmVariant = 'danger',
  loading = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            {cancelText}
          </Button>
          <Button variant={confirmVariant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading} data-autofocus>
            {confirmText}
          </Button>
        </>
      }
    >
      {message && <p className="text-sm text-fg-muted leading-relaxed">{message}</p>}
    </Modal>
  );
}
