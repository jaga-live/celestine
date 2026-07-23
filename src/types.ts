export type Tool = 'select' | 'pen' | 'highlighter' | 'eraser' | 'text' | 'shape' | 'image' | 'handwriting';
export type Theme = 'dark' | 'light';
export type HandwritingConversion = 'manual' | 'after-delay';
export type HandwritingFont = 'chalkboard' | 'noteworthy' | 'bradley-hand';
export type CanvasPattern = 'plain' | 'dots' | 'ruled' | 'grid';
export type NoteMode = 'document' | 'canvas';
export type CelestineTemplate =
  'blank' | 'study' | 'system' | 'meeting' | 'mindmap' | 'revision' | 'thought' | 'audio';

export interface Point {
  x: number;
  y: number;
  pressure: number;
  tiltX: number;
  tiltY: number;
  time: number;
}

export interface InkStroke {
  id: string;
  type: 'stroke';
  points: Point[];
  color: string;
  width: number;
  isHighlighter?: boolean;
  createdAt: number;
}

export type ShapeType = 'rectangle' | 'ellipse' | 'diamond' | 'arrow' | 'line' | 'triangle';

export interface ShapeObject {
  id: string;
  type: 'shape';
  shape: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  createdAt: number;
}

export interface TextObject {
  id: string;
  type: 'text';
  x: number;
  y: number;
  width: number;
  html: string;
  textStyle?: 'body' | 'handwriting';
  handwritingFont?: HandwritingFont;
  createdAt: number;
}

export interface ImageObject {
  id: string;
  type: 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  source: string;
  alt: string;
  createdAt: number;
}

export type CanvasObject = InkStroke | ShapeObject | TextObject | ImageObject;

export interface DocumentPage {
  id: string;
  html: string;
  objects: CanvasObject[];
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface Note {
  id: string;
  title: string;
  mode: NoteMode;
  folderId: string;
  tagIds?: string[];
  favorite: boolean;
  updatedAt: number;
  createdAt?: number;
  openedAt?: number;
  openCount?: number;
  deletedAt?: number;
  captureKind?: 'quick' | 'audio' | 'drawing' | 'standard';
  audioDataUrl?: string;
  audioDuration?: number;
  transcript?: string;
  attachments?: Array<{ id: string; name: string; type: string; dataUrl: string }>;
  objects: CanvasObject[];
  pages: DocumentPage[];
  camera: Camera;
  canvasColor: string;
  canvasPattern: CanvasPattern;
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  secondaryColor?: string;
  icon?: string;
  parentId?: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface ShortcutMap {
  pen: string;
  eraser: string;
  select: string;
  text: string;
  handwriting: string;
}

export interface Settings {
  theme: Theme;
  penColor: string;
  highlighterColor: string;
  shapeColor: string;
  textColor: string;
  penSize?: number;
  highlighterSize?: number;
  eraserSize?: number;
  pressureWidth: boolean;
  autoCorrectShapes?: boolean;
  conversionMode: HandwritingConversion;
  conversionDelayMs: number;
  handwritingFont: HandwritingFont;
  shortcuts: ShortcutMap;
  profileName?: string;
  defaultTemplate?: string;
  defaultQuickCapture?: string;
  utilityPanelVisible?: boolean;
  focusMessage?: string;
  accentColor?: string;
  fontSize?: number;
  defaultCanvasColor?: string;
  defaultCanvasPattern?: CanvasPattern;
  microphoneId?: string;
  transcriptionEnabled?: boolean;
  globalShortcuts?: Record<string, string>;
  confirmQuit?: 'ask' | 'never';
  selectedShape?: ShapeType;
}

export interface FocusItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Workspace {
  version: number;
  folders: Folder[];
  tags?: Tag[];
  notes: Note[];
  activeNoteId: string;
  settings: Settings;
  focusByDate?: Record<string, FocusItem[]>;
  customTemplates?: Array<{ id: string; name: string; mode: NoteMode; sourceNote: Note }>;
}
