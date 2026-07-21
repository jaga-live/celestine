import { useState } from 'react';
import {
  Archive,
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
  onArchive: () => void;
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
  onArchive,
  onSaveTemplate,
  folders,
  onMove,
}: EditorHeaderProps) {
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const handleDoubleClick = (event: React.MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('button')) {
      return;
    }

    if ('__TAURI_INTERNALS__' in window || '__TAURI__' in window) {
      void getCurrentWindow().toggleMaximize();
    }
  };

  return (
    <header className="editor-header" data-tauri-drag-region onDoubleClick={handleDoubleClick}>
      <div className="editor-heading">
        <button
          className="icon-button"
          onClick={onToggleLibrary}
          aria-label={libraryVisible ? 'Hide library' : 'Show library'}
        >
          {libraryVisible ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        </button>
      </div>
      <div className="header-actions">
        <select
          className="note-space-select"
          aria-label="Move note to space"
          value={note.folderId}
          onChange={(event) => onMove(event.target.value)}
        >
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.name}
            </option>
          ))}
        </select>
        <span className={`save-status ${saveState}`}>
          <span />
          {saveState === 'saving'
            ? 'Saving'
            : saveState === 'failed'
              ? 'Save failed'
              : 'Saved locally'}
        </span>
        <button
          className={note.favorite ? 'icon-button favorite' : 'icon-button'}
          onClick={onToggleFavorite}
          aria-label="Toggle favorite"
        >
          <Heart size={18} fill={note.favorite ? 'currentColor' : 'none'} />
        </button>
        <button
          className="icon-button"
          onClick={onExport}
          aria-label="Export Markdown"
          title="Export"
        >
          <Download size={18} />
        </button>
        <div style={{ position: 'relative' }}>
          <button
            className={`icon-button ${moreMenuOpen ? 'active' : ''}`}
            onClick={() => setMoreMenuOpen(!moreMenuOpen)}
            aria-label="More options"
          >
            <MoreHorizontal size={18} />
          </button>
          {moreMenuOpen && (
            <div
              className="paper-menu"
              style={{ right: 0, top: '44px', width: '200px', zIndex: 100 }}
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
                  onArchive();
                  setMoreMenuOpen(false);
                }}
              >
                <Archive size={16} style={{ marginRight: '8px' }} />{' '}
                {note.archived ? 'Unarchive' : 'Archive'}
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
          )}
        </div>
        <button className="icon-button" onClick={onOpenSettings} aria-label="Open settings">
          <Settings2 size={18} />
        </button>
      </div>
    </header>
  );
}
