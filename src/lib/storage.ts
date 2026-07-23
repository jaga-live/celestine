import { invoke } from '@tauri-apps/api/core';
import type { HandwritingFont, Workspace } from '../types';

const storageKey = 'celestine.workspace.v1';

const runningInTauri = () => '__TAURI_INTERNALS__' in window;

const legacyColors: Record<string, string> = {
  '#8076f2': '#4c9bff',
  '#8b6cff': '#4c9bff',
  '#5b8ff9': '#4c9bff',
  '#4ab69f': '#62b58f',
  '#56d1bc': '#62b58f',
  '#e08b67': '#e5ad55',
  '#f0ad55': '#e5ad55',
  '#d46a61': '#e56f6f',
  '#ff7182': '#e56f6f',
  '#5f9d8b': '#62b58f',
  '#c28b52': '#e5ad55',
  '#e6e8f1': '#f2f0ea',
  '#273248': '#f2f0ea',
};

const hasTextContent = (html: string) =>
  html
    .replace(/<[^>]*>/g, '')
    .replaceAll('&nbsp;', '')
    .trim().length > 0;

const handwritingFontMap: Record<string, HandwritingFont> = {
  auto: 'chalkboard',
  caveat: 'chalkboard',
  kalam: 'noteworthy',
  'patrick-hand': 'bradley-hand',
  chalkboard: 'chalkboard',
  noteworthy: 'noteworthy',
  'bradley-hand': 'bradley-hand',
};

const isGeneratedDemoStroke = (note: Workspace['notes'][number], objectId: string) => {
  if (note.title !== 'Untitled note' || note.objects.length !== 1) {
    return false;
  }

  const object = note.objects.find((item) => item.id === objectId);

  if (object?.type !== 'stroke' || object.points.length > 32) {
    return false;
  }

  const xs = object.points.map((point) => point.x);
  const ys = object.points.map((point) => point.y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);

  return width < 140 && height < 90;
};

const migrateWorkspace = (workspace: Workspace): Workspace => {
  const { activities: _legacyActivities, ...workspaceWithoutActivities } =
    workspace as Workspace & { activities?: unknown };

  return {
    ...workspaceWithoutActivities,
    version: 5,
    folders: workspace.folders.map((folder) => ({
      ...folder,
      parentId: folder.parentId,
      color: legacyColors[folder.color] ?? folder.color,
    })),
    tags: (workspace.tags ?? []).map((tag) => ({
      ...tag,
      color: legacyColors[tag.color] ?? tag.color,
    })),
    notes: workspace.notes.map((note) => ({
      ...note,
      mode: note.mode ?? 'canvas',
      createdAt: note.createdAt ?? note.updatedAt,
      openedAt: note.openedAt ?? note.updatedAt,
      openCount: note.openCount ?? 0,
      deletedAt: note.deletedAt,
      attachments: note.attachments ?? [],
      captureKind: note.captureKind ?? 'standard',
      pages: (note.pages ?? []).map((page) => ({
        ...page,
        html: hasTextContent(page.html) ? page.html : '<p></p>',
        objects: page.objects ?? [],
      })),
      canvasColor:
        !note.canvasColor || ['#23262c', '#090b10', '#101114', '#17181b'].includes(note.canvasColor)
          ? '#000000'
          : note.canvasColor,
      canvasPattern: note.canvasPattern ?? 'plain',
      title: note.title === 'Precision Ink test' ? 'Pen test' : note.title,
      objects: note.objects
        .filter(
          (object) =>
            (object.type !== 'text' || hasTextContent(object.html)) &&
            !isGeneratedDemoStroke(note, object.id),
        )
        .map((object) =>
          'color' in object
            ? { ...object, color: legacyColors[object.color] ?? object.color }
            : object,
        ),
    })),
    settings: {
      theme: workspace.settings.theme,
      penColor:
        !workspace.settings.penColor || workspace.settings.penColor === '#eceef3'
          ? '#4c9bff'
          : (legacyColors[workspace.settings.penColor] ?? workspace.settings.penColor),
      highlighterColor: workspace.settings.highlighterColor ?? '#f19b3f',
      shapeColor: workspace.settings.shapeColor ?? '#4c9bff',
      textColor: workspace.settings.textColor ?? '#ffffff',
      pressureWidth: workspace.settings.pressureWidth ?? true,
      conversionMode: workspace.settings.conversionMode ?? 'manual',
      conversionDelayMs: workspace.settings.conversionDelayMs ?? 2500,
      handwritingFont: handwritingFontMap[workspace.settings.handwritingFont] ?? 'chalkboard',
      shortcuts: {
        pen: workspace.settings.shortcuts.pen,
        eraser: workspace.settings.shortcuts.eraser,
        select: workspace.settings.shortcuts.select,
        text: workspace.settings.shortcuts.text,
        handwriting: workspace.settings.shortcuts.handwriting,
      },
      profileName: workspace.settings.profileName ?? '',
      defaultTemplate: workspace.settings.defaultTemplate ?? 'blank',
      defaultQuickCapture: workspace.settings.defaultQuickCapture ?? 'thought',
      utilityPanelVisible: workspace.settings.utilityPanelVisible ?? true,
      focusMessage: workspace.settings.focusMessage ?? '',
      accentColor: workspace.settings.accentColor ?? '#4c9bff',
      fontSize: workspace.settings.fontSize ?? 16,
      defaultCanvasColor: workspace.settings.defaultCanvasColor ?? '#000000',
      defaultCanvasPattern: workspace.settings.defaultCanvasPattern ?? 'plain',
      microphoneId: workspace.settings.microphoneId ?? '',
      transcriptionEnabled:
        workspace.version < 5 ? true : (workspace.settings.transcriptionEnabled ?? true),
      globalShortcuts: workspace.settings.globalShortcuts ?? {
        quickNote: 'q',
        canvas: 'd',
        meeting: 'm',
      },
    },
    focusByDate: workspace.focusByDate ?? {},
    customTemplates: workspace.customTemplates ?? [],
  };
};

const loadFromBrowser = (): Workspace | null => {
  const stored = window.localStorage.getItem(storageKey);

  return stored ? (JSON.parse(stored) as Workspace) : null;
};

export const loadWorkspace = (): Promise<Workspace | null> => {
  if (!runningInTauri()) {
    const workspace = loadFromBrowser();

    return Promise.resolve(workspace ? migrateWorkspace(workspace) : null);
  }

  return invoke<string | null>('load_workspace').then((payload) =>
    payload ? migrateWorkspace(JSON.parse(payload) as Workspace) : null,
  );
};

export const saveWorkspace = (workspace: Workspace): Promise<void> => {
  const payload = JSON.stringify(workspace);

  if (!runningInTauri()) {
    window.localStorage.setItem(storageKey, payload);

    return Promise.resolve();
  }

  return invoke<void>('save_workspace', { payload });
};

export const recognizeHandwriting = (imageBase64: string): Promise<string> => {
  if (!runningInTauri()) {
    return Promise.reject(new Error('Handwriting recognition is available in the desktop app.'));
  }

  return invoke<string>('recognize_handwriting', { imageBase64 });
};
