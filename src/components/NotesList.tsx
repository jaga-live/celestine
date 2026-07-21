import { useEffect, useRef, useState } from 'react';
import {
  Archive,
  Check,
  ChevronDown,
  Copy,
  FileText,
  Filter,
  Grid2X2,
  Heart,
  LayoutGrid,
  List,
  Maximize2,
  Mic,
  MoreHorizontal,
  PenLine,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';
import type { Note, NoteMode, Tag } from '../types';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface NotesListProps {
  notes: Note[];
  tags: Tag[];
  activeNoteId: string;
  search: string;
  title: string;
  breadcrumb?: string;
  onSearchChange: (value: string) => void;
  onSelectNote: (id: string) => void;
  onCreateNote: (mode: NoteMode) => void;
  onOpenAudio?: () => void;
  viewMode: 'list' | 'grid';
  sort: 'updated' | 'created' | 'title';
  onViewModeChange: (value: 'list' | 'grid') => void;
  onSortChange: (value: 'updated' | 'created' | 'title') => void;
  onDuplicate: (id: string) => void;
  onArchive: (id: string) => void;
  onTrash: (id: string) => void;
  onRestore: (id: string) => void;
  onDeleteForever: (id: string) => void;
  onDeleteSelected?: (ids: string[]) => void;
  onTrashSelected?: (ids: string[]) => void;
  onEmptyTrash?: () => void;
}

const relativeDate = (timestamp: number) => {
  const elapsed = Date.now() - timestamp;

  if (elapsed < 86_400_000) {
    return 'Today';
  }

  if (elapsed < 172_800_000) {
    return 'Yesterday';
  }

  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(timestamp);
};

export function NotesList({
  notes,
  tags,
  activeNoteId,
  search,
  title,
  breadcrumb,
  onSearchChange,
  onSelectNote,
  onCreateNote,
  onOpenAudio,
  viewMode,
  sort,
  onViewModeChange,
  onSortChange,
  onDuplicate,
  onArchive,
  onTrash,
  onRestore,
  onDeleteForever,
  onDeleteSelected,
  onTrashSelected,
  onEmptyTrash,
}: NotesListProps) {
  const [newNoteMenuOpen, setNewNoteMenuOpen] = useState(false);
  const [noteMenu, setNoteMenu] = useState<string | null>(null);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [sortMenuPlacement, setSortMenuPlacement] = useState<'up' | 'down'>('down');
  const [newNotePlacement, setNewNotePlacement] = useState<'up' | 'down'>('down');
  const [noteMenuPlacement, setNoteMenuPlacement] = useState<{
    vertical: 'up' | 'down';
    horizontal: 'left' | 'right';
  }>({ vertical: 'down', horizontal: 'right' });
  const newNoteControlRef = useRef<HTMLDivElement>(null);
  const isTrash = title === 'Trash';

  const handleTitleBarDoubleClick = (event: React.MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('button, input, select, a')) return;
    if ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)
      void getCurrentWindow().toggleMaximize();
  };

  useEffect(() => {
    setSelectedNoteIds([]);
  }, [title, notes]);

  useEffect(() => {
    if (!newNoteMenuOpen && !noteMenu && !sortMenuOpen) {
      return;
    }

    const closeMenu = (event: PointerEvent) => {
      const target = event.target as Element;
      if (target.closest('.new-note-control, .sort-menu-control, .note-context-menu, .note-more'))
        return;
      setNewNoteMenuOpen(false);
      setNoteMenu(null);
      setSortMenuOpen(false);
    };

    window.addEventListener('pointerdown', closeMenu);

    return () => window.removeEventListener('pointerdown', closeMenu);
  }, [newNoteMenuOpen, noteMenu, sortMenuOpen]);

  const openNoteMenu = (id: string, anchor: HTMLElement) => {
    const rect = anchor.getBoundingClientRect();
    setNoteMenuPlacement({
      vertical: rect.bottom + 170 > window.innerHeight ? 'up' : 'down',
      horizontal: rect.right + 160 > window.innerWidth ? 'left' : 'right',
    });
    setNoteMenu(noteMenu === id ? null : id);
  };

  const toggleSelection = (id: string) => {
    setSelectedNoteIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const notePreview = (note: Note) => {
    if (note.mode === 'document') {
      const documentText = note.pages
        .map((page) => page.html.replace(/<[^>]*>/g, ' '))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      return documentText.slice(0, 72) || 'Blank page';
    }

    const text = note.objects.find((object) => object.type === 'text');

    if (text?.type === 'text') {
      return text.html
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 72);
    }

    const strokeCount = note.objects.filter((object) => object.type === 'stroke').length;

    return strokeCount
      ? `${strokeCount} ink ${strokeCount === 1 ? 'stroke' : 'strokes'}`
      : 'Empty note';
  };

  return (
    <section className="notes-panel app-panel">
      <div
        className="notes-header-stack"
        data-tauri-drag-region
        onDoubleClick={handleTitleBarDoubleClick}
      >
        {breadcrumb ? (
          <div className="notes-breadcrumb-line">
            <span>Projects</span>
            <span className="separator">›</span>
            <span className="current">{breadcrumb.split(' / ').pop()}</span>
          </div>
        ) : null}

        <div className="notes-title-row">
          <div className="notes-title-group">
            <h2>{title}</h2>
            <span className="notes-count-meta">
              {notes.length} {notes.length === 1 ? 'note' : 'notes'}
            </span>
          </div>

          <div className="new-note-control" ref={newNoteControlRef}>
            <button
              className="new-note-button"
              onClick={() => {
                onCreateNote('document');
                setNewNoteMenuOpen(false);
              }}
            >
              <Plus size={15} /> New
            </button>
            <button
              className="new-note-menu-button"
              onClick={() => setNewNoteMenuOpen((open) => !open)}
              aria-label="Choose note type"
            >
              <ChevronDown size={14} />
            </button>
            {newNoteMenuOpen ? (
              <div className="new-note-menu">
                <button
                  onClick={() => {
                    onCreateNote('document');
                    setNewNoteMenuOpen(false);
                  }}
                >
                  <FileText size={16} />
                  <span>
                    <strong>Document</strong>
                    <small>A4 pages for class notes</small>
                  </span>
                </button>
                <button
                  onClick={() => {
                    onCreateNote('canvas');
                    setNewNoteMenuOpen(false);
                  }}
                >
                  <Maximize2 size={16} />
                  <span>
                    <strong>Canvas</strong>
                    <small>Open space for mapping ideas</small>
                  </span>
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="notes-toolbar-row">
          <label className="search-field flex-search">
            <Search size={14} />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search notes..."
            />
            <kbd>⌘K</kbd>
          </label>

          <div className="toolbar-controls-right">
            <div className="sort-menu-control">
              <button
                className="sort-menu-trigger"
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  setSortMenuPlacement(rect.bottom + 150 > window.innerHeight ? 'up' : 'down');
                  setSortMenuOpen((open) => !open);
                }}
                aria-haspopup="menu"
                aria-expanded={sortMenuOpen}
              >
                <span>
                  Sort: {sort === 'updated' ? 'Recent' : sort === 'created' ? 'Created' : 'Title'}
                </span>
                <ChevronDown size={13} />
              </button>
              {sortMenuOpen ? (
                <div
                  className={`sort-menu ${sortMenuPlacement === 'up' ? 'open-up' : ''}`}
                  role="menu"
                >
                  {(
                    [
                      ['updated', 'Recent'],
                      ['created', 'Created'],
                      ['title', 'Title'],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      role="menuitemradio"
                      aria-checked={sort === value}
                      className={sort === value ? 'selected' : ''}
                      onClick={() => {
                        onSortChange(value);
                        setSortMenuOpen(false);
                      }}
                    >
                      <span>{sort === value ? <Check size={14} /> : null}</span>
                      {label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <button className="icon-btn-square" title="Filter notes" aria-label="Filter notes">
              <Filter size={14} />
            </button>

            <div className="view-mode-toggle-group">
              <button
                className={viewMode === 'list' ? 'active' : ''}
                onClick={() => onViewModeChange('list')}
                aria-label="List view"
              >
                <List size={14} />
              </button>
              <button
                className={viewMode === 'grid' ? 'active' : ''}
                onClick={() => onViewModeChange('grid')}
                aria-label="Grid view"
              >
                <Grid2X2 size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedNoteIds.length ? (
        <div className="trash-actions">
          <button
            className="trash-select-all"
            onClick={() =>
              setSelectedNoteIds(
                selectedNoteIds.length === notes.length ? [] : notes.map((n) => n.id),
              )
            }
          >
            {selectedNoteIds.length === notes.length ? 'Clear selection' : 'Select all'}
          </button>
          <button
            className="trash-delete-selected"
            onClick={() => {
              if (isTrash) {
                onDeleteSelected?.(selectedNoteIds);
              } else {
                if (onTrashSelected) {
                  onTrashSelected(selectedNoteIds);
                } else {
                  selectedNoteIds.forEach((id) => onTrash(id));
                }
              }
              setSelectedNoteIds([]);
            }}
          >
            <Trash2 size={13} style={{ marginRight: '6px' }} />
            {isTrash
              ? `Delete permanently (${selectedNoteIds.length})`
              : `Delete selected (${selectedNoteIds.length})`}
          </button>
        </div>
      ) : isTrash && notes.length ? (
        <div className="trash-actions">
          <button
            className="trash-select-all"
            onClick={() => setSelectedNoteIds(notes.map((n) => n.id))}
          >
            Select all
          </button>
          <button className="trash-empty" onClick={onEmptyTrash}>
            Empty trash
          </button>
        </div>
      ) : null}

      <div className={`note-cards ${viewMode}`}>
        {notes.map((note) => {
          const noteColor = tags.find((tag) => note.tagIds.includes(tag.id))?.color ?? '#7f8998';
          const isSelected = selectedNoteIds.includes(note.id);

          return (
            <div
              className="note-card-wrap"
              key={note.id}
              onContextMenu={(event) => {
                event.preventDefault();
                openNoteMenu(note.id, event.currentTarget);
              }}
            >
              <button
                className={`${note.id === activeNoteId ? 'note-card active' : 'note-card'}${isSelected ? ' selected-for-bulk' : ''}`}
                onClick={(event) => {
                  if (event.shiftKey || selectedNoteIds.length > 0) {
                    event.preventDefault();
                    toggleSelection(note.id);
                    return;
                  }
                  setSelectedNoteIds([]);
                  onSelectNote(note.id);
                }}
                style={{ '--note-color': noteColor } as React.CSSProperties}
              >
                <span className="note-marker" />
                <span
                  className="note-select-indicator"
                  aria-hidden="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelection(note.id);
                  }}
                >
                  {isSelected ? <Check size={12} /> : null}
                </span>
                <span className="note-card-content">
                  <span className="note-card-topline">
                    <strong>{note.title}</strong>
                    {note.favorite ? <Heart size={11} fill="currentColor" /> : null}
                  </span>
                  <p>{notePreview(note)}</p>
                  <small>
                    {note.mode === 'document' ? <FileText size={10} /> : <Maximize2 size={10} />}
                    {note.mode === 'document'
                      ? `${note.pages.length} ${note.pages.length === 1 ? 'page' : 'pages'}`
                      : 'Canvas'}
                    <span>·</span>
                    {relativeDate(note.updatedAt)}
                  </small>
                </span>
              </button>
              <button
                className="note-more"
                onClick={(event) => openNoteMenu(note.id, event.currentTarget)}
                aria-label={`Actions for ${note.title}`}
              >
                <MoreHorizontal size={14} />
              </button>
              {noteMenu === note.id ? (
                <div
                  className={`note-context-menu ${noteMenuPlacement.vertical === 'up' ? 'open-up' : ''} ${noteMenuPlacement.horizontal === 'left' ? 'open-left' : ''}`}
                >
                  <button
                    onClick={() => {
                      onDuplicate(note.id);
                      setNoteMenu(null);
                    }}
                  >
                    <Copy size={13} /> Duplicate
                  </button>
                  {note.deletedAt ? (
                    <>
                      <button
                        onClick={() => {
                          onRestore(note.id);
                          setNoteMenu(null);
                        }}
                      >
                        <RotateCcw size={13} /> Restore
                      </button>
                      <button
                        onClick={() => {
                          onDeleteForever(note.id);
                          setNoteMenu(null);
                        }}
                      >
                        <Trash2 size={13} /> Delete permanently
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          onArchive(note.id);
                          setNoteMenu(null);
                        }}
                      >
                        <Archive size={13} /> {note.archived ? 'Unarchive' : 'Archive'}
                      </button>
                      <button
                        onClick={() => {
                          onTrash(note.id);
                          setNoteMenu(null);
                        }}
                      >
                        <Trash2 size={13} /> Move to trash
                      </button>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
        {!notes.length ? (
          search ? (
            <div className="empty-notes">
              <p>No notes matched this search.</p>
              <button onClick={() => onSearchChange('')}>Clear search</button>
            </div>
          ) : (
            <div className="empty-notes-space">
              <div className="empty-space-art-circle" aria-hidden="true">
                <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="#080c14"
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth="1"
                  />
                  <path
                    d="M42 42 L65 42 L78 55 L78 78 L42 78 Z"
                    stroke="#60a5fa"
                    strokeWidth="1.8"
                    fill="none"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M65 42 L65 55 L78 55"
                    stroke="#60a5fa"
                    strokeWidth="1.8"
                    fill="none"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M48 56 H68 M48 64 H62"
                    stroke="#94a3b8"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <circle cx="82" cy="40" r="2" fill="#a78bfa" />
                  <circle cx="36" cy="72" r="1.5" fill="#f97316" />
                </svg>
              </div>
              <h2>Map out what’s next</h2>
              <p className="empty-space-desc">
                {title} is empty. Capture ideas, plans, and milestones to keep your vision on track.
              </p>

              <div className="empty-space-section">
                <p className="section-mini-label">QUICK START</p>
                <div className="empty-space-actions">
                  <button onClick={() => onCreateNote('document')}>
                    <FileText size={22} className="icon-purple" />
                    <strong>Blank note</strong>
                    <small>Start writing</small>
                  </button>
                  <button onClick={() => onCreateNote('canvas')}>
                    <PenLine size={22} className="icon-blue" />
                    <strong>Drawing</strong>
                    <small>Sketch your ideas</small>
                  </button>
                  <button onClick={() => onOpenAudio?.()}>
                    <Mic size={22} className="icon-orange" />
                    <strong>Audio note</strong>
                    <small>Record a thought</small>
                  </button>
                </div>
              </div>

              <div className="empty-space-section">
                <p className="section-mini-label">NOTES</p>
                <div className="skeleton-cards">
                  <div className="skeleton-card">
                    <div className="skeleton-icon-box" />
                    <div className="skeleton-lines">
                      <span className="line-long" />
                      <span className="line-short" />
                    </div>
                  </div>
                  <div className="skeleton-card">
                    <div className="skeleton-icon-box" />
                    <div className="skeleton-lines">
                      <span className="line-long" />
                      <span className="line-short" />
                    </div>
                  </div>
                  <div className="skeleton-card">
                    <div className="skeleton-icon-box" />
                    <div className="skeleton-lines">
                      <span className="line-long" />
                      <span className="line-short" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        ) : null}
      </div>
    </section>
  );
}
