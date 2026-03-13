import Modal from './Modal';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}
export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger, onConfirm, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      <p className="text-[14px] text-ink-2 mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className={`btn btn-sm ${danger ? 'btn-coral' : 'btn-teal'}`} onClick={() => { onConfirm(); onClose(); }}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
