import { useState, useRef, useEffect } from 'react';
import { Palette } from 'lucide-react';

export const PALETTE_COLORS = [
  { id: 'default', label: 'Default', value: '' },
  { id: 'white', label: 'White', value: '#ffffff' },
  { id: 'muted', label: 'Muted', value: '#94a3b8' },
  { id: 'red', label: 'Red', value: '#ff5c5c' },
  { id: 'crimson', label: 'Crimson', value: '#e63946' },
  { id: 'orange', label: 'Orange', value: '#ff8c38' },
  { id: 'gold', label: 'Gold', value: '#ffd166' },
  { id: 'yellow', label: 'Yellow', value: '#fee440' },
  { id: 'mint', label: 'Mint', value: '#2ec4b6' },
  { id: 'sky', label: 'Sky', value: '#3a86ff' },
  { id: 'indigo', label: 'Indigo', value: '#4361ee' },
  { id: 'purple', label: 'Purple', value: '#8a2be2' },
  { id: 'pink', label: 'Pink', value: '#ff70a6' },
  { id: 'magenta', label: 'Magenta', value: '#f72585' },
];

interface ColorPaletteProps {
  onColorSelect: (color: string | null) => void;
  disabled?: boolean;
  iconSize?: number;
}

export function ColorPalette({ onColorSelect, disabled, iconSize = 14 }: ColorPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener('pointerdown', handleOutsideClick);
    return () => window.removeEventListener('pointerdown', handleOutsideClick);
  }, [isOpen]);

  return (
    <div className="color-palette-container" ref={containerRef}>
      <button
        type="button"
        className={isOpen ? 'active' : ''}
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Color palette"
        title="Text Color"
      >
        <Palette size={iconSize} />
      </button>
      {isOpen ? (
        <div className="text-color-palette tinted-glass">
          <div className="swatch-grid">
            {PALETTE_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                className="swatch-item"
                style={{ backgroundColor: c.value || '#e2e8f0' }}
                title={c.label}
                onClick={() => {
                  onColorSelect(c.value || null);
                  setIsOpen(false);
                }}
              />
            ))}
          </div>
          <label className="custom-color-row">
            <span>Custom</span>
            <input
              type="color"
              onChange={(event) => {
                onColorSelect(event.target.value);
                setIsOpen(false);
              }}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
