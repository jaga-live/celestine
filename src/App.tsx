import { useEffect, useMemo, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { defaultWorkspace } from './data/defaultWorkspace';
import { DocumentEditor } from './components/DocumentEditor';
import { EditorHeader } from './components/EditorHeader';
import { EditorSettingsModal } from './components/EditorSettingsModal';
import { InfiniteCanvas } from './components/InfiniteCanvas';
import { NotesList } from './components/NotesList';
import { SettingsPanel } from './components/SettingsPanel';
import { Sidebar, type LibraryFilter } from './components/Sidebar';
import { ToolDock } from './components/ToolDock';
import { HomeDesk, type CelestineTemplate } from './components/HomeDesk';
import { CommandPalette } from './components/CommandPalette';
import { QuickCapturePanel } from './components/QuickCapturePanel';
import { TemplatesView } from './components/LibraryViews';
import { ProjectDesk } from './components/ProjectDesk';
import { AudioRecorderPanel } from './components/AudioRecorderPanel';
import { TextInputDialog } from './components/TextInputDialog';
import { ConfirmationDialog } from './components/ConfirmationDialog';
import {
  getGoogleAuthStatus,
  signInWithGoogle,
  signOutFromGoogle,
  type GoogleAuthState,
} from './lib/googleAuth';
import { FileText } from 'lucide-react';
import { downloadMarkdown } from './lib/markdown';
import { loadWorkspace, saveWorkspace } from './lib/storage';
import { processTranscript } from './lib/transcriptProcessor';
import { getRandomOrbColorPair } from './components/LiquidOrb';
import type { Note, NoteMode, Settings, Tool, Workspace } from './types';

const makeId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const fileDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

export default function App() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [filter, setFilter] = useState<LibraryFilter>({ type: 'all' });
  const [search, setSearch] = useState('');
  const [noteView, setNoteView] = useState<'list' | 'grid'>('list');
  const [filterSorts, setFilterSorts] = useState<Record<string, 'updated' | 'created' | 'title'>>(
    () => {
      try {
        const stored = localStorage.getItem('celestine_filter_sorts');
        return stored ? JSON.parse(stored) : {};
      } catch {
        return {};
      }
    },
  );

  const getFilterKey = (f: LibraryFilter) => `${f.type}-${f.type === 'folder' ? f.id : ''}`;

  const noteSort = useMemo(() => {
    const key = getFilterKey(filter);
    return filterSorts[key] || 'updated';
  }, [filter, filterSorts]);

  const handleSortChange = (newSort: 'updated' | 'created' | 'title') => {
    const key = getFilterKey(filter);
    const next = { ...filterSorts, [key]: newSort };
    setFilterSorts(next);
    try {
      localStorage.setItem('celestine_filter_sorts', JSON.stringify(next));
    } catch (e) {
      console.error(e);
    }
  };
  const [tool, setTool] = useState<Tool>('text');
  const [libraryVisible, setLibraryVisible] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editorSettingsOpen, setEditorSettingsOpen] = useState(false);
  const [homeOpen, setHomeOpen] = useState(true);
  const [dashboardView, setDashboardView] = useState<'home' | 'templates' | 'project'>('home');
  const [commandOpen, setCommandOpen] = useState(false);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  const [audioNoteId, setAudioNoteId] = useState<string | null>(null);
  const [transcribingNoteId, setTranscribingNoteId] = useState<string | null>(null);
  const [textDialog, setTextDialog] = useState<null | {
    title: string;
    label: string;
    initialValue?: string;
    placeholder?: string;
    validate?: (value: string) => string | null;
    onConfirm: (value: string) => void;
  }>(null);
  const [confirmation, setConfirmation] = useState<null | {
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  }>(null);
  const [googleAuth, setGoogleAuth] = useState<GoogleAuthState>({ status: 'loading' });
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'failed'>('saved');
  const hydrated = useRef(false);

  useEffect(() => {
    loadWorkspace().then((storedWorkspace) => {
      setWorkspace(storedWorkspace ?? defaultWorkspace);
      hydrated.current = true;
    });
  }, []);

  useEffect(() => {
    getGoogleAuthStatus()
      .then((profile) =>
        setGoogleAuth(profile ? { status: 'signed-in', profile } : { status: 'signed-out' }),
      )
      .catch((error: unknown) =>
        setGoogleAuth({
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        }),
      );
  }, []);

  useEffect(() => {
    try {
      getCurrentWindow()
        .maximize()
        .catch(() => {});
    } catch {
      // Ignore if not in desktop window environment
    }
  }, []);

  useEffect(() => {
    if (!workspace) {
      return;
    }

    document.documentElement.setAttribute('data-theme', workspace.settings.theme);
  }, [workspace?.settings.theme]);

  useEffect(() => {
    if (!workspace || !hydrated.current) {
      return;
    }

    setSaveState('saving');
    const timeout = window.setTimeout(() => {
      saveWorkspace(workspace)
        .then(() => setSaveState('saved'))
        .catch(() => setSaveState('failed'));
    }, 650);

    return () => window.clearTimeout(timeout);
  }, [workspace]);

  useEffect(() => {
    if (!workspace) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;

      const opensDevTools =
        event.key === 'F12' ||
        ((event.metaKey || event.ctrlKey) &&
          event.altKey &&
          ['i', 'j', 'c'].includes(event.key.toLowerCase())) ||
        ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'i');
      if (opensDevTools) {
        event.preventDefault();
        return;
      }

      if (target.matches('input, textarea, select') || target.isContentEditable) {
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key === ',') {
        event.preventDefault();
        setSettingsOpen(true);

        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'q') {
        event.preventDefault();
        const mode = workspace.settings.confirmQuit ?? 'ask';

        if (mode === 'ask') {
          setConfirmation({
            title: 'Quit Celestine?',
            message: 'Are you sure you want to exit Celestine?',
            confirmLabel: 'Quit',
            onConfirm: () => {
              getCurrentWindow()
                .close()
                .catch(() => window.close());
            },
          });
        } else {
          getCurrentWindow()
            .close()
            .catch(() => window.close());
        }

        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen(true);

        return;
      }

      const key = event.key.toLowerCase();
      const hasModifier = event.metaKey || event.ctrlKey || event.altKey;
      const globalShortcuts = workspace.settings.globalShortcuts ?? {
        quickNote: 'q',
        newNote: 'n',
        canvas: 'd',
        meeting: 'm',
      };

      if (!hasModifier) {
        if (key === (globalShortcuts.quickNote ?? 'q')) {
          event.preventDefault();
          createNote('document', 'thought');

          return;
        }

        const shortcutEntry = Object.entries(workspace.settings.shortcuts).find(
          ([, shortcut]) => shortcut === key,
        );

        if (shortcutEntry) {
          setTool(shortcutEntry[0] as Tool);

          return;
        }
      }

      if ((event.metaKey || event.ctrlKey) && event.shiftKey) {
        const command = Object.entries(globalShortcuts).find(([, val]) => val === key)?.[0];

        if (command) {
          event.preventDefault();
          if (command === 'newNote') {
            createNote('document', 'blank');
          } else if (command === 'canvas') {
            createNote('canvas', 'blank');
          } else if (command === 'meeting') {
            createNote('document', 'meeting');
          }

          return;
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);

    const preventBrowserContextMenu = (event: MouseEvent) => event.preventDefault();
    window.addEventListener('contextmenu', preventBrowserContextMenu);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('contextmenu', preventBrowserContextMenu);
    };
  }, [workspace]);

  const activeNote = workspace?.notes.find((note) => note.id === workspace.activeNoteId) ?? null;

  useEffect(() => {
    if (activeNote?.mode === 'document' && !['text', 'pen', 'eraser'].includes(tool)) {
      setTool('text');
    }
  }, [activeNote?.mode, tool]);

  const visibleNotes = useMemo(() => {
    if (!workspace) {
      return [];
    }

    return workspace.notes
      .filter((note) => {
        if (filter.type !== 'trash' && note.deletedAt) return false;
        if (filter.type === 'favorites') {
          return note.favorite && !note.deletedAt;
        }
        if (filter.type === 'trash') {
          return Boolean(note.deletedAt);
        }

        if (filter.type === 'folder') {
          const nestedFolderIds = workspace.folders
            .filter((folder) => folder.parentId === filter.id)
            .map((folder) => folder.id);
          return note.folderId === filter.id || nestedFolderIds.includes(note.folderId);
        }

        return !note.deletedAt;
      })
      .filter((note) => {
        const term = search.toLowerCase();
        const content = note.pages.map((page) => page.html.replace(/<[^>]*>/g, ' ')).join(' ');
        const folder = workspace.folders.find((item) => item.id === note.folderId)?.name ?? '';

        return `${note.title} ${content} ${folder}`.toLowerCase().includes(term);
      })
      .sort((left, right) =>
        noteSort === 'title'
          ? left.title.localeCompare(right.title)
          : noteSort === 'created'
            ? (right.createdAt ?? right.updatedAt) - (left.createdAt ?? left.updatedAt)
            : right.updatedAt - left.updatedAt,
      );
  }, [filter, noteSort, search, workspace]);

  useEffect(() => {
    if (!workspace) return;

    // Check if the current activeNoteId is in visibleNotes
    const isActiveInVisible = visibleNotes.some((n) => n.id === workspace.activeNoteId);

    if (!isActiveInVisible) {
      if (visibleNotes.length > 0) {
        // Select the first visible note
        setWorkspace((prev) =>
          prev
            ? {
                ...prev,
                activeNoteId: visibleNotes[0].id,
              }
            : prev,
        );
      } else {
        // Empty folder/filter, select nothing
        setWorkspace((prev) =>
          prev
            ? {
                ...prev,
                activeNoteId: '',
              }
            : prev,
        );
      }
    }
  }, [visibleNotes, workspace?.activeNoteId]);
  const filterTitle = useMemo(() => {
    if (!workspace) {
      return 'Notes';
    }

    if (filter.type === 'favorites') {
      return 'Favorites';
    }

    if (filter.type === 'folder') {
      return workspace.folders.find((folder) => folder.id === filter.id)?.name ?? 'Folder';
    }

    if (filter.type === 'trash') return 'Trash';

    return 'Notes';
  }, [filter, workspace]);

  const filterBreadcrumb = useMemo(() => {
    if (!workspace || filter.type !== 'folder') return undefined;
    const currentFolder = workspace.folders.find((f) => f.id === filter.id);
    if (!currentFolder || !currentFolder.parentId) return undefined;
    const parentFolder = workspace.folders.find((f) => f.id === currentFolder.parentId);
    if (!parentFolder) return undefined;

    return `${parentFolder.name} / ${currentFolder.name}`;
  }, [filter, workspace]);

  if (!workspace) {
    return (
      <main className="loading-screen">
        <img className="loading-crystal" src="/celestine-icon.png" alt="" />
        <h1 className="loading-brand">Celestine</h1>
      </main>
    );
  }

  const updateNote = (nextNote: Note) => {
    setWorkspace({
      ...workspace,
      notes: workspace.notes.map((note) => (note.id === nextNote.id ? nextNote : note)),
    });
  };

  const createNote = (
    mode: NoteMode = 'document',
    template: CelestineTemplate = 'blank',
    quickCapture = false,
    targetFolderId?: string,
  ) => {
    if (filter.type === 'trash') {
      setFilter({ type: 'all' });
    }

    const folderId = targetFolderId ?? (filter.type === 'folder' ? filter.id : 'inbox');
    const timestampLabel = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(Date.now());
    const templates: Record<CelestineTemplate, { title: string; html: string }> = {
      study: {
        title: 'Study notes',
        html: '<h1>Study notes</h1><p><em>What do I want to understand today?</em></p><h2>Core idea</h2><p>Explain the concept in your own words. Clarity arrives when you can make it simple.</p><h2>Questions to return to</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>What surprised me?</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Can I teach this without looking?</p></div></li></ul>',
      },
      system: { title: 'System design workspace', html: '' },
      meeting: {
        title: 'Meeting notes',
        html: '<h1>Meeting notes</h1><p><strong>Purpose</strong> · What decision are we here to make?</p><h2>Signals</h2><ul><li>What changed since we last met?</li><li>What needs attention?</li></ul><h2>Decisions</h2><p>Capture the outcome, owner, and next move.</p><h2>Actions</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Next action · Owner · Date</p></div></li></ul>',
      },
      mindmap: { title: 'Mind map', html: '' },
      revision: {
        title: 'Revision deck',
        html: '<h1>Revision deck</h1><p><em>Recall first. Review second.</em></p><h2>Question 01</h2><p>Write the prompt here, then hide the answer below.</p><blockquote><p>The answer, in the fewest useful words.</p></blockquote><h2>Confidence</h2><p>○ New &nbsp;&nbsp; ○ Learning &nbsp;&nbsp; ○ Known</p>',
      },
      thought: {
        title: `Note - ${timestampLabel}`,
        html: `<h1>Note - ${timestampLabel}</h1><ul><li><p></p></li></ul>`,
      },
      audio: {
        title: 'Audio note',
        html: '<h1>Audio note</h1><p><em>Your live transcript will appear here.</em></p><h2>Summary</h2><p>Celestine will gather the key ideas after you finish recording.</p>',
      },
      blank: { title: 'Untitled canvas', html: '' },
    };
    const quickTemplates: Partial<Record<CelestineTemplate, { title: string; html: string }>> = {
      thought: {
        title: `Note - ${timestampLabel}`,
        html: `<h1>Note - ${timestampLabel}</h1><ul><li><p></p></li></ul>`,
      },
      meeting: {
        title: `Meeting notes · ${timestampLabel}`,
        html: `<h1>Meeting notes · ${timestampLabel}</h1><ul><li><p></p></li></ul>`,
      },
    };
    const selected = (quickCapture ? quickTemplates[template] : undefined) ?? templates[template];
    const note: Note = {
      id: makeId('note'),
      title: template === 'blank' && mode === 'document' ? 'Untitled note' : selected.title,
      mode,
      folderId,
      favorite: false,
      updatedAt: Date.now(),
      createdAt: Date.now(),
      openedAt: Date.now(),
      openCount: 1,
      captureKind:
        template === 'thought'
          ? 'quick'
          : template === 'audio'
            ? 'audio'
            : mode === 'canvas'
              ? 'drawing'
              : 'standard',
      objects: [],
      pages: mode === 'document' ? [{ id: makeId('page'), html: selected.html, objects: [] }] : [],
      camera: { x: 0, y: 0, zoom: 1 },
      canvasColor: '#000000',
      canvasPattern: workspace.settings.defaultCanvasPattern ?? 'plain',
    };

    if (template === 'system' && mode === 'canvas') {
      note.canvasPattern = 'grid';
      note.camera = { x: 24, y: 42, zoom: 1 };
      note.objects = [
        {
          id: makeId('text'),
          type: 'text',
          x: 60,
          y: 40,
          width: 540,
          html: '<h1>System design workspace</h1><p>Example architecture · request flow, gateway &amp; storage</p>',
          createdAt: Date.now(),
        },
        {
          id: makeId('shape'),
          type: 'shape',
          shape: 'rectangle',
          x: 60,
          y: 190,
          width: 170,
          height: 100,
          color: '#4c9bff',
          createdAt: Date.now(),
        },
        {
          id: makeId('text'),
          type: 'text',
          x: 75,
          y: 218,
          width: 140,
          html: '<p style="text-align: center;"><strong>Web App</strong></p><p style="text-align: center; font-size: 12px; color: rgba(255,255,255,0.7);">Upload image</p>',
          createdAt: Date.now(),
        },
        {
          id: makeId('shape'),
          type: 'shape',
          shape: 'arrow',
          x: 230,
          y: 240,
          width: 70,
          height: 0,
          color: '#9eb6d2',
          createdAt: Date.now(),
        },
        {
          id: makeId('shape'),
          type: 'shape',
          shape: 'diamond',
          x: 300,
          y: 180,
          width: 150,
          height: 120,
          color: '#8f65e9',
          createdAt: Date.now(),
        },
        {
          id: makeId('text'),
          type: 'text',
          x: 315,
          y: 218,
          width: 120,
          html: '<p style="text-align: center;"><strong>API Service</strong></p><p style="text-align: center; font-size: 12px; color: rgba(255,255,255,0.7);">Validate request</p>',
          createdAt: Date.now(),
        },
        {
          id: makeId('shape'),
          type: 'shape',
          shape: 'arrow',
          x: 450,
          y: 240,
          width: 70,
          height: 0,
          color: '#9eb6d2',
          createdAt: Date.now(),
        },
        {
          id: makeId('shape'),
          type: 'shape',
          shape: 'ellipse',
          x: 520,
          y: 185,
          width: 160,
          height: 110,
          color: '#62b58f',
          createdAt: Date.now(),
        },
        {
          id: makeId('text'),
          type: 'text',
          x: 535,
          y: 218,
          width: 130,
          html: '<p style="text-align: center;"><strong>Object Store</strong></p><p style="text-align: center; font-size: 12px; color: rgba(255,255,255,0.7);">Original files</p>',
          createdAt: Date.now(),
        },
        {
          id: makeId('shape'),
          type: 'shape',
          shape: 'arrow',
          x: 375,
          y: 300,
          width: 0,
          height: 80,
          color: '#9eb6d2',
          createdAt: Date.now(),
        },
        {
          id: makeId('shape'),
          type: 'shape',
          shape: 'rectangle',
          x: 295,
          y: 380,
          width: 160,
          height: 100,
          color: '#f19b3f',
          createdAt: Date.now(),
        },
        {
          id: makeId('text'),
          type: 'text',
          x: 310,
          y: 408,
          width: 130,
          html: '<p style="text-align: center;"><strong>Job Queue</strong></p><p style="text-align: center; font-size: 12px; color: rgba(255,255,255,0.7);">Async resize</p>',
          createdAt: Date.now(),
        },
        {
          id: makeId('shape'),
          type: 'shape',
          shape: 'arrow',
          x: 455,
          y: 430,
          width: 65,
          height: 0,
          color: '#9eb6d2',
          createdAt: Date.now(),
        },
        {
          id: makeId('shape'),
          type: 'shape',
          shape: 'rectangle',
          x: 520,
          y: 380,
          width: 160,
          height: 100,
          color: '#8f65e9',
          createdAt: Date.now(),
        },
        {
          id: makeId('text'),
          type: 'text',
          x: 535,
          y: 408,
          width: 130,
          html: '<p style="text-align: center;"><strong>Worker</strong></p><p style="text-align: center; font-size: 12px; color: rgba(255,255,255,0.7);">Create variants</p>',
          createdAt: Date.now(),
        },
      ];
    }

    setWorkspace({
      ...workspace,
      activeNoteId: note.id,
      notes: [note, ...workspace.notes],
    });
    setTool('text');
    setHomeOpen(false);
    return note.id;
  };

  const openNote = (activeNoteId: string) => {
    setWorkspace({
      ...workspace,
      activeNoteId,
      notes: workspace.notes.map((note) =>
        note.id === activeNoteId
          ? { ...note, openedAt: Date.now(), openCount: (note.openCount ?? 0) + 1 }
          : note,
      ),
    });
    setHomeOpen(false);
  };

  const toggleFavorite = (noteId: string) => {
    const note = workspace.notes.find((item) => item.id === noteId);
    if (!note) return;
    const favorite = !note.favorite;
    setWorkspace({
      ...workspace,
      notes: workspace.notes.map((item) =>
        item.id === noteId ? { ...item, favorite, updatedAt: Date.now() } : item,
      ),
    });
  };

  const startAudio = () => {
    const noteId = createNote('document', 'audio');
    setAudioNoteId(noteId);
    setAudioOpen(true);
  };

  const prepareAudioForSpeech = async (dataUrl: string): Promise<string> => {
    const metadata = dataUrl.split(',')[0] || '';
    if (
      metadata.includes('wav') ||
      metadata.includes('mp4') ||
      metadata.includes('m4a') ||
      metadata.includes('aac')
    ) {
      return dataUrl;
    }
    try {
      const response = await fetch(dataUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioContext = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )({ sampleRate: 16000 });
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const channelData = audioBuffer.getChannelData(0);
      const wavBuffer = new ArrayBuffer(44 + channelData.length * 2);
      const view = new DataView(wavBuffer);
      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i += 1) view.setUint8(offset + i, string.charCodeAt(i));
      };
      writeString(0, 'RIFF');
      view.setUint32(4, 36 + channelData.length * 2, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, 16000, true);
      view.setUint32(28, 32000, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeString(36, 'data');
      view.setUint32(40, channelData.length * 2, true);
      let offset = 44;
      for (let i = 0; i < channelData.length; i += 1) {
        const sample = Math.max(-1, Math.min(1, channelData[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
        offset += 2;
      }
      await audioContext.close();
      const blob = new Blob([wavBuffer], { type: 'audio/wav' });
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result));
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn('Audio WAV preparation fallback error:', error);
      return dataUrl;
    }
  };

  const transcribeExistingNote = async (note: Note) => {
    if (!note.audioDataUrl) return;
    setTranscribingNoteId(note.id);
    try {
      const preparedDataUrl = await prepareAudioForSpeech(note.audioDataUrl);
      const transcript = await invoke<string>('transcribe_audio', { dataUrl: preparedDataUrl });
      const cleaned = transcript.trim();
      const processed = processTranscript(cleaned);
      setWorkspace((current) =>
        current
          ? {
              ...current,
              notes: current.notes.map((item) =>
                item.id === note.id
                  ? {
                      ...item,
                      transcript: cleaned,
                      updatedAt: Date.now(),
                      pages: item.pages.map((page, index) =>
                        index === 0 ? { ...page, html: processed.annotatedNoteHtml } : page,
                      ),
                    }
                  : item,
              ),
            }
          : current,
      );
      setTranscribingNoteId(null);
    } catch (error: unknown) {
      setTranscribingNoteId(null);
      window.alert(
        typeof error === 'string'
          ? error
          : error instanceof Error
            ? error.message
            : 'Transcription failed.',
      );
    }
  };

  const importFiles = (files: FileList) => {
    Array.from(files).forEach((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!file.type.startsWith('image/') && !['md', 'txt', 'pdf'].includes(extension ?? '')) {
        window.alert(
          `“${file.name}” is not supported. Choose a PDF, image, Markdown or plain-text file.`,
        );
        return;
      }
      if (extension === 'md' || extension === 'txt') {
        file.text().then((content) => {
          const noteId = makeId('note');
          const note: Note = {
            id: noteId,
            title: file.name.replace(/\.[^.]+$/, ''),
            mode: 'document',
            folderId: 'inbox',
            favorite: false,
            updatedAt: Date.now(),
            createdAt: Date.now(),
            openedAt: Date.now(),
            openCount: 1,
            captureKind: 'standard',
            objects: [],
            pages: [
              {
                id: makeId('page'),
                html: `<h1>${file.name.replace(/\.[^.]+$/, '')}</h1><p>${content.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('\n', '</p><p>')}</p>`,
                objects: [],
              },
            ],
            camera: { x: 0, y: 0, zoom: 1 },
            canvasColor: '#000000',
            canvasPattern: 'plain',
          };
          setWorkspace((currentWorkspace) =>
            currentWorkspace
              ? {
                  ...currentWorkspace,
                  activeNoteId: noteId,
                  notes: [note, ...currentWorkspace.notes],
                }
              : currentWorkspace,
          );
          setHomeOpen(false);
        });
        return;
      }
      fileDataUrl(file)
        .then((dataUrl) => {
          const noteId = makeId('note');
          const imageHtml = file.type.startsWith('image/')
            ? `<img src="${dataUrl}" alt="${file.name.replaceAll('"', '&quot;')}"><p>${file.name}</p>`
            : `<p><a href="${dataUrl}" download="${file.name.replaceAll('"', '&quot;')}">Open imported ${file.name}</a></p>`;
          const note: Note = {
            id: noteId,
            title: file.name.replace(/\.[^.]+$/, ''),
            mode: 'document',
            folderId: 'inbox',
            favorite: false,
            updatedAt: Date.now(),
            createdAt: Date.now(),
            openedAt: Date.now(),
            openCount: 1,
            captureKind: 'standard',
            objects: [],
            attachments: [{ id: makeId('attachment'), name: file.name, type: file.type, dataUrl }],
            pages: [{ id: makeId('page'), html: `<h1>${file.name}</h1>${imageHtml}`, objects: [] }],
            camera: { x: 0, y: 0, zoom: 1 },
            canvasColor: '#000000',
            canvasPattern: 'plain',
          };
          setWorkspace((currentWorkspace) =>
            currentWorkspace
              ? {
                  ...currentWorkspace,
                  activeNoteId: noteId,
                  notes: [note, ...currentWorkspace.notes],
                }
              : currentWorkspace,
          );
          setHomeOpen(false);
        })
        .catch(() => window.alert(`Could not read “${file.name}”.`));
    });
  };

  const createFolder = () => {
    setTextDialog({
      title: 'Create a project',
      label: 'Project name',
      placeholder: 'e.g. Backend interview',
      onConfirm: (name) => {
        const pair = getRandomOrbColorPair();
        const folder = {
          id: makeId('folder'),
          name,
          color: pair.primary,
          secondaryColor: pair.secondary,
        };
        setWorkspace({ ...workspace, folders: [...workspace.folders, folder] });
        setFilter({ type: 'folder', id: folder.id });
        setDashboardView('project');
        setHomeOpen(true);
      },
    });
  };

  const updateProjectFolder = (
    folderId: string,
    name: string,
    color: string,
    secondaryColor?: string,
  ) => {
    setWorkspace({
      ...workspace,
      folders: workspace.folders.map((f) =>
        f.id === folderId ? { ...f, name, color, secondaryColor } : f,
      ),
    });
  };

  const createProjectFolder = (projectId: string) => {
    const project = workspace.folders.find((folder) => folder.id === projectId);
    if (!project) return;
    setTextDialog({
      title: `New folder in ${project.name}`,
      label: 'Folder name',
      placeholder: 'e.g. Research',
      onConfirm: (name) => {
        const folder = { id: makeId('folder'), name, color: project.color, parentId: projectId };
        setWorkspace({ ...workspace, folders: [...workspace.folders, folder] });
      },
    });
  };

  const deleteActiveNote = () => {
    if (!activeNote || workspace.notes.length <= 1) {
      return;
    }

    setConfirmation({
      title: `Move “${activeNote.title}” to trash?`,
      message: 'You can restore it later from Trash.',
      confirmLabel: 'Move to trash',
      onConfirm: () => {
        const remainingNotes = workspace.notes.filter(
          (note) => note.id !== activeNote.id && !note.deletedAt,
        );
        setWorkspace({
          ...workspace,
          notes: workspace.notes.map((note) =>
            note.id === activeNote.id ? { ...note, deletedAt: Date.now() } : note,
          ),
          activeNoteId: remainingNotes[0].id,
        });
      },
    });
  };

  const duplicateNote = (noteId: string) => {
    const source = workspace.notes.find((note) => note.id === noteId);
    if (!source) return;
    const copy = {
      ...structuredClone(source),
      id: makeId('note'),
      title: `${source.title} copy`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      openedAt: Date.now(),
      deletedAt: undefined,
    };
    setWorkspace({ ...workspace, notes: [copy, ...workspace.notes], activeNoteId: copy.id });
  };
  const trashNote = (noteId: string) => {
    if (!workspace) return;
    const remaining = workspace.notes.map((note) =>
      note.id === noteId ? { ...note, deletedAt: Date.now() } : note,
    );
    const activeDeleted = workspace.activeNoteId === noteId;
    const nextActiveId = activeDeleted
      ? (remaining.find((n) => n.id !== noteId && !n.deletedAt)?.id ?? '')
      : workspace.activeNoteId;

    setWorkspace({
      ...workspace,
      notes: remaining,
      activeNoteId: nextActiveId,
    });
  };

  const trashSelectedNotes = (noteIds: string[]) => {
    if (!workspace || !noteIds.length) return;
    const remaining = workspace.notes.map((note) =>
      noteIds.includes(note.id) ? { ...note, deletedAt: Date.now() } : note,
    );
    const activeDeleted = noteIds.includes(workspace.activeNoteId);
    const nextActiveId = activeDeleted
      ? (remaining.find((n) => !noteIds.includes(n.id) && !n.deletedAt)?.id ?? '')
      : workspace.activeNoteId;

    setWorkspace({
      ...workspace,
      notes: remaining,
      activeNoteId: nextActiveId,
    });
  };

  const restoreNote = (noteId: string) => {
    if (!workspace) return;
    setWorkspace({
      ...workspace,
      notes: workspace.notes.map((note) =>
        note.id === noteId ? { ...note, deletedAt: undefined, updatedAt: Date.now() } : note,
      ),
    });
  };

  const deleteForever = (noteId: string) => {
    if (!workspace) return;
    const source = workspace.notes.find((note) => note.id === noteId);
    if (!source) return;
    setConfirmation({
      title: `Delete “${source.title}” permanently?`,
      message: 'This action cannot be undone.',
      confirmLabel: 'Delete permanently',
      onConfirm: () => {
        setWorkspace((prev) => {
          if (!prev) return null;
          const remaining = prev.notes.filter((note) => note.id !== noteId);
          const activeDeleted = prev.activeNoteId === noteId;
          const nextActiveId = activeDeleted
            ? (remaining.find((n) => !n.deletedAt)?.id ?? remaining[0]?.id ?? '')
            : prev.activeNoteId;

          return {
            ...prev,
            notes: remaining,
            activeNoteId: nextActiveId,
          };
        });
      },
    });
  };

  const deleteSelectedForever = (noteIds: string[]) => {
    if (!workspace || !noteIds.length) return;
    setConfirmation({
      title: `Delete ${noteIds.length} ${noteIds.length === 1 ? 'note' : 'notes'} permanently?`,
      message: 'This action cannot be undone.',
      confirmLabel: 'Delete permanently',
      onConfirm: () => {
        setWorkspace((prev) => {
          if (!prev) return null;
          const remaining = prev.notes.filter((note) => !noteIds.includes(note.id));
          const activeDeleted = noteIds.includes(prev.activeNoteId);
          const nextActiveId = activeDeleted
            ? (remaining.find((n) => !noteIds.includes(n.id) && !n.deletedAt)?.id ??
              remaining[0]?.id ??
              '')
            : prev.activeNoteId;

          return {
            ...prev,
            notes: remaining,
            activeNoteId: nextActiveId,
          };
        });
      },
    });
  };

  const emptyTrash = () => {
    if (!workspace) return;
    const trashCount = workspace.notes.filter((note) => note.deletedAt).length;
    if (!trashCount) return;
    setConfirmation({
      title: 'Empty trash?',
      message: `${trashCount} ${trashCount === 1 ? 'note will' : 'notes will'} be permanently deleted.`,
      confirmLabel: 'Empty trash',
      onConfirm: () => {
        setWorkspace((prev) => {
          if (!prev) return null;
          const remaining = prev.notes.filter((note) => !note.deletedAt);
          return {
            ...prev,
            notes: remaining,
            activeNoteId: remaining[0]?.id ?? '',
          };
        });
      },
    });
  };

  const deleteFolder = (folderId: string) => {
    const folder = workspace.folders.find((item) => item.id === folderId);

    if (!folder || folderId === 'inbox') {
      return;
    }

    const children = workspace.folders
      .filter((item) => item.parentId === folderId)
      .map((item) => item.id);
    setConfirmation({
      title: `Delete “${folder.name}”?`,
      message: 'Its notes and folders will move to Inbox. No notes will be deleted.',
      confirmLabel: 'Delete project',
      onConfirm: () =>
        setWorkspace({
          ...workspace,
          folders: workspace.folders.filter(
            (item) => item.id !== folderId && item.parentId !== folderId,
          ),
          notes: workspace.notes.map((note) =>
            note.folderId === folderId || children.includes(note.folderId)
              ? { ...note, folderId: 'inbox', updatedAt: Date.now() }
              : note,
          ),
        }),
    });

    if (filter.type === 'folder' && filter.id === folderId) {
      setFilter({ type: 'all' });
    }
  };

  const renameFolder = (folderId: string) => {
    const folder = workspace.folders.find((item) => item.id === folderId);
    if (!folder) return;
    setTextDialog({
      title: `Rename ${folder.parentId ? 'folder' : 'project'}`,
      label: 'Name',
      initialValue: folder.name,
      onConfirm: (name) =>
        setWorkspace({
          ...workspace,
          folders: workspace.folders.map((item) =>
            item.id === folderId ? { ...item, name } : item,
          ),
        }),
    });
  };

  const recolorFolder = (folderId: string) => {
    const folder = workspace.folders.find((item) => item.id === folderId);
    if (!folder) return;
    setTextDialog({
      title: 'Change space color',
      label: 'Hex color',
      initialValue: folder.color,
      validate: (value) =>
        /^#[0-9a-f]{6}$/i.test(value) ? null : 'Enter a six-digit hex color, such as #7DA8F4.',
      onConfirm: (color) =>
        setWorkspace({
          ...workspace,
          folders: workspace.folders.map((item) =>
            item.id === folderId ? { ...item, color } : item,
          ),
        }),
    });
  };

  const duplicateFolder = (folderId: string) => {
    const folder = workspace.folders.find((item) => item.id === folderId);
    if (!folder) return;
    const copy = { ...folder, id: makeId('folder'), name: `${folder.name} copy` };
    const copiedNotes = workspace.notes
      .filter((note) => note.folderId === folderId)
      .map((note) => ({
        ...structuredClone(note),
        id: makeId('note'),
        folderId: copy.id,
        title: `${note.title} copy`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }));
    setWorkspace({
      ...workspace,
      folders: [...workspace.folders, copy],
      notes: [...copiedNotes, ...workspace.notes],
    });
  };

  const changeFolderIcon = (folderId: string) => {
    const folder = workspace.folders.find((item) => item.id === folderId);
    if (!folder) return;
    setTextDialog({
      title: 'Change space icon',
      label: 'Emoji or symbol',
      initialValue: folder.icon ?? '',
      placeholder: '✦',
      onConfirm: (icon) =>
        setWorkspace({
          ...workspace,
          folders: workspace.folders.map((item) =>
            item.id === folderId ? { ...item, icon } : item,
          ),
        }),
    });
  };

  const todayKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  const focusItems = workspace.focusByDate?.[todayKey] ?? [];
  const updateFocus = (items: typeof focusItems) =>
    setWorkspace({
      ...workspace,
      focusByDate: { ...(workspace.focusByDate ?? {}), [todayKey]: items },
    });

  const updateSettings = (settings: Settings) => setWorkspace({ ...workspace, settings });
  const exportWorkspace = () => {
    const blob = new Blob([JSON.stringify(workspace, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `celestine-backup-${todayKey}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const importWorkspace = (file: File) =>
    file
      .text()
      .then((payload) => JSON.parse(payload) as Workspace)
      .then((nextWorkspace) => {
        if (!Array.isArray(nextWorkspace.notes) || !nextWorkspace.settings)
          return Promise.reject(new Error('Invalid Celestine backup.'));
        setWorkspace(nextWorkspace);
        setSettingsOpen(false);
      })
      .catch((error: unknown) =>
        window.alert(error instanceof Error ? error.message : 'Could not import this backup.'),
      );

  const googleSignIn = () => {
    setGoogleAuth({ status: 'loading' });
    signInWithGoogle()
      .then((profile) => {
        setGoogleAuth({ status: 'signed-in', profile });
        if (!workspace.settings.profileName?.trim())
          updateSettings({ ...workspace.settings, profileName: profile.givenName || profile.name });
      })
      .catch((error: unknown) =>
        setGoogleAuth({
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        }),
      );
  };

  const googleSignOut = () => {
    setGoogleAuth({ status: 'loading' });
    signOutFromGoogle()
      .then(() => setGoogleAuth({ status: 'signed-out' }))
      .catch((error: unknown) =>
        setGoogleAuth({
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        }),
      );
  };

  return (
    <main
      className="app"
      data-theme={workspace.settings.theme}
      style={{ '--accent': '#4c9bff', '--app-font-size': '16px' } as React.CSSProperties}
    >
      <div className="top-window-drag-strip" data-tauri-drag-region />
      <div
        className={`${libraryVisible ? 'library-shell visible' : 'library-shell'}${homeOpen ? ' home-view' : ''}${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}
      >
        <Sidebar
          folders={workspace.folders}
          filter={filter}
          onFilterChange={(nextFilter) => {
            setFilter(nextFilter);
            if (
              nextFilter.type === 'folder' &&
              !workspace.folders.find((folder) => folder.id === nextFilter.id)?.parentId
            ) {
              setDashboardView('project');
              setHomeOpen(true);
            }
          }}
          onCreateFolder={createFolder}
          onCreateProjectFolder={createProjectFolder}
          onDeleteFolder={deleteFolder}
          onRenameFolder={renameFolder}
          onRecolorFolder={recolorFolder}
          onUpdateFolder={updateProjectFolder}
          onDuplicateFolder={duplicateFolder}
          onChangeFolderIcon={changeFolderIcon}
          onOpenSettings={() => setSettingsOpen(true)}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((collapsed) => !collapsed)}
          view={homeOpen && dashboardView !== 'project' ? dashboardView : 'notes'}
          onViewChange={(view) => {
            if (view === 'notes') {
              setHomeOpen(false);
              return;
            }
            setDashboardView(view);
            setHomeOpen(true);
          }}
        />
        <NotesList
          notes={visibleNotes}
          folders={workspace.folders}
          activeNoteId={workspace.activeNoteId}
          search={search}
          title={filterTitle}
          breadcrumb={filterBreadcrumb}
          onSearchChange={setSearch}
          onSelectNote={openNote}
          onSelectFolder={(folderId) => setFilter({ type: 'folder', id: folderId })}
          onCreateNote={createNote}
          onOpenAudio={startAudio}
          viewMode={noteView}
          sort={noteSort}
          onViewModeChange={setNoteView}
          onSortChange={handleSortChange}
          onDuplicate={duplicateNote}
          onTrash={trashNote}
          onRestore={restoreNote}
          onDeleteForever={deleteForever}
          onDeleteSelected={deleteSelectedForever}
          onTrashSelected={trashSelectedNotes}
          onEmptyTrash={emptyTrash}
        />
      </div>

      {homeOpen && dashboardView === 'home' ? (
        <HomeDesk
          notes={workspace.notes}
          folders={workspace.folders}
          settings={workspace.settings}
          focusItems={focusItems}
          onOpenNote={openNote}
          onCreateNote={createNote}
          onToggleFavorite={toggleFavorite}
          onOpenSearch={() => setCommandOpen(true)}
          onOpenQuickCapture={() => setQuickCaptureOpen(true)}
          onOpenTemplates={() => setDashboardView('templates')}
          onOpenAudio={startAudio}
          onUpload={importFiles}
          onToggleUtilityPanel={() =>
            updateSettings({
              ...workspace.settings,
              utilityPanelVisible: !workspace.settings.utilityPanelVisible,
            })
          }
          onAddFocus={() =>
            setTextDialog({
              title: 'Add today’s focus',
              label: 'Focus item',
              placeholder: 'What deserves your attention?',
              onConfirm: (text) =>
                updateFocus([...focusItems, { id: makeId('focus'), text, completed: false }]),
            })
          }
          onToggleFocus={(id) =>
            updateFocus(
              focusItems.map((item) =>
                item.id === id ? { ...item, completed: !item.completed } : item,
              ),
            )
          }
          onDeleteFocus={(id) => updateFocus(focusItems.filter((item) => item.id !== id))}
          onEditFocus={(id) => {
            const item = focusItems.find((entry) => entry.id === id);
            if (item)
              setTextDialog({
                title: 'Edit focus item',
                label: 'Focus item',
                initialValue: item.text,
                onConfirm: (text) =>
                  updateFocus(
                    focusItems.map((entry) => (entry.id === id ? { ...entry, text } : entry)),
                  ),
              });
          }}
          onMoveFocus={(id, direction) => {
            const index = focusItems.findIndex((item) => item.id === id);
            const target = index + direction;
            if (index < 0 || target < 0 || target >= focusItems.length) return;
            const next = [...focusItems];
            [next[index], next[target]] = [next[target], next[index]];
            updateFocus(next);
          }}
        />
      ) : homeOpen && dashboardView === 'templates' ? (
        <TemplatesView
          onCreate={createNote}
          customTemplates={workspace.customTemplates ?? []}
          onCreateCustom={(id) => {
            if (filter.type === 'trash') {
              setFilter({ type: 'all' });
            }

            const template = workspace.customTemplates?.find((item) => item.id === id);
            if (!template) return;
            const note = {
              ...structuredClone(template.sourceNote),
              id: makeId('note'),
              title: template.name,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              openedAt: Date.now(),
              deletedAt: undefined,
            };
            setWorkspace({
              ...workspace,
              notes: [note, ...workspace.notes],
              activeNoteId: note.id,
            });
            setHomeOpen(false);
          }}
          onDuplicateCustom={(id) => {
            const template = workspace.customTemplates?.find((item) => item.id === id);
            if (template)
              setWorkspace({
                ...workspace,
                customTemplates: [
                  ...(workspace.customTemplates ?? []),
                  {
                    ...structuredClone(template),
                    id: makeId('template'),
                    name: `${template.name} copy`,
                  },
                ],
              });
          }}
          onDeleteCustom={(id) =>
            setConfirmation({
              title: 'Delete custom template?',
              message: 'Notes already created from it will not be affected.',
              confirmLabel: 'Delete template',
              onConfirm: () =>
                setWorkspace({
                  ...workspace,
                  customTemplates: (workspace.customTemplates ?? []).filter(
                    (item) => item.id !== id,
                  ),
                }),
            })
          }
        />
      ) : homeOpen && dashboardView === 'project' && filter.type === 'folder' ? (
        <ProjectDesk
          project={
            workspace.folders.find((folder) => folder.id === filter.id) ?? workspace.folders[0]
          }
          folders={workspace.folders}
          notes={visibleNotes}
          onOpenNote={openNote}
          onCreateNote={createNote}
          onCreateFolder={() => createProjectFolder(filter.id)}
          onOpenFolder={(folderId) => {
            setFilter({ type: 'folder', id: folderId });
            setHomeOpen(false);
          }}
          onAllProjects={() => {
            setFilter({ type: 'all' });
            setDashboardView('home');
          }}
          onRenameFolder={renameFolder}
          onDeleteFolder={deleteFolder}
          onRecolorFolder={recolorFolder}
        />
      ) : !activeNote ? (
        <section
          className="editor-shell empty-editor-panel"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            width: '100%',
            background: 'var(--app-bg)',
          }}
        >
          <div className="useful-empty">
            <FileText size={48} style={{ color: 'var(--text-muted)' }} />
            <h2>No note selected</h2>
            <p>Select a note from the list, or create a new one to begin writing.</p>
            <div style={{ marginTop: '16px' }}>
              <button className="widget-add" onClick={() => createNote('document', 'blank')}>
                Create a note
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="editor-shell">
          {activeNote.mode === 'document' ? (
            <DocumentEditor
              note={activeNote}
              tool={tool}
              settings={workspace.settings}
              onChange={updateNote}
              onPenDetected={() => setTool('pen')}
              audioPlayer={
                activeNote.audioDataUrl ? (
                  <div className="note-audio-player">
                    <span>Voice recording</span>
                    <audio controls src={activeNote.audioDataUrl} />
                    {activeNote.transcript ? (
                      <div className="transcript-mode-toggle">
                        <button
                          className={
                            !activeNote.pages[0]?.html.includes('hl-date') &&
                            !activeNote.pages[0]?.html.includes('hl-key') &&
                            !activeNote.pages[0]?.html.includes('hl-name')
                              ? 'active'
                              : ''
                          }
                          onClick={() => {
                            const processed = processTranscript(activeNote.transcript || '');
                            updateNote({
                              ...activeNote,
                              updatedAt: Date.now(),
                              pages: activeNote.pages.map((p, idx) =>
                                idx === 0 ? { ...p, html: processed.plainNoteHtml } : p,
                              ),
                            });
                          }}
                        >
                          Plain
                        </button>
                        <button
                          className={
                            activeNote.pages[0]?.html.includes('hl-date') ||
                            activeNote.pages[0]?.html.includes('hl-key') ||
                            activeNote.pages[0]?.html.includes('hl-name')
                              ? 'active'
                              : ''
                          }
                          onClick={() => {
                            const processed = processTranscript(activeNote.transcript || '');
                            updateNote({
                              ...activeNote,
                              updatedAt: Date.now(),
                              pages: activeNote.pages.map((p, idx) =>
                                idx === 0 ? { ...p, html: processed.annotatedNoteHtml } : p,
                              ),
                            });
                          }}
                        >
                          Annotated
                        </button>
                      </div>
                    ) : null}
                    <button
                      disabled={transcribingNoteId === activeNote.id}
                      onClick={() => transcribeExistingNote(activeNote)}
                    >
                      {transcribingNoteId === activeNote.id
                        ? 'Transcribing…'
                        : activeNote.transcript
                          ? 'Retranscribe'
                          : 'Transcribe'}
                    </button>
                    <button
                      onClick={() =>
                        updateNote({
                          ...activeNote,
                          audioDataUrl: undefined,
                          updatedAt: Date.now(),
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                ) : null
              }
            >
              <ToolDock
                tool={tool}
                mode={activeNote.mode}
                settings={workspace.settings}
                onToolChange={setTool}
                onColorChange={(color) => {
                  const updates = { ...workspace.settings };
                  if (tool === 'highlighter') updates.highlighterColor = color;
                  else if (tool === 'shape') updates.shapeColor = color;
                  else if (tool === 'text') updates.textColor = color;
                  else updates.penColor = color;
                  updateSettings(updates);
                }}
                onShapeChange={(selectedShape) =>
                  updateSettings({ ...workspace.settings, selectedShape })
                }
                onSizeChange={(size) => {
                  const updates = { ...workspace.settings };
                  if (tool === 'highlighter') updates.highlighterSize = size;
                  else if (tool === 'eraser') updates.eraserSize = size;
                  else updates.penSize = size;
                  updateSettings(updates);
                }}
                onOpenSettings={() => setEditorSettingsOpen(true)}
              />
            </DocumentEditor>
          ) : (
            <>
              <InfiniteCanvas
                note={activeNote}
                tool={tool}
                settings={workspace.settings}
                onChange={updateNote}
                onPenDetected={() => setTool('pen')}
                audioPlayer={
                  activeNote.audioDataUrl ? (
                    <div className="note-audio-player">
                      <span>Voice recording</span>
                      <audio controls src={activeNote.audioDataUrl} />
                      {activeNote.transcript ? (
                        <div className="transcript-mode-toggle">
                          <button
                            className={
                              !activeNote.pages[0]?.html.includes('hl-date') &&
                              !activeNote.pages[0]?.html.includes('hl-key') &&
                              !activeNote.pages[0]?.html.includes('hl-name')
                                ? 'active'
                                : ''
                            }
                            onClick={() => {
                              const processed = processTranscript(activeNote.transcript || '');
                              updateNote({
                                ...activeNote,
                                updatedAt: Date.now(),
                                pages: activeNote.pages.map((p, idx) =>
                                  idx === 0 ? { ...p, html: processed.plainNoteHtml } : p,
                                ),
                              });
                            }}
                          >
                            Plain
                          </button>
                          <button
                            className={
                              activeNote.pages[0]?.html.includes('hl-date') ||
                              activeNote.pages[0]?.html.includes('hl-key') ||
                              activeNote.pages[0]?.html.includes('hl-name')
                                ? 'active'
                                : ''
                            }
                            onClick={() => {
                              const processed = processTranscript(activeNote.transcript || '');
                              updateNote({
                                ...activeNote,
                                updatedAt: Date.now(),
                                pages: activeNote.pages.map((p, idx) =>
                                  idx === 0 ? { ...p, html: processed.annotatedNoteHtml } : p,
                                ),
                              });
                            }}
                          >
                            Annotated
                          </button>
                        </div>
                      ) : null}
                      <button
                        disabled={transcribingNoteId === activeNote.id}
                        onClick={() => transcribeExistingNote(activeNote)}
                      >
                        {transcribingNoteId === activeNote.id
                          ? 'Transcribing…'
                          : activeNote.transcript
                            ? 'Retranscribe'
                            : 'Transcribe'}
                      </button>
                      <button
                        onClick={() =>
                          updateNote({
                            ...activeNote,
                            audioDataUrl: undefined,
                            updatedAt: Date.now(),
                          })
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ) : null
                }
              >
                <ToolDock
                  tool={tool}
                  mode={activeNote.mode}
                  settings={workspace.settings}
                  onToolChange={setTool}
                  onColorChange={(color) => {
                    const updates = { ...workspace.settings };
                    if (tool === 'highlighter') updates.highlighterColor = color;
                    else if (tool === 'shape') updates.shapeColor = color;
                    else if (tool === 'text') updates.textColor = color;
                    else updates.penColor = color;
                    updateSettings(updates);
                  }}
                  onShapeChange={(selectedShape) =>
                    updateSettings({ ...workspace.settings, selectedShape })
                  }
                  onSizeChange={(size) => {
                    const updates = { ...workspace.settings };
                    if (tool === 'highlighter') updates.highlighterSize = size;
                    else if (tool === 'eraser') updates.eraserSize = size;
                    else updates.penSize = size;
                    updateSettings(updates);
                  }}
                  onOpenSettings={() => setEditorSettingsOpen(true)}
                />
              </InfiniteCanvas>
            </>
          )}
        </section>
      )}

      <EditorSettingsModal
        settings={workspace.settings}
        isOpen={editorSettingsOpen}
        onClose={() => setEditorSettingsOpen(false)}
        onUpdateSettings={updateSettings}
      />

      {settingsOpen ? (
        <SettingsPanel
          settings={workspace.settings}
          onChange={updateSettings}
          onClose={() => setSettingsOpen(false)}
          googleAuth={googleAuth}
          onGoogleSignIn={googleSignIn}
          onGoogleSignOut={googleSignOut}
          onExportData={exportWorkspace}
          onImportData={importWorkspace}
        />
      ) : null}
      {commandOpen ? (
        <CommandPalette
          notes={workspace.notes}
          folders={workspace.folders}
          onClose={() => setCommandOpen(false)}
          onOpenNote={openNote}
          onOpenFilter={(type, id) => {
            setFilter({ type, id });
            setHomeOpen(false);
          }}
          onOpenTemplates={() => {
            setDashboardView('templates');
            setHomeOpen(true);
          }}
          onOpenSettings={() => setSettingsOpen(true)}
          onQuickNote={() => createNote('document', 'thought')}
        />
      ) : null}
      {quickCaptureOpen ? (
        <QuickCapturePanel
          onClose={() => setQuickCaptureOpen(false)}
          onCreate={createNote}
          onAudio={startAudio}
        />
      ) : null}
      {audioOpen ? (
        <AudioRecorderPanel
          transcriptionEnabled={workspace.settings.transcriptionEnabled ?? true}
          onClose={() => setAudioOpen(false)}
          onSave={(audioDataUrl, audioDuration, transcript) => {
            if (!audioNoteId) return;
            const targetId = audioNoteId;
            const existingNote = workspace.notes.find((item) => item.id === targetId);
            if (!existingNote) return;

            const processed = transcript ? processTranscript(transcript) : null;
            const updatedNote: Note = {
              ...existingNote,
              audioDataUrl,
              audioDuration,
              transcript: transcript || existingNote.transcript,
              updatedAt: Date.now(),
              pages: existingNote.pages.map((page, index) =>
                index === 0
                  ? {
                      ...page,
                      html: processed ? processed.annotatedNoteHtml : page.html,
                    }
                  : page,
              ),
            };

            setWorkspace({
              ...workspace,
              notes: workspace.notes.map((n) => (n.id === targetId ? updatedNote : n)),
            });

            if (workspace.settings.transcriptionEnabled ?? true) {
              setTimeout(() => {
                void transcribeExistingNote(updatedNote);
              }, 100);
            }
          }}
        />
      ) : null}
      {textDialog ? <TextInputDialog {...textDialog} onClose={() => setTextDialog(null)} /> : null}
      {confirmation ? (
        <ConfirmationDialog {...confirmation} onClose={() => setConfirmation(null)} />
      ) : null}
    </main>
  );
}
