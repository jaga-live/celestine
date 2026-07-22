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
  { type: 'all' } | { type: 'favorites' } | { type: 'trash' } | { type: 'folder'; id: string };

interface SidebarProps {
  folders: FolderType[];
  filter: LibraryFilter;
  onFilterChange: (filter: LibraryFilter) => void;
  onCreateFolder: () => void;
  onCreateProjectFolder: (projectId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onRenameFolder: (folderId: string) => void;
  onRecolorFolder: (folderId: string) => void;
  onUpdateFolder?: (folderId: string, name: string, color: string, secondaryColor?: string) => void;
  onDuplicateFolder: (folderId: string) => void;
  onChangeFolderIcon: (folderId: string) => void;
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
  filter,
  onFilterChange,
  onCreateFolder,
  onCreateProjectFolder,
  onDeleteFolder,
  onRenameFolder,
  onRecolorFolder,
  onUpdateFolder,
  onDuplicateFolder,
  onChangeFolderIcon,
  onOpenSettings,
  collapsed,
  onToggleCollapsed,
  view,
  onViewChange,
}: SidebarProps) {
  const [menu, setMenu] = useState<{ type: 'folder'; id: string } | null>(null);
  const [menuPlacement, setMenuPlacement] = useState<'up' | 'down'>('down');
  const [editingFolder, setEditingFolder] = useState<FolderType | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#ff70a6');
  const [editSecondary, setEditSecondary] = useState('#ff9770');
  const toggleMenu = (type: 'folder', id: string, anchor: HTMLElement) => {
    const rect = anchor.getBoundingClientRect();

    setMenuPlacement(rect.bottom + 190 > window.innerHeight ? 'up' : 'down');
    setMenu((prev) => (prev?.id === id ? null : { type, id }));
  };

  const libraryItems = [
    { label: 'Notes', icon: BookOpen, color: '#4c9bff', value: { type: 'all' } as LibraryFilter },
    {
      label: 'Starred',
      icon: Heart,
      color: '#f19b3f',
      value: { type: 'favorites' } as LibraryFilter,
    },
    { label: 'Trash', icon: Trash2, color: '#f19b3f', value: { type: 'trash' } as LibraryFilter },
  ];

  return (
    <aside className={collapsed ? 'sidebar app-panel collapsed' : 'sidebar app-panel'}>
      {menu ? (
        <div
          className="sidebar-menu-overlay"
          onClick={(event) => {
            event.stopPropagation();
            event.preventDefault();
            setMenu(null);
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
            event.preventDefault();
            setMenu(null);
          }}
        />
      ) : null}
      <div className="brand-row" data-tauri-drag-region>
        <img className="celestine-logo" src="/celestine-icon.png" alt="" data-tauri-drag-region />
        <div className="brand-copy" data-tauri-drag-region>
          <strong data-tauri-drag-region>Celestine</strong>
          <span data-tauri-drag-region>your universe of ideas ✦</span>
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

      <div className="sidebar-brand-divider" />

      <nav className="sidebar-nav" aria-label="Library" style={{ marginTop: '2px' }}>
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

        <div className="section-heading project-heading">
          <p className="section-label">Projects</p>
          <button
            className="icon-button subtle add-project-btn"
            onClick={onCreateFolder}
            aria-label="New space"
            title="New space"
          >
            <Plus size={14} />
          </button>
        </div>

        {folders
          .filter((folder) => folder.id !== 'inbox' && !folder.parentId)
          .map((folder) => {
            const childFolders = folders.filter((child) => child.parentId === folder.id);

            return (
              <ProjectItemRow
                key={folder.id}
                folder={folder}
                childFolders={childFolders}
                filter={filter}
                onFilterChange={onFilterChange}
                onCreateProjectFolder={onCreateProjectFolder}
                onEditFolder={(f) => {
                  setEditingFolder(f);
                  setEditName(f.name);
                  setEditColor(f.color);
                  setEditSecondary(f.secondaryColor || getSecondaryColor(f.color));
                }}
                onChangeFolderIcon={onChangeFolderIcon}
                onDuplicateFolder={onDuplicateFolder}
                onDeleteFolder={onDeleteFolder}
                collapsed={collapsed}
                onViewChange={onViewChange}
                onRenameFolder={onRenameFolder}
                onRecolorFolder={onRecolorFolder}
              />
            );
          })}
      </nav>

      <div className="sidebar-footer">
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
      </div>

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

function ProjectItemRow({
  folder,
  childFolders,
  filter,
  onFilterChange,
  onCreateProjectFolder,
  onEditFolder,
  onChangeFolderIcon,
  onDuplicateFolder,
  onDeleteFolder,
  collapsed,
  onViewChange,
  onRenameFolder,
  onRecolorFolder,
}: {
  folder: FolderType;
  childFolders: FolderType[];
  filter: LibraryFilter;
  onFilterChange: (filter: LibraryFilter) => void;
  onCreateProjectFolder: (id: string) => void;
  onEditFolder: (folder: FolderType) => void;
  onChangeFolderIcon: (id: string) => void;
  onDuplicateFolder: (id: string) => void;
  onDeleteFolder: (id: string) => void;
  collapsed: boolean;
  onViewChange: (view: 'home' | 'notes' | 'templates') => void;
  onRenameFolder: (id: string) => void;
  onRecolorFolder: (id: string) => void;
}) {
  const [menuCoords, setMenuCoords] = useState<{ top: number; right: number } | null>(null);
  const value = { type: 'folder', id: folder.id } as LibraryFilter;
  const isActive = filterMatches(filter, value);

  useEffect(() => {
    if (!menuCoords) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target.closest('.sidebar-context-menu, .sidebar-more')) return;
      setMenuCoords(null);
    };

    const animFrame = requestAnimationFrame(() => {
      window.addEventListener('click', handleOutsideClick);
    });

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener('click', handleOutsideClick);
    };
  }, [menuCoords]);

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (menuCoords) {
      setMenuCoords(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const openUp = rect.bottom + 190 > window.innerHeight;
    setMenuCoords({
      top: openUp ? rect.top - 180 : rect.bottom + 4,
      right: Math.max(12, window.innerWidth - rect.right),
    });
  };

  return (
    <div className="project-group">
      <div
        className={
          isActive ? 'sidebar-row active' : menuCoords ? 'sidebar-row has-menu-open' : 'sidebar-row'
        }
      >
        <button
          className="sidebar-row-click-target"
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
          {collapsed ? null : <span className="folder-label">{folder.name}</span>}
        </button>
        {collapsed ? null : (
          <button
            className={menuCoords ? 'sidebar-more active' : 'sidebar-more'}
            onClick={handleToggle}
            aria-label={`Actions for ${folder.name}`}
            title="Project options"
          >
            <MoreHorizontal size={15} />
          </button>
        )}
        {menuCoords ? (
          <div
            className="sidebar-context-menu"
            style={{
              position: 'fixed',
              top: `${menuCoords.top}px`,
              right: `${menuCoords.right}px`,
              zIndex: 9999,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                onCreateProjectFolder(folder.id);
                setMenuCoords(null);
              }}
            >
              New folder
            </button>
            <button
              onClick={() => {
                onEditFolder(folder);
                setMenuCoords(null);
              }}
            >
              Edit project
            </button>
            <button
              onClick={() => {
                onChangeFolderIcon(folder.id);
                setMenuCoords(null);
              }}
            >
              Change icon
            </button>
            <button
              onClick={() => {
                onDuplicateFolder(folder.id);
                setMenuCoords(null);
              }}
            >
              Duplicate
            </button>
            <button
              className="danger"
              onClick={() => {
                onDeleteFolder(folder.id);
                setMenuCoords(null);
              }}
            >
              Delete
            </button>
          </div>
        ) : null}
      </div>

      {!collapsed && childFolders.length > 0 && (
        <div className="child-folders-tree">
          {childFolders.map((child) => (
            <SubfolderItemRow
              key={child.id}
              child={child}
              filter={filter}
              onFilterChange={onFilterChange}
              onViewChange={onViewChange}
              onRenameFolder={onRenameFolder}
              onRecolorFolder={onRecolorFolder}
              onDuplicateFolder={onDuplicateFolder}
              onDeleteFolder={onDeleteFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SubfolderItemRow({
  child,
  filter,
  onFilterChange,
  onViewChange,
  onRenameFolder,
  onRecolorFolder,
  onDuplicateFolder,
  onDeleteFolder,
}: {
  child: FolderType;
  filter: LibraryFilter;
  onFilterChange: (filter: LibraryFilter) => void;
  onViewChange: (view: 'home' | 'notes' | 'templates') => void;
  onRenameFolder: (id: string) => void;
  onRecolorFolder: (id: string) => void;
  onDuplicateFolder: (id: string) => void;
  onDeleteFolder: (id: string) => void;
}) {
  const [menuCoords, setMenuCoords] = useState<{ top: number; right: number } | null>(null);
  const isChildActive = filterMatches(filter, { type: 'folder', id: child.id });

  useEffect(() => {
    if (!menuCoords) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target.closest('.sidebar-context-menu, .sidebar-more')) return;
      setMenuCoords(null);
    };

    const animFrame = requestAnimationFrame(() => {
      window.addEventListener('click', handleOutsideClick);
    });

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener('click', handleOutsideClick);
    };
  }, [menuCoords]);

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (menuCoords) {
      setMenuCoords(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const openUp = rect.bottom + 190 > window.innerHeight;
    setMenuCoords({
      top: openUp ? rect.top - 180 : rect.bottom + 4,
      right: Math.max(12, window.innerWidth - rect.right),
    });
  };

  return (
    <div
      className={
        isChildActive
          ? 'sidebar-row child-folder active'
          : menuCoords
            ? 'sidebar-row child-folder has-menu-open'
            : 'sidebar-row child-folder'
      }
    >
      <button
        className="sidebar-row-click-target"
        onClick={() => {
          onFilterChange({ type: 'folder', id: child.id });
          onViewChange('notes');
        }}
        title={child.name}
      >
        <span className="child-folder-dot" style={{ background: child.color || '#f97316' }} />
        <span className="folder-label">{child.name}</span>
      </button>
      <button
        className={menuCoords ? 'sidebar-more active' : 'sidebar-more'}
        onClick={handleToggle}
        aria-label={`Actions for ${child.name}`}
        title="Space options"
      >
        <MoreHorizontal size={14} />
      </button>
      {menuCoords ? (
        <div
          className="sidebar-context-menu"
          style={{
            position: 'fixed',
            top: `${menuCoords.top}px`,
            right: `${menuCoords.right}px`,
            zIndex: 9999,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              onRenameFolder(child.id);
              setMenuCoords(null);
            }}
          >
            Rename space
          </button>
          <button
            onClick={() => {
              onRecolorFolder(child.id);
              setMenuCoords(null);
            }}
          >
            Change color
          </button>
          <button
            onClick={() => {
              onDuplicateFolder(child.id);
              setMenuCoords(null);
            }}
          >
            Duplicate
          </button>
          <button
            className="danger"
            onClick={() => {
              onDeleteFolder(child.id);
              setMenuCoords(null);
            }}
          >
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}
