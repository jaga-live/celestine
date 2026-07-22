import { useState } from 'react';
import {
  Copy,
  Download,
  FileText,
  Heart,
  LayoutTemplate,
  Maximize2,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  Trash2,
} from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { Folder, Note } from '../types';

interface EditorHeaderProps {
  note: Note;
  libraryVisible: boolean;
  saveState: 'saved' | 'saving' | 'failed';
  onToggleLibrary: () => void;
  onTitleChange: (title: string) => void;
  onToggleFavorite: () => void;
  onExport: () => void;
  canDelete: boolean;
  onDelete: () => void;
  onOpenSettings: () => void;
  onDuplicate: () => void;
  onSaveTemplate: () => void;
  folders: Folder[];
  onMove: (folderId: string) => void;
}

export function EditorHeader({
  note,
  libraryVisible,
  saveState,
  onToggleLibrary,
  onTitleChange,
  onToggleFavorite,
  onExport,
  canDelete,
  onDelete,
  onOpenSettings,
  onDuplicate,
  onSaveTemplate,
  folders,
  onMove,
}: EditorHeaderProps) {
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  return (
    <header className="editor-header" data-tauri-drag-region>
      <div className="editor-heading" data-tauri-drag-region>
        <button
          className="icon-button"
          onClick={onToggleLibrary}
          aria-label={libraryVisible ? 'Hide library sidebar' : 'Show library sidebar'}
          title={libraryVisible ? 'Hide library sidebar' : 'Show library sidebar'}
        >
          {libraryVisible ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        </button>
        <input
          className="editor-title-input"
          value={note.title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="Untitled note"
        />
      </div>
      <div className="editor-actions">
        <select
          className="note-space-select"
          value={note.folderId}
          onChange={(e) => onMove(e.target.value)}
          aria-label="Move note to space"
          title="Move note to space"
        >
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <button
          className={note.favorite ? 'icon-button active' : 'icon-button'}
          onClick={onToggleFavorite}
          aria-label={note.favorite ? 'Remove from favorites' : 'Add to favorites'}
          title={note.favorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart size={16} fill={note.favorite ? 'currentColor' : 'none'} />
        </button>
        <button
          className="icon-button"
          onClick={onExport}
          aria-label="Export note"
          title="Export note"
        >
          <Download size={16} />
        </button>
        <button
          className="icon-button"
          onClick={() => {
            try {
              getCurrentWindow()
                .toggleMaximize()
                .catch(() => {});
            } catch {
              // Ignore
            }
          }}
          aria-label="Toggle full screen"
          title="Toggle full screen"
        >
          <Maximize2 size={16} />
        </button>
        <div style={{ position: 'relative' }}>
          <button
            className="icon-button"
            onClick={() => setMoreMenuOpen(!moreMenuOpen)}
            aria-label="More options"
            title="More options"
          >
            <MoreHorizontal size={16} />
          </button>
          {moreMenuOpen ? (
            <div
              className="note-context-menu"
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                zIndex: 100,
              }}
            >
              <button
                className="icon-button"
                style={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  padding: '8px',
                  fontSize: '12px',
                }}
                onClick={() => {
                  onDuplicate();
                  setMoreMenuOpen(false);
                }}
              >
                <Copy size={16} style={{ marginRight: '8px' }} /> Duplicate
              </button>
              <button
                className="icon-button"
                style={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  padding: '8px',
                  fontSize: '12px',
                }}
                onClick={() => {
                  onSaveTemplate();
                  setMoreMenuOpen(false);
                }}
              >
                <LayoutTemplate size={16} style={{ marginRight: '8px' }} /> Save as Template
              </button>
              <hr style={{ borderColor: 'var(--border)', margin: '4px 0' }} />
              <button
                className="icon-button destructive"
                style={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  padding: '8px',
                  fontSize: '12px',
                }}
                onClick={() => {
                  onDelete();
                  setMoreMenuOpen(false);
                }}
                disabled={!canDelete}
              >
                <Trash2 size={16} style={{ marginRight: '8px' }} /> Delete Note
              </button>
            </div>
          ) : null}
        </div>
        <button className="icon-button" onClick={onOpenSettings} aria-label="Open settings">
          <Settings2 size={18} />
        </button>
      </div>
    </header>
  );
}
