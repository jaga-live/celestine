import { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  Copy,
  FileText,
  Filter,
  Folder as FolderIcon,
  Grid2X2,
  Heart,
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
import type { CelestineTemplate, Folder, Note, NoteMode } from '../types';

interface NotesListProps {
  notes: Note[];
  folders?: Folder[];
  activeNoteId: string;
  search: string;
  title: string;
  breadcrumb?: string;
  onSearchChange: (value: string) => void;
  onSelectNote: (id: string) => void;
  onSelectFolder?: (folderId: string) => void;
  onCreateNote: (mode: NoteMode, template?: CelestineTemplate) => void;
  onOpenAudio?: () => void;
  viewMode: 'list' | 'grid';
  sort: 'updated' | 'created' | 'title';
  onViewModeChange: (value: 'list' | 'grid') => void;
  onSortChange: (value: 'updated' | 'created' | 'title') => void;
  onDuplicate: (id: string) => void;
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
  folders,
  activeNoteId,
  search,
  title,
  breadcrumb,
  onSearchChange,
  onSelectNote,
  onSelectFolder,
  onCreateNote,
  onOpenAudio,
  viewMode,
  sort,
  onViewModeChange,
  onSortChange,
  onDuplicate,
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
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [sortMenuPlacement, setSortMenuPlacement] = useState<'up' | 'down'>('down');
  const [newNotePlacement, setNewNotePlacement] = useState<'up' | 'down'>('down');
  const [noteMenuPlacement, setNoteMenuPlacement] = useState<{
    vertical: 'up' | 'down';
    horizontal: 'left' | 'right';
  }>({ vertical: 'down', horizontal: 'right' });
  const newNoteControlRef = useRef<HTMLDivElement>(null);
  const isTrash = title === 'Trash';

  const handleNoteClick = (event: React.MouseEvent, noteId: string, index: number) => {
    if (event.metaKey || event.ctrlKey) {
      event.preventDefault();
      setLastSelectedIndex(index);
      setSelectedNoteIds((current) =>
        current.includes(noteId) ? current.filter((id) => id !== noteId) : [...current, noteId],
      );

      return;
    }

    if (event.shiftKey && lastSelectedIndex !== null) {
      event.preventDefault();
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const rangeIds = notes.slice(start, end + 1).map((n) => n.id);

      setSelectedNoteIds((current) => Array.from(new Set([...current, ...rangeIds])));

      return;
    }

    setSelectedNoteIds([]);
    setLastSelectedIndex(index);
    onSelectNote(noteId);
  };

  const [visibleCount, setVisibleCount] = useState(25);

  useEffect(() => {
    setVisibleCount(25);
    setSelectedNoteIds([]);
  }, [title, search, sort]);

  const scrollRafId = useRef<number | null>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (scrollRafId.current !== null) {
      return;
    }

    scrollRafId.current = requestAnimationFrame(() => {
      scrollRafId.current = null;
      const { scrollTop, scrollHeight, clientHeight } = target;
      if (scrollHeight - scrollTop - clientHeight < 250) {
        if (visibleCount < notes.length) {
          setVisibleCount((prev) => Math.min(prev + 30, notes.length));
        }
      }
    });
  };

  const visibleNotesSlice = notes.slice(0, visibleCount);

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
      <div className="notes-header-stack" data-tauri-drag-region>
        {breadcrumb ? (
          <div className="notes-breadcrumb-line" data-tauri-drag-region>
            <span data-tauri-drag-region>Projects</span>
            <span className="separator" data-tauri-drag-region>
              ›
            </span>
            <span className="current" data-tauri-drag-region>
              {breadcrumb.split(' / ').pop()}
            </span>
          </div>
        ) : null}

        <div className="notes-title-row" data-tauri-drag-region>
          <div className="notes-title-group" data-tauri-drag-region>
            <h2 data-tauri-drag-region>{title}</h2>
            <span className="notes-count-meta" data-tauri-drag-region>
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
                <button
                  onClick={() => {
                    if (onOpenAudio) {
                      onOpenAudio();
                    } else {
                      onCreateNote('document', 'audio');
                    }
                    setNewNoteMenuOpen(false);
                  }}
                >
                  <Mic size={16} />
                  <span>
                    <strong>Audio note</strong>
                    <small>Record voice & auto-transcribe</small>
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

      <div className={`note-cards ${viewMode}`} onScroll={handleScroll}>
        {visibleNotesSlice.map((note, index) => {
          const noteColor = '#7f8998';
          const isSelected = selectedNoteIds.includes(note.id);
          const folder = folders?.find((f) => f.id === note.folderId);
          const folderName = folder ? folder.name : note.folderId === 'inbox' ? 'Inbox' : null;
          const folderColor = folder?.color || '#4c9bff';

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
                onClick={(event) => handleNoteClick(event, note.id, index)}
                style={{ '--note-color': noteColor } as React.CSSProperties}
              >
                <span className="note-marker" />
                {isSelected ? (
                  <span className="note-select-indicator" aria-hidden="true">
                    <Check size={12} />
                  </span>
                ) : null}
                <span className="note-card-content">
                  <span className="note-card-topline">
                    <strong>{note.title}</strong>
                    {note.favorite ? <Heart size={11} fill="currentColor" /> : null}
                  </span>
                  <p>{notePreview(note)}</p>
                  <small>
                    {folderName ? (
                      <span
                        className="note-project-badge"
                        style={{ '--project-color': folderColor } as React.CSSProperties}
                        title={`View notes in ${folderName}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (note.folderId) {
                            onSelectFolder?.(note.folderId);
                          }
                        }}
                      >
                        <FolderIcon size={10} />
                        <span>{folderName}</span>
                      </span>
                    ) : null}
                    <span className="note-meta-item">
                      {note.mode === 'document' ? <FileText size={10} /> : <Maximize2 size={10} />}
                      {note.mode === 'document'
                        ? `${note.pages.length} ${note.pages.length === 1 ? 'page' : 'pages'}`
                        : 'Canvas'}
                    </span>
                    <span>·</span>
                    <span className="note-meta-date">{relativeDate(note.updatedAt)}</span>
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
                    <button
                      onClick={() => {
                        onTrash(note.id);
                        setNoteMenu(null);
                      }}
                    >
                      <Trash2 size={13} /> Move to trash
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
        {visibleCount < notes.length && (
          <div className="notes-load-more-indicator">
            <span>
              Showing {visibleNotesSlice.length} of {notes.length} notes (scroll to load more)
            </span>
          </div>
        )}
        {!notes.length ? (
          search ? (
            <div className="empty-notes">
              <p>No notes matched this search.</p>
              <button onClick={() => onSearchChange('')}>Clear search</button>
            </div>
          ) : (
            <div className="empty-notes-space centered">
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
              <h2>Map out what's next</h2>
              <p className="empty-space-desc">
                {title} is empty. Capture ideas, plans, and milestones to keep your vision on track.
              </p>
            </div>
          )
        ) : null}
      </div>
    </section>
  );
}
