import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  AudioLines,
  BrainCircuit,
  Check,
  ChevronDown,
  CloudUpload,
  FilePlus2,
  FileText,
  Flame,
  GitBranch,
  Mic2,
  NotebookPen,
  PanelRightClose,
  PanelRightOpen,
  PenLine,
  Plus,
  Search,
  Sparkles,
  Star,
  Target,
  Trash2,
} from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { FocusItem, Folder, Note, NoteMode, Settings } from '../types';

export type CelestineTemplate =
  'study' | 'system' | 'meeting' | 'mindmap' | 'revision' | 'thought' | 'audio' | 'blank';

interface HomeDeskProps {
  notes: Note[];
  folders: Folder[];
  settings: Settings;
  focusItems: FocusItem[];
  onOpenNote: (id: string) => void;
  onCreateNote: (mode: NoteMode, template: CelestineTemplate) => void;
  onToggleFavorite: (id: string) => void;
  onOpenSearch: () => void;
  onOpenQuickCapture: () => void;
  onOpenTemplates: () => void;
  onOpenAudio: () => void;
  onUpload: (files: FileList) => void;
  onToggleUtilityPanel: () => void;
  onAddFocus: () => void;
  onToggleFocus: (id: string) => void;
  onDeleteFocus: (id: string) => void;
  onEditFocus: (id: string) => void;
  onMoveFocus: (id: string, direction: -1 | 1) => void;
}

const stripHtml = (html: string) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const notePreview = (note: Note) =>
  note.mode === 'document'
    ? stripHtml(note.pages.map((page) => page.html).join(' ')).slice(0, 150)
    : note.objects.find((item) => item.type === 'text' && stripHtml(item.html))?.type === 'text'
      ? stripHtml(
          (note.objects.find((item) => item.type === 'text') as { html: string }).html,
        ).slice(0, 150)
      : `${note.objects.filter((item) => item.type === 'stroke').length} ink strokes`;
const relativeTime = (timestamp: number) => {
  const minutes = Math.max(1, Math.round((Date.now() - timestamp) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
};
const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

interface HomeInsightsProps {
  focusItems: FocusItem[];
  completed: number;
  activeStreak: number;
  streakDays: Array<{ date: Date; count: number }>;
  todayStart: Date;
  onToggleFocus: (id: string) => void;
  onEditFocus: (id: string) => void;
  onMoveFocus: (id: string, direction: -1 | 1) => void;
  onDeleteFocus: (id: string) => void;
  onAddFocus: () => void;
}

function HomeInsights({
  focusItems,
  completed,
  activeStreak,
  streakDays,
  todayStart,
  onToggleFocus,
  onEditFocus,
  onMoveFocus,
  onDeleteFocus,
  onAddFocus,
}: HomeInsightsProps) {
  return (
    <section className="home-insights" aria-label="Your focus and activity">
      <section className="focus-widget">
        <header>
          <span>
            <Target size={16} /> Today’s focus
          </span>
          <strong>
            {completed}/{focusItems.length}
          </strong>
        </header>
        {focusItems.length ? (
          <div className="focus-list">
            {focusItems.map((item, index) => (
              <div key={item.id}>
                <button
                  onClick={() => onToggleFocus(item.id)}
                  onDoubleClick={() => onEditFocus(item.id)}
                  aria-label={item.completed ? 'Mark incomplete' : 'Mark complete'}
                  title="Double-click to edit"
                >
                  <span className={item.completed ? 'focus-check checked' : 'focus-check'}>
                    {item.completed ? <Check size={13} /> : null}
                  </span>
                  <span className={item.completed ? 'focus-text completed' : 'focus-text'}>
                    {item.text}
                  </span>
                </button>
                <button
                  disabled={index === 0}
                  onClick={() => onMoveFocus(item.id, -1)}
                  aria-label="Move up"
                >
                  <ArrowUp size={12} />
                </button>
                <button
                  disabled={index === focusItems.length - 1}
                  onClick={() => onMoveFocus(item.id, 1)}
                  aria-label="Move down"
                >
                  <ArrowDown size={12} />
                </button>
                <button
                  onClick={() => onDeleteFocus(item.id)}
                  aria-label={`Delete ${item.text}`}
                  title="Delete focus item"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="widget-empty">Choose one thing worth finishing today.</p>
        )}
        <button className="widget-add" onClick={onAddFocus}>
          <Plus size={14} /> Add focus item
        </button>
      </section>
      <section className="calendar-widget streak-widget">
        <header>
          <div>
            <strong>Note streak</strong>
            <span>Last 16 weeks</span>
          </div>
          <strong>
            <Flame
              size={15}
              style={{
                display: 'inline-block',
                marginRight: '4px',
                verticalAlign: '-2px',
                color: '#ff4d4d',
                fill: '#ff4d4d',
              }}
            />
            {activeStreak} {activeStreak === 1 ? 'day' : 'days'}
          </strong>
        </header>
        <div className="streak-body">
          <div className="streak-labels">
            <span>Mon</span>
            <span>Wed</span>
            <span>Fri</span>
          </div>
          <div className="streak-grid" aria-label="Note activity over the last sixteen weeks">
            {streakDays.map(({ date, count }) => (
              <span
                className={`streak-cell level-${Math.min(count, 4)}${dateKey(date) === dateKey(todayStart) ? ' today' : ''}`}
                key={dateKey(date)}
                title={`${count} ${count === 1 ? 'note' : 'notes'} on ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)}`}
              />
            ))}
          </div>
        </div>
        <div className="streak-legend">
          <span>Less</span>
          <i className="level-0" />
          <i className="level-1" />
          <i className="level-2" />
          <i className="level-3" />
          <i className="level-4" />
          <span>More</span>
        </div>
      </section>
    </section>
  );
}

export function HomeDesk({
  notes,
  folders,
  settings,
  focusItems,
  onOpenNote,
  onCreateNote,
  onToggleFavorite,
  onOpenSearch,
  onOpenQuickCapture,
  onOpenTemplates,
  onOpenAudio,
  onUpload,
  onToggleUtilityPanel,
  onAddFocus,
  onToggleFocus,
  onDeleteFocus,
  onEditFocus,
  onMoveFocus,
}: HomeDeskProps) {
  const uploadRef = useRef<HTMLInputElement>(null);
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [newMenuPlacement, setNewMenuPlacement] = useState<'up' | 'down'>('down');
  const current = new Date();
  const recent = useMemo(
    () =>
      [...notes]
        .filter((note) => !note.archived && !note.deletedAt)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [notes],
  );
  const hour = current.getHours();
  const greeting = hour < 12 ? 'Good morning,' : hour < 18 ? 'Good afternoon,' : 'Good evening,';
  const activityCounts = useMemo(() => {
    const counts = new Map<string, number>();
    notes
      .filter((note) => !note.deletedAt)
      .forEach((note) => {
        const key = dateKey(new Date(note.updatedAt));
        counts.set(key, (counts.get(key) ?? 0) + 1);
      });
    return counts;
  }, [notes]);
  const todayStart = new Date(current.getFullYear(), current.getMonth(), current.getDate());
  const mondayOffset = (todayStart.getDay() + 6) % 7;
  const streakStart = new Date(todayStart);
  streakStart.setDate(streakStart.getDate() - mondayOffset - 105);
  const streakDays = Array.from({ length: 112 }, (_, index) => {
    const date = new Date(streakStart);
    date.setDate(streakStart.getDate() + index);
    return { date, count: activityCounts.get(dateKey(date)) ?? 0 };
  });
  let activeStreak = 0;
  for (let offset = 0; offset < 112; offset += 1) {
    const date = new Date(todayStart);
    date.setDate(todayStart.getDate() - offset);
    if (!activityCounts.has(dateKey(date))) break;
    activeStreak += 1;
  }
  const completed = focusItems.filter((item) => item.completed).length;
  const profileName = settings.profileName?.trim();

  useEffect(() => {
    if (!newMenuOpen) return;
    const closeMenu = (event: PointerEvent) => {
      if (!(event.target as Element).closest('.home-new-control')) setNewMenuOpen(false);
    };
    window.addEventListener('pointerdown', closeMenu);
    return () => window.removeEventListener('pointerdown', closeMenu);
  }, [newMenuOpen]);

  const handleTitleBarDoubleClick = (event: React.MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('button, input, select, a')) return;
    if ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)
      void getCurrentWindow().toggleMaximize();
  };

  return (
    <section className="celestine-home">
      <header
        className="celestine-topbar"
        data-tauri-drag-region
        onDoubleClick={handleTitleBarDoubleClick}
      >
        <button className="celestine-search search-button" onClick={onOpenSearch}>
          <Search size={15} />
          <span>Search anything…</span>
          <kbd>⌘ K</kbd>
        </button>
        <div className="topbar-actions">
          <button className="quick-capture" onClick={onOpenQuickCapture}>
            <NotebookPen size={15} /> Quick capture
          </button>
          <div className="home-new-control">
            <button
              className="new-gradient primary"
              onClick={() =>
                onCreateNote('document', (settings.defaultTemplate as CelestineTemplate) || 'blank')
              }
            >
              <Plus size={18} /> New
            </button>
            <button
              className="new-gradient arrow"
              onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                setNewMenuPlacement(rect.bottom + 350 > window.innerHeight ? 'up' : 'down');
                setNewMenuOpen((open) => !open);
              }}
              aria-label="Choose note template"
            >
              <ChevronDown size={17} />
            </button>
            {newMenuOpen ? (
              <div className={`home-new-menu ${newMenuPlacement === 'up' ? 'open-up' : ''}`}>
                {(
                  [
                    ['Blank note', 'document', 'blank'],
                    ['Study note', 'document', 'study'],
                    ['System design', 'canvas', 'system'],
                    ['Meeting note', 'document', 'meeting'],
                    ['Revision deck', 'document', 'revision'],
                    ['Mind map', 'canvas', 'mindmap'],
                    ['Quick thought', 'document', 'thought'],
                  ] as Array<[string, NoteMode, CelestineTemplate]>
                ).map(([label, mode, template]) => (
                  <button
                    key={template}
                    onClick={() => {
                      onCreateNote(mode, template);
                      setNewMenuOpen(false);
                    }}
                  >
                    {label}
                  </button>
                ))}
                <button
                  onClick={() => {
                    onOpenAudio();
                    setNewMenuOpen(false);
                  }}
                >
                  Audio note
                </button>
                <button
                  onClick={() => {
                    uploadRef.current?.click();
                    setNewMenuOpen(false);
                  }}
                >
                  Import PDF or file
                </button>
              </div>
            ) : null}
          </div>
          <button
            className="utility-toggle"
            onClick={onToggleUtilityPanel}
            aria-label={settings.utilityPanelVisible ? 'Hide utility panel' : 'Show utility panel'}
            title={settings.utilityPanelVisible ? 'Hide utility panel' : 'Show utility panel'}
          >
            {settings.utilityPanelVisible ? (
              <PanelRightClose size={17} />
            ) : (
              <PanelRightOpen size={17} />
            )}
          </button>
        </div>
      </header>
      <div className={`celestine-content ${settings.utilityPanelVisible ? '' : 'utility-hidden'}`}>
        <main className="celestine-main">
          <section className="greeting-hero">
            <div className="greeting-copy">
              <Sparkles className="greeting-spark" size={24} />
              <h1>
                {greeting}
                {profileName ? (
                  <>
                    <br />
                    <em>{profileName}.</em>
                  </>
                ) : null}
              </h1>
              <p>What shall we create today?</p>
              <div className="capture-row">
                <button onClick={() => onCreateNote('document', 'thought')}>
                  <FilePlus2 size={15} /> Quick note
                </button>
                <button onClick={() => onCreateNote('canvas', 'blank')}>
                  <PenLine size={15} /> Draw
                </button>
                <button onClick={onOpenAudio}>
                  <AudioLines size={15} /> Audio note
                </button>
                <button onClick={() => uploadRef.current?.click()}>
                  <CloudUpload size={15} /> Upload
                </button>
                <input
                  ref={uploadRef}
                  hidden
                  type="file"
                  accept=".pdf,.md,.txt,image/*"
                  multiple
                  onChange={(event) => {
                    if (event.target.files?.length) onUpload(event.target.files);
                    event.target.value = '';
                  }}
                />
              </div>
            </div>
            <div className="hero-crystal-scene" aria-hidden="true">
              <span className="planet planet-one" />
              <span className="planet planet-two" />
              <span className="hero-orbit" />
              <img src="/celestine-icon.png" alt="" />
            </div>
          </section>
          <HomeInsights
            focusItems={focusItems}
            completed={completed}
            activeStreak={activeStreak}
            streakDays={streakDays}
            todayStart={todayStart}
            onToggleFocus={onToggleFocus}
            onEditFocus={onEditFocus}
            onMoveFocus={onMoveFocus}
            onDeleteFocus={onDeleteFocus}
            onAddFocus={onAddFocus}
          />
          <section className="continue-section">
            <div className="reference-heading">
              <h2>
                <Sparkles size={18} /> Continue where you left off
              </h2>
              <button onClick={onOpenSearch}>
                View all <ArrowRight size={15} />
              </button>
            </div>
            {recent.length ? (
              <div className="workspace-card-grid">
                {recent.slice(0, 4).map((note) => {
                  const folder = folders.find((item) => item.id === note.folderId);
                  return (
                    <article className="workspace-preview-card" key={note.id}>
                      <button className="card-open" onClick={() => onOpenNote(note.id)}>
                        <span className="real-note-preview">
                          <strong>{note.mode === 'canvas' ? 'Canvas' : 'Document'}</strong>
                          <p>{notePreview(note) || 'This note is ready for your next idea.'}</p>
                        </span>
                        <span className="workspace-card-copy">
                          <span>
                            <strong>{note.title}</strong>
                          </span>
                          <small>
                            <i className="space-dot" style={{ background: folder?.color }} />{' '}
                            {folder?.name || 'Unsorted'}
                          </small>
                          <em>Edited {relativeTime(note.updatedAt)}</em>
                        </span>
                      </button>
                      <button
                        className={note.favorite ? 'card-star active' : 'card-star'}
                        onClick={() => onToggleFavorite(note.id)}
                        aria-label={note.favorite ? 'Remove from starred' : 'Add to starred'}
                        title={note.favorite ? 'Remove from starred' : 'Add to starred'}
                      >
                        <Star size={15} fill={note.favorite ? 'currentColor' : 'none'} />
                      </button>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="useful-empty compact">
                <FileText size={24} />
                <h2>Your thinking space is ready.</h2>
                <p>Create a note or explore a guided starting point.</p>
                <div>
                  <button onClick={() => onCreateNote('document', 'blank')}>Create a note</button>
                  <button onClick={onOpenTemplates}>Explore templates</button>
                </div>
              </div>
            )}
          </section>
        </main>
        {settings.utilityPanelVisible ? (
          <aside className="context-rail">
            <section className="focus-widget">
              <header>
                <span>
                  <Target size={16} /> Today’s focus
                </span>
                <strong>
                  {completed}/{focusItems.length}
                </strong>
              </header>
              {focusItems.length ? (
                <div className="focus-list">
                  {focusItems.map((item, index) => (
                    <div key={item.id}>
                      <button
                        onClick={() => onToggleFocus(item.id)}
                        onDoubleClick={() => onEditFocus(item.id)}
                        aria-label={item.completed ? 'Mark incomplete' : 'Mark complete'}
                        title="Double-click to edit"
                      >
                        <span className={item.completed ? 'focus-check checked' : 'focus-check'}>
                          {item.completed ? <Check size={13} /> : null}
                        </span>
                        <span className={item.completed ? 'focus-text completed' : 'focus-text'}>
                          {item.text}
                        </span>
                      </button>
                      <button
                        disabled={index === 0}
                        onClick={() => onMoveFocus(item.id, -1)}
                        aria-label="Move up"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        disabled={index === focusItems.length - 1}
                        onClick={() => onMoveFocus(item.id, 1)}
                        aria-label="Move down"
                      >
                        <ArrowDown size={12} />
                      </button>
                      <button
                        onClick={() => onDeleteFocus(item.id)}
                        aria-label={`Delete ${item.text}`}
                        title="Delete focus item"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="widget-empty">Choose one thing worth finishing today.</p>
              )}
              <button className="widget-add" onClick={onAddFocus}>
                <Plus size={14} /> Add focus item
              </button>
            </section>
            <section className="calendar-widget streak-widget">
              <header>
                <div>
                  <strong>Note streak</strong>
                  <span>Last 12 weeks</span>
                </div>
                <strong>
                  <Flame
                    size={15}
                    style={{
                      display: 'inline-block',
                      marginRight: '4px',
                      verticalAlign: '-2px',
                      color: '#ff4d4d',
                      fill: '#ff4d4d',
                    }}
                  />
                  {activeStreak} {activeStreak === 1 ? 'day' : 'days'}
                </strong>
              </header>
              <div className="streak-body">
                <div className="streak-labels">
                  <span>Mon</span>
                  <span>Wed</span>
                  <span>Fri</span>
                </div>
                <div className="streak-grid" aria-label="Note activity over the last twelve weeks">
                  {streakDays.map(({ date, count }) => (
                    <span
                      className={`streak-cell level-${Math.min(count, 4)}${dateKey(date) === dateKey(todayStart) ? ' today' : ''}`}
                      key={dateKey(date)}
                      title={`${count} ${count === 1 ? 'note' : 'notes'} on ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)}`}
                    />
                  ))}
                </div>
              </div>
              <div className="streak-legend">
                <span>Less</span>
                <i className="level-0" />
                <i className="level-1" />
                <i className="level-2" />
                <i className="level-3" />
                <i className="level-4" />
                <span>More</span>
              </div>
            </section>
            {settings.focusMessage ? (
              <section className="idea-quote">
                <p>{settings.focusMessage}</p>
                <cite>Your focus message</cite>
              </section>
            ) : null}
            <section className="quick-actions-widget">
              <h3>Quick actions</h3>
              <div>
                <button onClick={() => onCreateNote('document', 'revision')}>
                  <FileText size={14} /> Flashcards
                </button>
                <button onClick={() => onCreateNote('canvas', 'mindmap')}>
                  <BrainCircuit size={14} /> Mind map
                </button>
                <button
                  disabled
                  title="AI summary requires an AI provider, which is not configured"
                >
                  <Sparkles size={14} /> AI summary
                </button>
                <button onClick={onOpenAudio}>
                  <Mic2 size={14} /> Voice note
                </button>
              </div>
            </section>
          </aside>
        ) : null}
      </div>
    </section>
  );
}
