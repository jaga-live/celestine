import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  FileText,
  FolderPlus,
  Folder as FolderIcon,
  FolderOpen,
  Layers,
  Mic,
  MoreHorizontal,
  PenLine,
  Plus,
  Box,
  Play,
} from 'lucide-react';
import type { CelestineTemplate, Folder, Note, NoteMode } from '../types';

interface ProjectDeskProps {
  project: Folder;
  folders: Folder[];
  notes: Note[];
  onOpenNote: (id: string) => void;
  onCreateNote: (
    mode: NoteMode,
    template?: CelestineTemplate,
    quickCapture?: boolean,
    folderId?: string,
  ) => void;
  onCreateFolder: () => void;
  onOpenFolder?: (id: string) => void;
  onAllProjects?: () => void;
  onRenameFolder?: (folderId: string) => void;
  onDeleteFolder?: (folderId: string) => void;
  onRecolorFolder?: (folderId: string) => void;
}

const relativeTime = (timestamp: number) => {
  const minutes = Math.max(1, Math.round((Date.now() - timestamp) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
};

const stripHtml = (html: string) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const getNoteSnippet = (note: Note) => {
  if (note.mode === 'document') {
    const text = stripHtml(note.pages.map((p) => p.html).join(' '));
    return text || 'No additional text snippet.';
  }
  return 'Canvas drawing & visual notes layout.';
};

export function ProjectDesk({
  project,
  folders,
  notes,
  onOpenNote,
  onCreateNote,
  onCreateFolder,
  onAllProjects,
  onRenameFolder,
  onDeleteFolder,
  onRecolorFolder,
}: ProjectDeskProps) {
  const projectFolders = folders.filter((f) => f.parentId === project.id);
  const rootNotes = notes.filter((n) => n.folderId === project.id);

  // Track open/collapsed state for spaces and tree map
  const [collapsedSpaces, setCollapsedSpaces] = useState<Record<string, boolean>>({});
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});
  const [folderMenuId, setFolderMenuId] = useState<string | null>(null);
  const [folderMenuPlacement, setFolderMenuPlacement] = useState<'up' | 'down'>('down');

  const toggleNode = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCollapsedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    if (!folderMenuId) return;
    const closeMenu = (e: PointerEvent) => {
      const target = e.target as Element;
      if (target.closest('.sidebar-context-menu, .icon-btn-subtle')) return;
      setFolderMenuId(null);
    };
    window.addEventListener('pointerdown', closeMenu);
    return () => window.removeEventListener('pointerdown', closeMenu);
  }, [folderMenuId]);

  const toggleSpace = (folderId: string) => {
    setCollapsedSpaces((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  // Metrics
  const documentNotes = notes.filter((n) => n.mode === 'document' && !n.audioDataUrl);
  const drawingNotes = notes.filter((n) => n.mode === 'canvas');
  const systemDesignNotes = notes.filter((n) => n.mode === 'canvas' && n.objects.length > 5);
  const audioNotes = notes.filter((n) => Boolean(n.audioDataUrl));
  const totalItems = notes.length;

  // Recently active
  const recentNotes = [...notes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3);

  return (
    <main className="project-desk single-view-layout">
      {/* Top Header */}
      <div className="project-top-nav">
        {onAllProjects && (
          <button className="back-link-btn" onClick={onAllProjects}>
            <ArrowLeft size={16} /> All projects
          </button>
        )}
      </div>

      <header className="project-header-clean">
        <div className="header-info">
          <h1>
            {project.icon ? `${project.icon} ` : ''}
            {project.name}
          </h1>
          <p>Design, build, and scale core backend systems.</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary-flat" onClick={onCreateFolder}>
            <FolderPlus size={16} /> New space
          </button>
          <button className="btn-secondary-flat" onClick={() => onCreateNote('document')}>
            <FileText size={16} /> + Note
          </button>
          <button className="btn-secondary-flat" onClick={() => onCreateNote('canvas')}>
            <PenLine size={16} /> + Canvas
          </button>
          <button className="btn-primary-flat" onClick={() => onCreateNote('document', 'audio')}>
            <Mic size={16} /> + Audio note
          </button>
        </div>
      </header>

      {/* 3-Column Top Dashboard Grid */}
      <section className="project-dashboard-grid">
        {/* Card 1: Project Map */}
        <div className="dashboard-card project-map-card">
          <div className="card-header">
            <h3>Project map</h3>
          </div>
          <div className="tree-container">
            <div
              className="tree-item root-item"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              title="Click to scroll to top"
            >
              <button
                className="tree-toggle-btn"
                onClick={(e) => toggleNode('root', e)}
                title={collapsedNodes['root'] ? 'Expand project' : 'Collapse project'}
              >
                {collapsedNodes['root'] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </button>
              {collapsedNodes['root'] ? (
                <FolderIcon size={16} className="tree-icon icon-blue" />
              ) : (
                <FolderOpen size={16} className="tree-icon icon-blue" />
              )}
              <strong className="tree-title">{project.name}</strong>
              <span className="tree-action-hint">Top ↑</span>
            </div>

            {!collapsedNodes['root'] && (
              <div className="tree-children">
                {rootNotes.map((rootNote) => (
                  <div
                    key={rootNote.id}
                    className="tree-item folder-item note-node"
                    onClick={() => onOpenNote(rootNote.id)}
                    title="Click to open note"
                  >
                    <span className="tree-line" />
                    <FileText size={14} className="tree-icon icon-blue" />
                    <span>{rootNote.title || 'Untitled note'}</span>
                    <span className="tree-action-hint">Open ↗</span>
                  </div>
                ))}
                {projectFolders.map((folder) => {
                  const childNotes = notes.filter((n) => n.folderId === folder.id);
                  const isCollapsed = Boolean(collapsedNodes[folder.id]);

                  return (
                    <div key={folder.id} className="tree-node">
                      <div
                        className="tree-item folder-item"
                        onClick={() => {
                          const el = document.getElementById(`space-${folder.id}`);
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                        title="Click to scroll to space"
                      >
                        <button
                          className="tree-toggle-btn"
                          onClick={(e) => toggleNode(folder.id, e)}
                          title={isCollapsed ? 'Expand space' : 'Collapse space'}
                        >
                          {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                        </button>
                        <span className="tree-line" />
                        {isCollapsed ? (
                          <FolderIcon size={14} className="tree-icon" />
                        ) : (
                          <FolderOpen size={14} className="tree-icon" />
                        )}
                        <span>{folder.name}</span>
                        <span className="tree-action-hint">Go to space ↵</span>
                      </div>
                      {!isCollapsed && childNotes.length > 0 && (
                        <div className="tree-subchildren">
                          {childNotes.map((subNote) => (
                            <div
                              key={subNote.id}
                              className="tree-item subfolder-item note-node"
                              onClick={() => onOpenNote(subNote.id)}
                              title="Click to open note"
                            >
                              <span className="tree-line" />
                              <FileText size={13} className="tree-icon" />
                              <span>{subNote.title || 'Untitled'}</span>
                              <span className="tree-action-hint">Open ↗</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {projectFolders.length === 0 && rootNotes.length === 0 && (
                  <div className="tree-item empty-item">
                    <span className="tree-line" />
                    <span className="text-muted">No files or spaces created</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Content Mix */}
        <div className="dashboard-card content-mix-card">
          <div className="card-header">
            <h3>Content mix</h3>
          </div>
          <div className="mix-list">
            <div className="mix-row">
              <div className="mix-label">
                <FileText size={15} className="icon-blue" />
                <span>Notes</span>
              </div>
              <div className="mix-bar-track">
                <div
                  className="mix-bar-fill fill-blue"
                  style={{
                    width: `${totalItems ? Math.min(100, (documentNotes.length / totalItems) * 100) : 0}%`,
                  }}
                />
              </div>
              <span className="mix-count">{documentNotes.length}</span>
            </div>

            <div className="mix-row">
              <div className="mix-label">
                <PenLine size={15} className="icon-orange" />
                <span>Drawings</span>
              </div>
              <div className="mix-bar-track">
                <div
                  className="mix-bar-fill fill-orange"
                  style={{
                    width: `${totalItems ? Math.min(100, (drawingNotes.length / totalItems) * 100) : 0}%`,
                  }}
                />
              </div>
              <span className="mix-count">{drawingNotes.length}</span>
            </div>

            <div className="mix-row">
              <div className="mix-label">
                <Box size={15} className="icon-purple" />
                <span>System designs</span>
              </div>
              <div className="mix-bar-track">
                <div
                  className="mix-bar-fill fill-purple"
                  style={{
                    width: `${totalItems ? Math.min(100, (systemDesignNotes.length / totalItems) * 100) : 0}%`,
                  }}
                />
              </div>
              <span className="mix-count">{systemDesignNotes.length}</span>
            </div>

            <div className="mix-row">
              <div className="mix-label">
                <Mic size={15} className="icon-magenta" />
                <span>Audio notes</span>
              </div>
              <div className="mix-bar-track">
                <div
                  className="mix-bar-fill fill-magenta"
                  style={{
                    width: `${totalItems ? Math.min(100, (audioNotes.length / totalItems) * 100) : 0}%`,
                  }}
                />
              </div>
              <span className="mix-count">{audioNotes.length}</span>
            </div>
          </div>
          <div className="mix-footer">{totalItems} items total</div>
        </div>

        {/* Card 3: Recently Active */}
        <div className="dashboard-card recently-active-card">
          <div className="card-header">
            <h3>
              <Clock size={15} /> Recently active
            </h3>
          </div>
          <div className="recent-list">
            {recentNotes.map((n) => {
              const isCanvas = n.mode === 'canvas';
              const isAudio = Boolean(n.audioDataUrl);
              const label = isCanvas ? 'Drawing' : isAudio ? 'Audio note' : 'Note';

              return (
                <div key={n.id} className="recent-item" onClick={() => onOpenNote(n.id)}>
                  <div
                    className={`recent-icon-box ${isCanvas ? 'box-purple' : isAudio ? 'box-orange' : 'box-blue'}`}
                  >
                    {isCanvas ? (
                      <Box size={16} />
                    ) : isAudio ? (
                      <Mic size={16} />
                    ) : (
                      <FileText size={16} />
                    )}
                  </div>
                  <div className="recent-details">
                    <strong className="recent-title">{n.title || 'Untitled'}</strong>
                    <span className="recent-meta">
                      {label} · {relativeTime(n.updatedAt)}
                    </span>
                  </div>
                </div>
              );
            })}
            {recentNotes.length === 0 && <p className="empty-text">No recently active notes</p>}
          </div>
          <div className="recent-footer">
            <button className="link-btn">View all</button>
          </div>
        </div>
      </section>

      {/* Spaces Accordions Section */}
      <section className="spaces-section">
        <h2 className="section-title">Spaces</h2>

        {/* List of sub-folder spaces & root notes space */}
        <div className="spaces-stack">
          {rootNotes.length > 0 && (
            <div
              id="space-root"
              className={`space-accordion ${folderMenuId === 'root' ? 'menu-active' : ''}`}
            >
              <div className="accordion-header" onClick={() => toggleSpace('root')}>
                <div className="accordion-header-left">
                  <FileText size={18} className="folder-accent-icon icon-blue" />
                  <strong className="space-name">Root Files</strong>
                  <span className="space-badge">{rootNotes.length} items</span>
                </div>
                <div className="accordion-header-right">
                  <button
                    className="icon-btn-subtle"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSpace('root');
                    }}
                  >
                    {collapsedSpaces['root'] ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                  </button>
                </div>
              </div>

              {!collapsedSpaces['root'] && (
                <div className="accordion-body">
                  <div className="cards-grid">
                    {rootNotes.map((n) => {
                      const isCanvas = n.mode === 'canvas';
                      const isAudio = Boolean(n.audioDataUrl);

                      return (
                        <div key={n.id} className="preview-card" onClick={() => onOpenNote(n.id)}>
                          <div className="card-top">
                            <div className="card-type-header">
                              {isCanvas ? (
                                <Box size={16} className="icon-purple" />
                              ) : isAudio ? (
                                <Mic size={16} className="icon-magenta" />
                              ) : (
                                <FileText size={16} className="icon-blue" />
                              )}
                              <div className="card-title-group">
                                <strong className="card-title">{n.title || 'Untitled'}</strong>
                                <span className="card-subtitle">
                                  {isCanvas ? 'System design' : isAudio ? 'Audio note' : 'Note'} ·
                                  Updated {relativeTime(n.updatedAt)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="card-snippet-box">
                            <p className="text-snippet">{getNoteSnippet(n)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="folder-quick-actions">
                    <button
                      className="btn-secondary-flat compact"
                      onClick={() => onCreateNote('document', 'blank', false, project.id)}
                    >
                      <Plus size={13} /> Note
                    </button>
                    <button
                      className="btn-secondary-flat compact"
                      onClick={() => onCreateNote('canvas', 'blank', false, project.id)}
                    >
                      <Plus size={13} /> Canvas
                    </button>
                    <button
                      className="btn-secondary-flat compact"
                      onClick={() => onCreateNote('document', 'audio', false, project.id)}
                    >
                      <Plus size={13} /> Audio note
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {projectFolders.map((folder) => {
            const folderNotes = notes.filter((n) => n.folderId === folder.id);
            const isCollapsed = Boolean(collapsedSpaces[folder.id]);
            const isMenuOpen = folderMenuId === folder.id;

            return (
              <div
                key={folder.id}
                id={`space-${folder.id}`}
                className={`space-accordion ${isMenuOpen ? 'menu-active' : ''}`}
              >
                <div className="accordion-header" onClick={() => toggleSpace(folder.id)}>
                  <div className="accordion-header-left">
                    <FolderIcon size={18} className="folder-accent-icon" />
                    <strong className="space-name">{folder.name}</strong>
                    <span className="space-badge">{folderNotes.length} items</span>
                  </div>
                  <div className="accordion-header-right" style={{ position: 'relative' }}>
                    <button
                      className="btn-secondary-flat compact"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateNote('document', 'blank', false, folder.id);
                      }}
                      title="Create note in this space"
                    >
                      <Plus size={14} /> Note
                    </button>
                    <button
                      className="icon-btn-subtle"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSpace(folder.id);
                      }}
                    >
                      {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                    </button>
                    <button
                      className="icon-btn-subtle"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setFolderMenuPlacement(
                          rect.bottom + 150 > window.innerHeight ? 'up' : 'down',
                        );
                        setFolderMenuId(folderMenuId === folder.id ? null : folder.id);
                      }}
                      title="Space options"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                    {isMenuOpen ? (
                      <div
                        className={`sidebar-context-menu ${folderMenuPlacement === 'up' ? 'open-up' : ''}`}
                        style={{ right: '0', top: '36px', position: 'absolute', zIndex: 100 }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            onRenameFolder?.(folder.id);
                            setFolderMenuId(null);
                          }}
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => {
                            onRecolorFolder?.(folder.id);
                            setFolderMenuId(null);
                          }}
                        >
                          Change color
                        </button>
                        <button
                          className="danger"
                          onClick={() => {
                            onDeleteFolder?.(folder.id);
                            setFolderMenuId(null);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="accordion-body">
                    {folderNotes.length > 0 ? (
                      <>
                        <div className="cards-grid">
                          {folderNotes.map((n) => {
                            const isCanvas = n.mode === 'canvas';
                            const isAudio = Boolean(n.audioDataUrl);

                            return (
                              <div
                                key={n.id}
                                className="preview-card"
                                onClick={() => onOpenNote(n.id)}
                              >
                                <div className="card-top">
                                  <div className="card-type-header">
                                    {isCanvas ? (
                                      <Box size={16} className="icon-purple" />
                                    ) : isAudio ? (
                                      <Mic size={16} className="icon-magenta" />
                                    ) : (
                                      <FileText size={16} className="icon-blue" />
                                    )}
                                    <div className="card-title-group">
                                      <strong className="card-title">
                                        {n.title || 'Untitled'}
                                      </strong>
                                      <span className="card-subtitle">
                                        {isCanvas
                                          ? 'System design'
                                          : isAudio
                                            ? 'Audio note'
                                            : 'Note'}{' '}
                                        · Updated {relativeTime(n.updatedAt)}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="card-snippet-box">
                                  {isAudio ? (
                                    <div className="audio-preview-widget">
                                      <svg className="waveform-svg" viewBox="0 0 200 30">
                                        <path
                                          d="M10 15 Q20 5, 30 15 T50 15 T70 5 T90 25 T110 10 T130 20 T150 15 T170 5 T190 15"
                                          fill="none"
                                          stroke="#c084fc"
                                          strokeWidth="2.5"
                                          strokeLinecap="round"
                                        />
                                      </svg>
                                      <div className="audio-controls">
                                        <span className="play-btn">
                                          <Play size={12} fill="currentColor" />
                                        </span>
                                        <span className="audio-time">06:24</span>
                                        <MoreHorizontal size={14} className="audio-more" />
                                      </div>
                                    </div>
                                  ) : isCanvas ? (
                                    <div className="diagram-preview-widget">
                                      <div className="diagram-node">Client</div>
                                      <span className="diagram-arrow">→</span>
                                      <div className="diagram-node highlight">API Gateway</div>
                                      <span className="diagram-arrow">→</span>
                                      <div className="diagram-node group">
                                        <div className="micro-box" />
                                        <div className="micro-box" />
                                        <div className="micro-box" />
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-snippet">{getNoteSnippet(n)}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="folder-quick-actions">
                          <button
                            className="btn-secondary-flat compact"
                            onClick={() => onCreateNote('document', 'blank', false, folder.id)}
                          >
                            <Plus size={13} /> Note
                          </button>
                          <button
                            className="btn-secondary-flat compact"
                            onClick={() => onCreateNote('canvas', 'blank', false, folder.id)}
                          >
                            <Plus size={13} /> Canvas
                          </button>
                          <button
                            className="btn-secondary-flat compact"
                            onClick={() => onCreateNote('document', 'audio', false, folder.id)}
                          >
                            <Plus size={13} /> Audio note
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="empty-space-box">
                        <p className="empty-space-text">No files in this space yet.</p>
                        <div className="empty-space-actions">
                          <button
                            className="btn-secondary-flat"
                            onClick={() => onCreateNote('document', 'blank', false, folder.id)}
                          >
                            <FileText size={14} /> + Note
                          </button>
                          <button
                            className="btn-secondary-flat"
                            onClick={() => onCreateNote('canvas', 'blank', false, folder.id)}
                          >
                            <PenLine size={14} /> + Canvas
                          </button>
                          <button
                            className="btn-secondary-flat"
                            onClick={() => onCreateNote('document', 'audio', false, folder.id)}
                          >
                            <Mic size={14} /> + Audio note
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {projectFolders.length === 0 && rootNotes.length === 0 && (
            <div className="empty-spaces-card">
              <Layers size={32} />
              <p>
                No sub-spaces created yet. Click "New folder" above to create spaces for this
                project.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
