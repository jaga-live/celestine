import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmationDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
}: ConfirmationDialogProps) {
  return (
    <div className="overlay-backdrop" onPointerDown={onClose}>
      <section className="confirmation-dialog" onPointerDown={(event) => event.stopPropagation()}>
        <header>
          <span>
            <AlertTriangle size={18} />
          </span>
          <div>
            <h2>{title}</h2>
            <p>{message}</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close confirmation">
            <X size={17} />
          </button>
        </header>
        <footer>
          <button onClick={onClose}>Cancel</button>
          <button
            className="danger"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </footer>
      </section>
    </div>
  );
}
