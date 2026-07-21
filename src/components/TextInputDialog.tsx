import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface TextInputDialogProps {
  title: string;
  label: string;
  initialValue?: string;
  placeholder?: string;
  validate?: (value: string) => string | null;
  onConfirm: (value: string) => void;
  onClose: () => void;
}

export function TextInputDialog({
  title,
  label,
  initialValue = '',
  placeholder,
  validate,
  onConfirm,
  onClose,
}: TextInputDialogProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState('');
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);
  const submit = () => {
    const trimmed = value.trim();
    const message = validate?.(trimmed) ?? (!trimmed ? `${label} is required.` : null);
    if (message) {
      setError(message);
      return;
    }
    onConfirm(trimmed);
    onClose();
  };
  return (
    <div className="overlay-backdrop" onPointerDown={onClose}>
      <section className="text-input-dialog" onPointerDown={(event) => event.stopPropagation()}>
        <header>
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close dialog">
            <X size={17} />
          </button>
        </header>
        <label>
          <span>{label}</span>
          <input
            autoFocus
            value={value}
            placeholder={placeholder}
            onChange={(event) => {
              setValue(event.target.value);
              setError('');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit();
            }}
          />
        </label>
        {error ? <p role="alert">{error}</p> : null}
        <footer>
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={submit}>
            Save
          </button>
        </footer>
      </section>
    </div>
  );
}
