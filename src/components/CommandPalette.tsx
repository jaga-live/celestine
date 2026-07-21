import { useEffect, useMemo, useState } from 'react';
import { Command, FileText, Folder, Hash, LayoutTemplate, Search, Settings } from 'lucide-react';
import type { Folder as FolderType, Note, Tag } from '../types';

interface CommandPaletteProps {
  notes: Note[];
  folders: FolderType[];
  tags: Tag[];
  onClose: () => void;
  onOpenNote: (id: string) => void;
  onOpenFilter: (type: 'folder' | 'tag', id: string) => void;
  onOpenTemplates: () => void;
  onOpenSettings: () => void;
  onQuickNote: () => void;
}

const noteText = (note: Note) =>
  [
    note.title,
    note.transcript ?? '',
    ...(note.attachments ?? []).map((item) => item.name),
    ...note.pages.map((page) => page.html.replace(/<[^>]*>/g, ' ')),
    ...note.objects
      .filter((item) => item.type === 'text')
      .map((item) => (item.type === 'text' ? item.html.replace(/<[^>]*>/g, ' ') : '')),
  ]
    .join(' ')
    .toLowerCase();

export function CommandPalette({
  notes,
  folders,
  tags,
  onClose,
  onOpenNote,
  onOpenFilter,
  onOpenTemplates,
  onOpenSettings,
  onQuickNote,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    const matches = (value: string) => !term || value.toLowerCase().includes(term);
    return [
      ...notes
        .filter((note) => !note.archived && noteText(note).includes(term))
        .slice(0, 7)
        .map((note) => ({
          id: `note-${note.id}`,
          label: note.title,
          group: 'Notes',
          icon: FileText,
          action: () => onOpenNote(note.id),
        })),
      ...folders
        .filter((folder) => matches(folder.name))
        .map((folder) => ({
          id: `folder-${folder.id}`,
          label: folder.name,
          group: 'Spaces',
          icon: Folder,
          action: () => onOpenFilter('folder', folder.id),
        })),
      ...tags
        .filter((tag) => matches(tag.name))
        .map((tag) => ({
          id: `tag-${tag.id}`,
          label: `#${tag.name}`,
          group: 'Tags',
          icon: Hash,
          action: () => onOpenFilter('tag', tag.id),
        })),
      ...[
        {
          id: 'templates',
          label: 'Browse templates',
          group: 'Commands',
          icon: LayoutTemplate,
          action: onOpenTemplates,
        },
        {
          id: 'quick-note',
          label: 'Create quick note',
          group: 'Commands',
          icon: Command,
          action: onQuickNote,
        },
        {
          id: 'settings',
          label: 'Open settings',
          group: 'Commands',
          icon: Settings,
          action: onOpenSettings,
        },
      ].filter((item) => matches(item.label)),
      ...[
        'Blank note',
        'Study notes',
        'System design',
        'Meeting notes',
        'Revision deck',
        'Mind map',
        'Quick thought',
        'Audio note',
      ]
        .filter(matches)
        .map((label) => ({
          id: `template-${label}`,
          label,
          group: 'Templates',
          icon: LayoutTemplate,
          action: onOpenTemplates,
        })),
    ];
  }, [
    folders,
    notes,
    onOpenFilter,
    onOpenNote,
    onOpenSettings,
    onOpenTemplates,
    onQuickNote,
    query,
    tags,
  ]);

  useEffect(() => setActive(0), [query]);

  const choose = (index: number) => {
    const result = results[index];
    if (!result) return;
    result.action();
    onClose();
  };

  return (
    <div className="overlay-backdrop command-backdrop" onPointerDown={onClose}>
      <section className="command-palette" onPointerDown={(event) => event.stopPropagation()}>
        <label>
          <Search size={18} />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') onClose();
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActive((value) => Math.min(results.length - 1, value + 1));
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActive((value) => Math.max(0, value - 1));
              }
              if (event.key === 'Enter') choose(active);
            }}
            placeholder="Search notes, spaces, tags and commands…"
          />
          <kbd>ESC</kbd>
        </label>
        <div className="command-results">
          {results.map((result, index) => {
            const Icon = result.icon;
            return (
              <button
                className={index === active ? 'active' : ''}
                key={result.id}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(index)}
              >
                <Icon size={16} strokeWidth={1.7} />
                <span>
                  <strong>{result.label}</strong>
                  <small>{result.group}</small>
                </span>
              </button>
            );
          })}
          {!results.length ? (
            <div className="command-empty">
              No notes matched this search.
              <button onClick={() => setQuery('')}>Clear search</button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
