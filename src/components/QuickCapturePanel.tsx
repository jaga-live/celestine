import {
  AudioLines,
  FilePlus2,
  FileText,
  GitBranch,
  Maximize2,
  Mic2,
  PenLine,
  X,
} from 'lucide-react';
import type { CelestineTemplate } from './HomeDesk';
import type { NoteMode } from '../types';

interface QuickCapturePanelProps {
  onClose: () => void;
  onCreate: (mode: NoteMode, template: CelestineTemplate, quickCapture?: boolean) => void;
  onAudio: () => void;
}

export function QuickCapturePanel({ onClose, onCreate, onAudio }: QuickCapturePanelProps) {
  const actions: Array<{
    label: string;
    hint: string;
    mode: NoteMode;
    template: CelestineTemplate;
    icon: typeof FileText;
  }> = [
    {
      label: 'Quick text',
      hint: 'Capture a thought',
      mode: 'document',
      template: 'thought',
      icon: FilePlus2,
    },
    {
      label: 'Start drawing',
      hint: 'Black canvas, pen ready',
      mode: 'canvas',
      template: 'blank',
      icon: PenLine,
    },
    {
      label: 'Meeting note',
      hint: 'Decisions and actions',
      mode: 'document',
      template: 'meeting',
      icon: Mic2,
    },
    {
      label: 'System design',
      hint: 'Map services and flows',
      mode: 'canvas',
      template: 'system',
      icon: GitBranch,
    },
    {
      label: 'Blank canvas',
      hint: 'Open thinking space',
      mode: 'canvas',
      template: 'blank',
      icon: Maximize2,
    },
  ];
  return (
    <div className="overlay-backdrop" onPointerDown={onClose}>
      <section className="quick-capture-panel" onPointerDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span>Quick capture</span>
            <h2>Begin instantly</h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close quick capture"
            title="Close"
          >
            <X size={18} />
          </button>
        </header>
        <div className="quick-capture-options">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => {
                  onCreate(action.mode, action.template, true);
                  onClose();
                }}
              >
                <Icon size={18} strokeWidth={1.7} />
                <span>
                  <strong>{action.label}</strong>
                  <small>{action.hint}</small>
                </span>
              </button>
            );
          })}
          <button
            onClick={() => {
              onAudio();
              onClose();
            }}
          >
            <AudioLines size={18} />
            <span>
              <strong>Record audio</strong>
              <small>Create a local voice note</small>
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}
