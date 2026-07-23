import { Check, Settings, Sparkles, Type, X } from 'lucide-react';
import type { HandwritingFont, Settings as WorkspaceSettings } from '../types';

interface EditorSettingsModalProps {
  settings: WorkspaceSettings;
  isOpen: boolean;
  onClose: () => void;
  onUpdateSettings: (settings: WorkspaceSettings) => void;
}

const fontOptions: Array<{ id: HandwritingFont; label: string; preview: string }> = [
  { id: 'chalkboard', label: 'Chalkboard', preview: 'Handwritten feel' },
  { id: 'noteworthy', label: 'Noteworthy', preview: 'Casual pen' },
  { id: 'bradley-hand', label: 'Bradley Hand', preview: 'Script style' },
];

export function EditorSettingsModal({
  settings,
  isOpen,
  onClose,
  onUpdateSettings,
}: EditorSettingsModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="editor-settings-overlay"
      onClick={onClose}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className="editor-settings-modal tinted-glass"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="editor-settings-header">
          <div className="editor-settings-title">
            <Settings size={18} />
            <span>Editor & Drawing Preferences</span>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close settings">
            <X size={16} />
          </button>
        </div>

        <div className="editor-settings-body">
          {/* Shape Auto-Correction Toggle */}
          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-label">
                <Sparkles size={15} /> Shape Auto-Correction
              </span>
              <span className="setting-description">
                Automatically convert hand-drawn lines, arrows, circles, and rectangles into clean shapes.
              </span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.autoCorrectShapes ?? true}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, autoCorrectShapes: e.target.checked })
                }
              />
              <span className="slider" />
            </label>
          </div>

          {/* Pressure Sensitivity */}
          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-label">Pressure Width Sensitivity</span>
              <span className="setting-description">
                Vary stroke thickness based on stylus pressure.
              </span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.pressureWidth}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, pressureWidth: e.target.checked })
                }
              />
              <span className="slider" />
            </label>
          </div>

          {/* Default Font Selection */}
          <div className="setting-section">
            <span className="setting-label">
              <Type size={15} /> Default Font & Handwriting Style
            </span>
            <span className="setting-description">
              Select the font style for text and converted drawings.
            </span>
            <div className="font-options-grid">
              {fontOptions.map((font) => (
                <button
                  key={font.id}
                  className={`font-option-card ${settings.handwritingFont === font.id ? 'active' : ''}`}
                  onClick={() =>
                    onUpdateSettings({ ...settings, handwritingFont: font.id })
                  }
                >
                  <div className="font-card-header">
                    <span>{font.label}</span>
                    {settings.handwritingFont === font.id ? <Check size={14} /> : null}
                  </div>
                  <span className={`font-preview-text font-${font.id}`}>{font.preview}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
