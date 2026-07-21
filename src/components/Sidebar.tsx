import { useEffect, useState } from 'react';
import {
  BookOpen,
  Brain,
  ChevronDown,
  ChevronRight,
  House,
  LayoutTemplate,
  Heart,
  Lightbulb,
  PenLine,
  Plus,
  Settings,
  Archive,
  Trash2,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  UserRound,
  Shuffle,
  X,
} from 'lucide-react';
import type { Folder as FolderType, Tag as TagType } from '../types';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  LiquidOrb,
  LIGHT_ORB_PRESETS,
  getRandomOrbColorPair,
  getSecondaryColor,
} from './LiquidOrb';

export type LibraryFilter =
  | { type: 'all' }
  | { type: 'favorites' }
  | { type: 'archive' }
  | { type: 'trash' }
  | { type: 'folder'; id: string }
  | { type: 'tag'; id: string };

interface SidebarProps {
  folders: FolderType[];
  tags: TagType[];
  filter: LibraryFilter;
  onFilterChange: (filter: LibraryFilter) => void;
  onCreateFolder: () => void;
  onCreateProjectFolder: (projectId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onDeleteTag: (tagId: string) => void;
  onRenameFolder: (folderId: string) => void;
  onRecolorFolder: (folderId: string) => void;
  onUpdateFolder?: (folderId: string, name: string, color: string, secondaryColor?: string) => void;
  onDuplicateFolder: (folderId: string) => void;
  onChangeFolderIcon: (folderId: string) => void;
  onRenameTag: (tagId: string) => void;
  onRecolorTag: (tagId: string) => void;
  onOpenSettings: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  view: 'home' | 'notes' | 'templates';
  onViewChange: (view: 'home' | 'notes' | 'templates') => void;
}

const filterMatches = (left: LibraryFilter, right: LibraryFilter) =>
  left.type === right.type && ('id' in left ? left.id === ('id' in right ? right.id : '') : true);

export function Sidebar({
  folders,
  tags,
  filter,
  onFilterChange,
  onCreateFolder,
  onCreateProjectFolder,
  onDeleteFolder,
  onDeleteTag,
  onRenameFolder,
  onRecolorFolder,
  onUpdateFolder,
  onDuplicateFolder,
  onChangeFolderIcon,
  onRenameTag,
  onRecolorTag,
  onOpenSettings,
  collapsed,
  onToggleCollapsed,
  view,
  onViewChange,
}: SidebarProps) {
  const [menu, setMenu] = useState<{ type: 'folder' | 'tag'; id: string } | null>(null);
  const [menuPlacement, setMenuPlacement] = useState<'up' | 'down'>('down');
  const [editingFolder, setEditingFolder] = useState<FolderType | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#ff70a6');
  const [editSecondary, setEditSecondary] = useState('#ff9770');

  const handleTitleBarDoubleClick = (event: React.MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('button, input, select, a')) return;
    if ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)
      void getCurrentWindow().toggleMaximize();
  };

  useEffect(() => {
    if (!menu) return;
    const closeMenu = (event: PointerEvent) => {
      const target = event.target as Element;
      if (target.closest('.sidebar-context-menu, .sidebar-more')) return;
      setMenu(null);
    };
    window.addEventListener('pointerdown', closeMenu);
    return () => window.removeEventListener('pointerdown', closeMenu);
  }, [menu]);

  const toggleMenu = (type: 'folder' | 'tag', id: string, anchor: HTMLElement) => {
    const rect = anchor.getBoundingClientRect();
    setMenuPlacement(rect.bottom + 180 > window.innerHeight ? 'up' : 'down');
    setMenu(menu?.id === id ? null : { type, id });
  };
  const libraryItems = [
    { label: 'Notes', icon: BookOpen, color: '#4c9bff', value: { type: 'all' } as LibraryFilter },
    {
      label: 'Starred',
      icon: Heart,
      color: '#f19b3f',
      value: { type: 'favorites' } as LibraryFilter,
    },
    {
      label: 'Archive',
      icon: Archive,
      color: '#8f65e9',
      value: { type: 'archive' } as LibraryFilter,
    },
    { label: 'Trash', icon: Trash2, color: '#f19b3f', value: { type: 'trash' } as LibraryFilter },
  ];

  return (
    <aside className={collapsed ? 'sidebar app-panel collapsed' : 'sidebar app-panel'}>
      <div className="brand-row" data-tauri-drag-region onDoubleClick={handleTitleBarDoubleClick}>
        <img
          className="celestine-logo"
          src="/celestine-mark.svg"
          alt=""
          onDoubleClick={handleTitleBarDoubleClick}
        />
        <div className="brand-copy" onDoubleClick={handleTitleBarDoubleClick}>
          <strong>Celestine</strong>
          <span>your universe of ideas ✦</span>
        </div>
        <button
          className="sidebar-collapse"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Library">
        <button
          className={view === 'home' ? 'nav-item active' : 'nav-item'}
          onClick={() => onViewChange('home')}
          title="Home"
          aria-label="Home"
        >
          <House size={16} strokeWidth={1.8} />
          <span>Home</span>
        </button>
        {libraryItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              className={
                view === 'notes' && filterMatches(filter, item.value)
                  ? 'nav-item active'
                  : 'nav-item'
              }
              key={item.label}
              onClick={() => {
                onFilterChange(item.value);
                onViewChange('notes');
              }}
              title={item.label}
              aria-label={item.label}
              style={{ '--item-color': item.color } as React.CSSProperties}
            >
              <Icon size={16} strokeWidth={1.8} />
              <span>{item.label}</span>
            </button>
          );
        })}
        <button
          className={view === 'templates' ? 'nav-item active' : 'nav-item'}
          onClick={() => onViewChange('templates')}
          title="Templates"
          aria-label="Templates"
        >
          <LayoutTemplate size={16} strokeWidth={1.8} />
          <span>Templates</span>
        </button>

        <div className="section-heading">
          <p className="section-label">Projects</p>
          <button className="icon-button subtle" onClick={onCreateFolder} aria-label="New project">
            <Plus size={15} />
          </button>
        </div>
        {folders
          .filter((folder) => folder.id !== 'inbox' && !folder.parentId)
          .map((folder) => {
            const value = { type: 'folder', id: folder.id } as LibraryFilter;
            const childFolders = folders.filter((child) => child.parentId === folder.id);
            const isMenuOpen = menu?.type === 'folder' && menu.id === folder.id;

            return (
              <div key={folder.id} className="project-group">
                <div className={isMenuOpen ? 'sidebar-row has-menu-open' : 'sidebar-row'}>
                  <button
                    className={filterMatches(filter, value) ? 'nav-item active' : 'nav-item'}
                    onClick={() => onFilterChange(value)}
                    title={folder.name}
                    aria-label={folder.name}
                    style={{ '--item-color': folder.color } as React.CSSProperties}
                  >
                    {folder.icon ? (
                      <span aria-hidden="true">{folder.icon}</span>
                    ) : (
                      <LiquidOrb
                        primaryColor={folder.color || '#3b82f6'}
                        secondaryColor={folder.secondaryColor}
                        size={18}
                      />
                    )}
                    <span>{folder.name}</span>
                    {childFolders.length > 0 ? (
                      <ChevronDown size={14} className="project-chevron" />
                    ) : (
                      <ChevronRight size={14} className="project-chevron" />
                    )}
                  </button>
                  <button
                    className={isMenuOpen ? 'sidebar-more active' : 'sidebar-more'}
                    onPointerDown={(event) => event.stopPropagation()}
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleMenu('folder', folder.id, event.currentTarget);
                    }}
                    aria-label={`Actions for ${folder.name}`}
                    title="Project options"
                  >
                    <MoreHorizontal size={15} />
                  </button>
                  {isMenuOpen ? (
                    <div
                      className={`sidebar-context-menu ${menuPlacement === 'up' ? 'open-up' : ''}`}
                      onPointerDown={(event) => event.stopPropagation()}
                      onMouseDown={(event) => event.stopPropagation()}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          onCreateProjectFolder(folder.id);
                          setMenu(null);
                        }}
                      >
                        New folder
                      </button>
                      <button
                        onClick={() => {
                          setEditingFolder(folder);
                          setEditName(folder.name);
                          setEditColor(folder.color);
                          setEditSecondary(
                            folder.secondaryColor || getSecondaryColor(folder.color),
                          );
                          setMenu(null);
                        }}
                      >
                        Edit project
                      </button>
                      <button
                        onClick={() => {
                          onChangeFolderIcon(folder.id);
                          setMenu(null);
                        }}
                      >
                        Change icon
                      </button>
                      <button
                        onClick={() => {
                          onDuplicateFolder(folder.id);
                          setMenu(null);
                        }}
                      >
                        Duplicate
                      </button>
                      <button
                        className="danger"
                        onClick={() => {
                          onDeleteFolder(folder.id);
                          setMenu(null);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
                {!collapsed && childFolders.length > 0 && (
                  <div className="child-folders-tree">
                    {childFolders.map((child) => {
                      const isChildActive = filterMatches(filter, { type: 'folder', id: child.id });
                      const isChildMenuOpen = menu?.type === 'folder' && menu.id === child.id;

                      return (
                        <div
                          className={isChildMenuOpen ? 'sidebar-row has-menu-open' : 'sidebar-row'}
                          key={child.id}
                        >
                          <button
                            className={
                              isChildActive
                                ? 'nav-item child-folder active'
                                : 'nav-item child-folder'
                            }
                            onClick={() => {
                              onFilterChange({ type: 'folder', id: child.id });
                              onViewChange('notes');
                            }}
                            title={child.name}
                          >
                            <span
                              className="child-folder-dot"
                              style={{ background: child.color || '#f97316' }}
                            />
                            <span>{child.name}</span>
                          </button>
                          <button
                            className={isChildMenuOpen ? 'sidebar-more active' : 'sidebar-more'}
                            onPointerDown={(event) => event.stopPropagation()}
                            onMouseDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleMenu('folder', child.id, event.currentTarget);
                            }}
                            aria-label={`Actions for ${child.name}`}
                            title="Space options"
                          >
                            <MoreHorizontal size={14} />
                          </button>
                          {isChildMenuOpen ? (
                            <div
                              className={`sidebar-context-menu ${menuPlacement === 'up' ? 'open-up' : ''}`}
                              onPointerDown={(event) => event.stopPropagation()}
                              onMouseDown={(event) => event.stopPropagation()}
                              onClick={(event) => event.stopPropagation()}
                            >
                              <button
                                onClick={() => {
                                  onRenameFolder(child.id);
                                  setMenu(null);
                                }}
                              >
                                Rename space
                              </button>
                              <button
                                onClick={() => {
                                  onRecolorFolder(child.id);
                                  setMenu(null);
                                }}
                              >
                                Change color
                              </button>
                              <button
                                className="danger"
                                onClick={() => {
                                  onDeleteFolder(child.id);
                                  setMenu(null);
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

        <div className="section-heading tag-heading">
          <p className="section-label">Tags</p>
        </div>
        <div className="tag-stack">
          {tags.map((tag) => {
            const value = { type: 'tag', id: tag.id } as LibraryFilter;
            const Icon = tag.id === 'thinking' ? Brain : PenLine;

            return (
              <div className="sidebar-row" key={tag.id}>
                <button
                  className={filterMatches(filter, value) ? 'tag-filter active' : 'tag-filter'}
                  onClick={() => {
                    onFilterChange(value);
                    onViewChange('notes');
                  }}
                  title={tag.name}
                  aria-label={tag.name}
                  style={{ '--item-color': tag.color } as React.CSSProperties}
                >
                  <Icon size={17} strokeWidth={1.8} />
                  <span>{tag.name}</span>
                  <span className="nav-color-dot" style={{ background: tag.color }} />
                </button>
                <button
                  className="sidebar-more"
                  onPointerDown={(event) => event.stopPropagation()}
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleMenu('tag', tag.id, event.currentTarget);
                  }}
                  aria-label={`Actions for ${tag.name}`}
                  title="Tag actions"
                >
                  <MoreHorizontal size={15} />
                </button>
                {menu?.type === 'tag' && menu.id === tag.id ? (
                  <div
                    className={`sidebar-context-menu ${menuPlacement === 'up' ? 'open-up' : ''}`}
                    onPointerDown={(event) => event.stopPropagation()}
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        onRenameTag(tag.id);
                        setMenu(null);
                      }}
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => {
                        onRecolorTag(tag.id);
                        setMenu(null);
                      }}
                    >
                      Change color
                    </button>
                    <button
                      className="danger"
                      onClick={() => {
                        onDeleteTag(tag.id);
                        setMenu(null);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </nav>

      <button
        className="nav-item settings-link"
        onClick={onOpenSettings}
        title="Settings"
        aria-label="Settings"
      >
        <Settings size={16} strokeWidth={1.8} />
        <span>Settings</span>
        <ChevronRight size={14} className="settings-chevron" />
      </button>

      {editingFolder && (
        <div className="overlay-backdrop" onClick={() => setEditingFolder(null)}>
          <div className="modal-dialog edit-project-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit project</h3>
              <button className="close-btn" onClick={() => setEditingFolder(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <label className="field-group">
                <span>Project Name</span>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Project name"
                  autoFocus
                />
              </label>

              <div className="field-group">
                <span>Liquid Orb Color</span>
                <div className="orb-presets-grid">
                  {LIGHT_ORB_PRESETS.map((preset) => {
                    const isSelected =
                      editColor === preset.primary && editSecondary === preset.secondary;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        className={`orb-preset-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => {
                          setEditColor(preset.primary);
                          setEditSecondary(preset.secondary);
                        }}
                        title={preset.label}
                      >
                        <LiquidOrb
                          primaryColor={preset.primary}
                          secondaryColor={preset.secondary}
                          size={28}
                        />
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  className="randomize-color-btn"
                  onClick={() => {
                    const pair = getRandomOrbColorPair();
                    setEditColor(pair.primary);
                    setEditSecondary(pair.secondary);
                  }}
                >
                  <Shuffle size={14} /> Randomize color
                </button>
              </div>

              {/* Live Preview */}
              <div className="orb-live-preview">
                <span>Preview:</span>
                <div className="preview-pill">
                  <LiquidOrb primaryColor={editColor} secondaryColor={editSecondary} size={22} />
                  <strong>{editName || 'Project Name'}</strong>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary-flat" onClick={() => setEditingFolder(null)}>
                Cancel
              </button>
              <button
                className="btn-primary-flat"
                onClick={() => {
                  if (editName.trim()) {
                    if (onUpdateFolder) {
                      onUpdateFolder(editingFolder.id, editName.trim(), editColor, editSecondary);
                    } else {
                      onRenameFolder(editingFolder.id);
                    }
                  }
                  setEditingFolder(null);
                }}
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
