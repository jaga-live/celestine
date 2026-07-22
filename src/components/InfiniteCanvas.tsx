import { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ImagePlus,
  Layers2,
  LoaderCircle,
  Maximize2,
  Minus,
  Plus,
  Redo2,
  Undo2,
} from 'lucide-react';
import type {
  Camera,
  CanvasPattern,
  CanvasObject,
  ImageObject,
  InkStroke,
  Note,
  Point,
  Settings,
  ShapeObject,
  TextObject,
  Tool,
} from '../types';
import { recognizeHandwriting } from '../lib/storage';
import { TextCard } from './TextCard';

interface InfiniteCanvasProps {
  note: Note;
  tool: Tool;
  settings: Settings;
  onChange: (note: Note) => void;
  onPenDetected: () => void;
  audioPlayer?: React.ReactNode;
  children?: React.ReactNode;
}

interface ScreenPoint {
  x: number;
  y: number;
}

interface ShapeDraft {
  start: Point;
  end: Point;
}

interface WorldRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ConversionState {
  status: 'recognizing' | 'ready' | 'error';
  bounds: WorldRect;
  objectIds: string[];
  text: string;
  message?: string;
}

const makeId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const imageCache = new Map<string, HTMLImageElement>();
const canvasColors = ['#000000', '#101114', '#1b1d22', '#282a2f', '#eef0f6', '#f6f1e8'];
const canvasPatterns: { id: CanvasPattern; label: string }[] = [
  { id: 'plain', label: 'Plain' },
  { id: 'dots', label: 'Dots' },
  { id: 'ruled', label: 'Ruled' },
  { id: 'grid', label: 'Grid' },
];

const isLightColor = (hex: string) => {
  const value = hex.replace('#', '');
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);

  return (red * 299 + green * 587 + blue * 114) / 1000 > 160;
};

const normalizedPressure = (pressure: number, pointerType: string) => {
  if (pressure > 0) {
    return pressure;
  }

  return pointerType === 'mouse' ? 0.5 : 0.12;
};

const pointDistance = (left: Point, right: Point) => Math.hypot(left.x - right.x, left.y - right.y);

const hitStroke = (stroke: InkStroke, point: Point, radius: number) =>
  stroke.points.some((strokePoint) => pointDistance(strokePoint, point) <= radius);

const normalizeRect = (start: Point, end: Point): WorldRect => ({
  x: Math.min(start.x, end.x),
  y: Math.min(start.y, end.y),
  width: Math.abs(end.x - start.x),
  height: Math.abs(end.y - start.y),
});

const strokeBounds = (stroke: InkStroke): WorldRect => {
  const xs = stroke.points.map((point) => point.x);
  const ys = stroke.points.map((point) => point.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);

  return {
    x: left,
    y: top,
    width: Math.max(1, Math.max(...xs) - left),
    height: Math.max(1, Math.max(...ys) - top),
  };
};

const mergeBounds = (strokes: InkStroke[]): WorldRect => {
  const bounds = strokes.map(strokeBounds);
  const left = Math.min(...bounds.map((item) => item.x));
  const top = Math.min(...bounds.map((item) => item.y));
  const right = Math.max(...bounds.map((item) => item.x + item.width));
  const bottom = Math.max(...bounds.map((item) => item.y + item.height));

  return { x: left, y: top, width: right - left, height: bottom - top };
};

const strokeIntersects = (stroke: InkStroke, rect: WorldRect) => {
  const bounds = strokeBounds(stroke);

  return (
    bounds.x <= rect.x + rect.width &&
    bounds.x + bounds.width >= rect.x &&
    bounds.y <= rect.y + rect.height &&
    bounds.y + bounds.height >= rect.y
  );
};

const rasterizeStrokes = (strokes: InkStroke[], bounds: WorldRect) => {
  const padding = 44;
  const targetWidth = Math.max(120, bounds.width + padding * 2);
  const targetHeight = Math.max(80, bounds.height + padding * 2);
  const scale = Math.min(4, 1800 / targetWidth, 1200 / targetHeight);
  const canvas = document.createElement('canvas');

  canvas.width = Math.ceil(targetWidth * scale);
  canvas.height = Math.ceil(targetHeight * scale);
  const context = canvas.getContext('2d')!;

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.translate((padding - bounds.x) * scale, (padding - bounds.y) * scale);
  context.scale(scale, scale);

  strokes.forEach((stroke) => {
    context.strokeStyle = '#111111';
    context.lineCap = 'round';
    context.lineJoin = 'round';

    for (let index = 1; index < stroke.points.length; index += 1) {
      const previous = stroke.points[index - 1];
      const current = stroke.points[index];
      const pressure = (previous.pressure + current.pressure) / 2;

      context.lineWidth = Math.max(2.4, stroke.width * (0.65 + pressure));
      context.beginPath();
      context.moveTo(previous.x, previous.y);
      context.lineTo(current.x, current.y);
      context.stroke();
    }
  });

  return canvas.toDataURL('image/png').split(',')[1];
};

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const hasTextContent = (html: string) =>
  html
    .replace(/<[^>]*>/g, '')
    .replaceAll('&nbsp;', '')
    .trim().length > 0;

export function InfiniteCanvas({
  note,
  tool,
  settings,
  onChange,
  onPenDetected,
  audioPlayer,
  children,
}: InfiniteCanvasProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement>(null);
  const pressureLabelRef = useRef<HTMLSpanElement>(null);
  const canvasBounds = useRef({ left: 0, top: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workingStroke = useRef<InkStroke | null>(null);
  const noteRef = useRef(note);
  const autoConversionTimer = useRef<number | null>(null);
  const recentStrokeIds = useRef<string[]>([]);
  const panning = useRef(false);
  const panOrigin = useRef<ScreenPoint | null>(null);
  const cameraOrigin = useRef<Camera | null>(null);
  const imagePlacement = useRef<Point | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const pointerPressure = useRef(0);
  const [shapeDraft, setShapeDraft] = useState<ShapeDraft | null>(null);
  const [selectionDraft, setSelectionDraft] = useState<ShapeDraft | null>(null);
  const [conversion, setConversion] = useState<ConversionState | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [backgroundOpen, setBackgroundOpen] = useState(false);
  const [undoStack, setUndoStack] = useState<CanvasObject[][]>([]);
  const [redoStack, setRedoStack] = useState<CanvasObject[][]>([]);

  const replaceObjects = (objects: CanvasObject[], recordHistory = true) => {
    if (recordHistory) {
      setUndoStack((stack) => [...stack.slice(-50), noteRef.current.objects]);
      setRedoStack([]);
    }

    const nextNote = { ...noteRef.current, objects, updatedAt: Date.now() };

    noteRef.current = nextNote;
    onChange(nextNote);
  };

  const handleUndo = () => {
    if (!undoStack.length) {
      return;
    }

    const previous = undoStack[undoStack.length - 1];

    setUndoStack((stack) => stack.slice(0, -1));
    setRedoStack((stack) => [...stack, noteRef.current.objects]);
    replaceObjects(previous, false);
  };

  const handleRedo = () => {
    if (!redoStack.length) {
      return;
    }

    const next = redoStack[redoStack.length - 1];

    setRedoStack((stack) => stack.slice(0, -1));
    setUndoStack((stack) => [...stack, noteRef.current.objects]);
    replaceObjects(next, false);
  };

  const camera = note.camera;

  useEffect(() => {
    noteRef.current = note;
  }, [note]);

  useEffect(() => {
    recentStrokeIds.current = [];

    if (autoConversionTimer.current) {
      window.clearTimeout(autoConversionTimer.current);
      autoConversionTimer.current = null;
    }

    return () => {
      if (autoConversionTimer.current) {
        window.clearTimeout(autoConversionTimer.current);
      }
    };
  }, [note.id]);

  useEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      const bounds = root.getBoundingClientRect();

      canvasBounds.current = { left: bounds.left, top: bounds.top };
    });

    observer.observe(root);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;

      if (event.code === 'Space' && !event.repeat) {
        setSpaceHeld(true);
      }

      if (target.matches('input, textarea, select') || target.isContentEditable) {
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        handleRedo();
      }
    };
    const keyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setSpaceHeld(false);
      }
    };

    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);

    return () => {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
    };
  }, [undoStack, redoStack]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const liveCanvas = liveCanvasRef.current;

    if (!canvas || !liveCanvas || !size.width || !size.height) {
      return;
    }

    const ratio = window.devicePixelRatio || 1;
    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    canvas.width = Math.floor(size.width * ratio);
    canvas.height = Math.floor(size.height * ratio);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    liveCanvas.width = Math.floor(size.width * ratio);
    liveCanvas.height = Math.floor(size.height * ratio);
    liveCanvas.style.width = `${size.width}px`;
    liveCanvas.style.height = `${size.height}px`;
    liveCanvas.getContext('2d')?.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, size.width, size.height);
    drawCanvas(
      context,
      note.objects,
      camera,
      size,
      shapeDraft,
      settings,
      note.canvasColor,
      note.canvasPattern,
    );
  }, [camera, note.objects, settings, shapeDraft, size]);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const file = [...(event.clipboardData?.files ?? [])].find((item) =>
        item.type.startsWith('image/'),
      );

      if (!file || !rootRef.current?.matches(':hover')) {
        return;
      }

      const reader = new FileReader();

      reader.addEventListener('load', () => {
        if (typeof reader.result !== 'string') {
          return;
        }

        addImage(
          reader.result,
          file.name,
          screenToWorld({ x: size.width / 2, y: size.height / 2 }),
        );
      });
      reader.readAsDataURL(file);
    };

    window.addEventListener('paste', onPaste);

    return () => window.removeEventListener('paste', onPaste);
  });

  const screenToWorld = (point: ScreenPoint): Point => ({
    x: (point.x - camera.x) / camera.zoom,
    y: (point.y - camera.y) / camera.zoom,
    pressure: pointerPressure.current,
    tiltX: 0,
    tiltY: 0,
    time: performance.now(),
  });

  const clientScreenPoint = (clientX: number, clientY: number): ScreenPoint => {
    const bounds = canvasBounds.current;

    return { x: clientX - bounds.left, y: clientY - bounds.top };
  };

  const eventScreenPoint = (event: React.PointerEvent): ScreenPoint =>
    clientScreenPoint(event.clientX, event.clientY);

  const pointerWorldPoint = (event: PointerEvent): Point => {
    const screenPoint = clientScreenPoint(event.clientX, event.clientY);
    const point = screenToWorld(screenPoint);

    return {
      ...point,
      pressure: normalizedPressure(event.pressure, event.pointerType),
      tiltX: event.tiltX,
      tiltY: event.tiltY,
      time: performance.now(),
    };
  };

  const eventWorldPoint = (event: React.PointerEvent): Point =>
    pointerWorldPoint(event.nativeEvent);

  const coalescedWorldPoints = (event: React.PointerEvent): Point[] => {
    const samples = event.nativeEvent.getCoalescedEvents?.() ?? [];
    const events = samples.length ? samples : [event.nativeEvent];

    return events.map(pointerWorldPoint);
  };

  const updateCamera = (nextCamera: Camera) => {
    const nextNote = { ...noteRef.current, camera: nextCamera };

    noteRef.current = nextNote;
    onChange(nextNote);
  };

  const updateSurface = (patch: Partial<Pick<Note, 'canvasColor' | 'canvasPattern'>>) => {
    const nextNote = { ...noteRef.current, ...patch, updatedAt: Date.now() };

    noteRef.current = nextNote;
    onChange(nextNote);
  };

  const updatePointerUi = (pressure: number) => {
    if (pointerPressure.current === pressure) {
      return;
    }

    pointerPressure.current = pressure;

    if (pressureLabelRef.current) {
      pressureLabelRef.current.textContent = `Pressure ${Math.round(pressure * 100)}%`;
    }
  };

  const replaceRecognizedStrokes = (state: ConversionState, text: string) => {
    const currentNote = noteRef.current;
    const convertedStrokes = currentNote.objects.filter(
      (object): object is InkStroke =>
        object.type === 'stroke' && state.objectIds.includes(object.id),
    );
    const scribbleColor = convertedStrokes[0]?.color || '#4c9bff';
    const firstPoint = convertedStrokes[0]?.points?.[0];
    const bounds = convertedStrokes.length ? mergeBounds(convertedStrokes) : state.bounds;

    const startX = firstPoint ? firstPoint.x : bounds.x;
    const startY = firstPoint ? firstPoint.y : bounds.y;

    const paragraphs = escapeHtml(text)
      .split('\n')
      .map((line) => `<p><span style="color: ${scribbleColor}">${line || '<br>'}</span></p>`)
      .join('');

    const textObject: TextObject = {
      id: makeId('handwriting'),
      type: 'text',
      x: startX,
      y: startY,
      width: Math.max(60, Math.min(720, Math.ceil(bounds.width + 16))),
      html: paragraphs,
      textStyle: 'handwriting',
      handwritingFont: settings.handwritingFont,
      createdAt: Date.now(),
    };

    replaceObjects([
      ...currentNote.objects.filter((object) => !state.objectIds.includes(object.id)),
      textObject,
    ]);
    setSelectedObjectId(textObject.id);
    setConversion(null);
  };

  const recognizeStrokes = (strokes: InkStroke[], bounds: WorldRect) => {
    const state: ConversionState = {
      status: 'recognizing',
      bounds,
      objectIds: strokes.map((stroke) => stroke.id),
      text: '',
    };
    const noteId = noteRef.current.id;

    recognizeHandwriting(rasterizeStrokes(strokes, bounds))
      .then((text) => {
        if (noteRef.current.id !== noteId || !text.trim()) {
          setConversion(null);
          return;
        }

        replaceRecognizedStrokes(state, text);
      })
      .catch(() => {
        setConversion(null);
      });
  };

  const beginManualConversion = (draft: ShapeDraft) => {
    const bounds = normalizeRect(draft.start, draft.end);
    const strokes = noteRef.current.objects.filter(
      (object): object is InkStroke => object.type === 'stroke' && strokeIntersects(object, bounds),
    );

    if (bounds.width < 8 || bounds.height < 8 || !strokes.length) {
      return;
    }

    recognizeStrokes(strokes, mergeBounds(strokes));
  };

  const queueAutomaticConversion = (stroke: InkStroke) => {
    recentStrokeIds.current.push(stroke.id);

    if (autoConversionTimer.current) {
      window.clearTimeout(autoConversionTimer.current);
    }

    autoConversionTimer.current = window.setTimeout(() => {
      const ids = recentStrokeIds.current;
      const strokes = noteRef.current.objects.filter(
        (object): object is InkStroke => object.type === 'stroke' && ids.includes(object.id),
      );

      recentStrokeIds.current = [];
      autoConversionTimer.current = null;

      if (strokes.length) {
        recognizeStrokes(strokes, mergeBounds(strokes));
      }
    }, settings.conversionDelayMs);
  };

  const eraseAtPoint = (point: Point) => {
    const radius = 14 / camera.zoom;
    const nextObjects = noteRef.current.objects.filter(
      (object) => object.type !== 'stroke' || !hitStroke(object, point, radius),
    );

    if (nextObjects.length !== noteRef.current.objects.length) {
      replaceObjects(nextObjects);
    }
  };

  const handlePointerDown = (event: React.PointerEvent) => {
    if ((event.target as HTMLElement).closest('.text-card')) {
      return;
    }

    rootRef.current?.setPointerCapture(event.pointerId);
    const screenPoint = eventScreenPoint(event);
    const worldPoint = eventWorldPoint(event);

    updatePointerUi(worldPoint.pressure);
    setSelectedObjectId(null);

    if (spaceHeld || event.button === 1) {
      panning.current = true;
      panOrigin.current = screenPoint;
      cameraOrigin.current = camera;

      return;
    }

    if (tool === 'pen' || tool === 'highlighter') {
      const baseColor = settings.penColor.startsWith('#') ? settings.penColor : '#f19b3f';
      const strokeColor = tool === 'highlighter' ? `${baseColor.slice(0, 7)}66` : settings.penColor;

      workingStroke.current = {
        id: makeId('stroke'),
        type: 'stroke',
        points: [worldPoint],
        color: strokeColor,
        width: tool === 'highlighter' ? 18 : 3.2,
        isHighlighter: tool === 'highlighter',
        createdAt: Date.now(),
      };
      return;
    }

    if (tool === 'eraser') {
      eraseAtPoint(worldPoint);

      return;
    }

    if (tool === 'shape') {
      setShapeDraft({ start: worldPoint, end: worldPoint });

      return;
    }

    if (tool === 'text') {
      const objectsWithoutEmptyText = noteRef.current.objects.filter(
        (object) => object.type !== 'text' || hasTextContent(object.html),
      );
      const textObject: TextObject = {
        id: makeId('text'),
        type: 'text',
        x: worldPoint.x,
        y: worldPoint.y,
        width: 420,
        html: '<p></p>',
        createdAt: Date.now(),
      };

      replaceObjects([...objectsWithoutEmptyText, textObject]);
      setSelectedObjectId(textObject.id);

      return;
    }

    if (tool === 'image') {
      imagePlacement.current = worldPoint;
      fileInputRef.current?.click();

      return;
    }

    if (tool === 'handwriting') {
      setConversion(null);
      setSelectionDraft({ start: worldPoint, end: worldPoint });
    }
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (event.pointerType === 'pen' && tool !== 'pen') {
      onPenDetected();
    }

    if (
      !event.buttons &&
      !panning.current &&
      !workingStroke.current &&
      !shapeDraft &&
      !selectionDraft
    ) {
      updatePointerUi(0);

      return;
    }

    const screenPoint = eventScreenPoint(event);
    const physicalPoint = eventWorldPoint(event);

    updatePointerUi(event.buttons ? physicalPoint.pressure : 0);

    if (panning.current && panOrigin.current && cameraOrigin.current) {
      updateCamera({
        ...camera,
        x: cameraOrigin.current.x + screenPoint.x - panOrigin.current.x,
        y: cameraOrigin.current.y + screenPoint.y - panOrigin.current.y,
      });

      return;
    }

    if (workingStroke.current) {
      const lastPoint = workingStroke.current.points.at(-1)!;
      const samples = coalescedWorldPoints(event).filter(
        (point) => pointDistance(point, lastPoint) > 0.08,
      );

      if (!samples.length) {
        return;
      }

      const previousPoint = lastPoint;
      workingStroke.current = {
        ...workingStroke.current,
        points: [...workingStroke.current.points, ...samples],
      };
      const liveContext = liveCanvasRef.current?.getContext('2d');

      if (liveContext) {
        drawStrokeSegment(
          liveContext,
          [previousPoint, ...samples],
          workingStroke.current,
          camera,
          settings.pressureWidth,
        );
      }

      return;
    }

    if (tool === 'eraser' && event.buttons) {
      eraseAtPoint(physicalPoint);

      return;
    }

    if (shapeDraft) {
      setShapeDraft({ ...shapeDraft, end: physicalPoint });

      return;
    }

    if (selectionDraft) {
      setSelectionDraft({ ...selectionDraft, end: physicalPoint });
    }
  };

  const handlePointerUp = (event: React.PointerEvent) => {
    const finishedStroke = workingStroke.current;

    rootRef.current?.releasePointerCapture(event.pointerId);
    panning.current = false;
    panOrigin.current = null;
    cameraOrigin.current = null;
    workingStroke.current = null;
    pointerPressure.current = 0;
    if (pressureLabelRef.current) {
      pressureLabelRef.current.textContent = 'Pressure 0%';
    }

    const liveCanvas = liveCanvasRef.current;
    const liveContext = liveCanvas?.getContext('2d');

    if (liveCanvas && liveContext) {
      const ratio = window.devicePixelRatio || 1;
      liveContext.setTransform(ratio, 0, 0, ratio, 0, 0);
      liveContext.clearRect(0, 0, size.width, size.height);
    }

    if (finishedStroke && finishedStroke.points.length > 1) {
      replaceObjects([...noteRef.current.objects, finishedStroke]);
    }

    if (finishedStroke && settings.conversionMode === 'after-delay') {
      queueAutomaticConversion(finishedStroke);
    }

    if (shapeDraft) {
      const selectedShapeType = settings.selectedShape ?? 'rectangle';
      const shape: ShapeObject = {
        id: makeId('shape'),
        type: 'shape',
        shape: selectedShapeType,
        x:
          selectedShapeType === 'arrow' || selectedShapeType === 'line'
            ? shapeDraft.start.x
            : Math.min(shapeDraft.start.x, shapeDraft.end.x),
        y:
          selectedShapeType === 'arrow' || selectedShapeType === 'line'
            ? shapeDraft.start.y
            : Math.min(shapeDraft.start.y, shapeDraft.end.y),
        width:
          selectedShapeType === 'arrow' || selectedShapeType === 'line'
            ? shapeDraft.end.x - shapeDraft.start.x
            : Math.abs(shapeDraft.end.x - shapeDraft.start.x),
        height:
          selectedShapeType === 'arrow' || selectedShapeType === 'line'
            ? shapeDraft.end.y - shapeDraft.start.y
            : Math.abs(shapeDraft.end.y - shapeDraft.start.y),
        color: settings.penColor,
        createdAt: Date.now(),
      };

      replaceObjects([...noteRef.current.objects, shape]);
      setShapeDraft(null);
    }

    if (selectionDraft) {
      beginManualConversion(selectionDraft);
      setSelectionDraft(null);
    }
  };

  const handleWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    const screenPoint = eventScreenPoint(event as unknown as React.PointerEvent);
    const worldBefore = screenToWorld(screenPoint);
    const nextZoom = Math.min(3, Math.max(0.2, camera.zoom * Math.exp(-event.deltaY * 0.001)));

    updateCamera({
      zoom: nextZoom,
      x: screenPoint.x - worldBefore.x * nextZoom,
      y: screenPoint.y - worldBefore.y * nextZoom,
    });
  };

  const addImage = (source: string, alt: string, point: Point) => {
    const image = new window.Image();

    image.addEventListener('load', () => {
      const maxWidth = 520;
      const scale = Math.min(1, maxWidth / image.naturalWidth);
      const imageObject: ImageObject = {
        id: makeId('image'),
        type: 'image',
        x: point.x,
        y: point.y,
        width: image.naturalWidth * scale,
        height: image.naturalHeight * scale,
        source,
        alt,
        createdAt: Date.now(),
      };

      replaceObjects([...note.objects, imageObject]);
    });
    image.src = source;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const point = imagePlacement.current;

    if (!file || !point) {
      return;
    }

    const reader = new FileReader();

    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        addImage(reader.result, file.name, point);
      }
    });
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const updateTextObject = (id: string, html: string) => {
    const hasContent = hasTextContent(html);

    if (!hasContent) {
      replaceObjects(noteRef.current.objects.filter((object) => object.id !== id));
      setSelectedObjectId(null);

      return;
    }

    replaceObjects(
      noteRef.current.objects.map((object) =>
        object.id === id ? { ...object, html } : object,
      ) as CanvasObject[],
    );
  };

  const removeObject = (id: string) => {
    replaceObjects(noteRef.current.objects.filter((object) => object.id !== id));
    setSelectedObjectId(null);
  };

  const setZoom = (zoom: number) => {
    const center = { x: size.width / 2, y: size.height / 2 };
    const worldCenter = screenToWorld(center);
    const nextZoom = Math.min(3, Math.max(0.2, zoom));

    updateCamera({
      zoom: nextZoom,
      x: center.x - worldCenter.x * nextZoom,
      y: center.y - worldCenter.y * nextZoom,
    });
  };

  return (
    <div
      ref={rootRef}
      className={`infinite-canvas tool-${tool}${spaceHeld ? ' is-panning' : ''}`}
      data-canvas-tone={isLightColor(note.canvasColor) ? 'light' : 'dark'}
      style={
        {
          backgroundColor: note.canvasColor,
          '--canvas-ink': isLightColor(note.canvasColor) ? '#24272d' : '#eceef3',
          '--canvas-muted': isLightColor(note.canvasColor)
            ? 'rgba(36, 39, 45, .42)'
            : 'rgba(236, 238, 243, .38)',
        } as React.CSSProperties
      }
      onPointerDown={handlePointerDown}
      onPointerEnter={(event) => {
        if (event.pointerType === 'pen' && tool !== 'pen') {
          onPenDetected();
        }
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
    >
      <div className="editor-banner-container" onPointerDown={(e) => e.stopPropagation()}>
        <div className="editor-title-row">
          <input
            className="document-inline-title"
            value={note.title}
            onChange={(event) =>
              onChange({ ...note, title: event.target.value, updatedAt: Date.now() })
            }
            placeholder="Untitled canvas"
            aria-label="Canvas title"
          />
          <div className="document-mode-label">
            <Maximize2 size={14} /> Infinite canvas
          </div>
        </div>

        <div className="editor-full-toolbar">
          <div className="toolbar-left-group">{children}</div>
          <div className="toolbar-right-group">
            <div className="document-format-bar">
              <button
                onClick={handleUndo}
                disabled={!undoStack.length}
                aria-label="Undo"
                title="Undo (⌘Z)"
              >
                <Undo2 size={16} />
              </button>
              <button
                onClick={handleRedo}
                disabled={!redoStack.length}
                aria-label="Redo"
                title="Redo (⌘⇧Z)"
              >
                <Redo2 size={16} />
              </button>
            </div>

            <div className="document-paper-control">
              <button
                className={backgroundOpen ? 'active' : ''}
                onClick={() => setBackgroundOpen((open) => !open)}
              >
                <Layers2 size={14} />
                Background
                <ChevronDown size={14} />
              </button>
              {backgroundOpen ? (
                <div className="paper-menu">
                  <p>Paper</p>
                  <div className="paper-color-row">
                    {canvasColors.map((color) => (
                      <button
                        key={color}
                        className={note.canvasColor === color ? 'active' : ''}
                        style={{ backgroundColor: color }}
                        onClick={() => updateSurface({ canvasColor: color })}
                        aria-label={`Canvas color ${color}`}
                      >
                        {note.canvasColor === color ? <Check size={12} /> : null}
                      </button>
                    ))}
                  </div>
                  <p>Layout</p>
                  <div className="paper-pattern-row">
                    {canvasPatterns.map((pattern) => (
                      <button
                        key={pattern.id}
                        className={note.canvasPattern === pattern.id ? 'active' : ''}
                        onClick={() => updateSurface({ canvasPattern: pattern.id })}
                      >
                        <span className={`pattern-preview ${pattern.id}`} />
                        {pattern.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="document-zoom-control">
              <button onClick={() => setZoom(camera.zoom - 0.1)} aria-label="Zoom out">
                <Minus size={14} />
              </button>
              <button onClick={() => setZoom(1)}>{Math.round(camera.zoom * 100)}%</button>
              <button onClick={() => setZoom(camera.zoom + 0.1)} aria-label="Zoom in">
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
      {audioPlayer}
      <canvas ref={canvasRef} />
      <canvas ref={liveCanvasRef} className="live-ink-canvas" />
      <div className="canvas-object-layer">
        {note.objects.map((object) =>
          object.type === 'text' ? (
            <TextCard
              key={object.id}
              object={object}
              selected={selectedObjectId === object.id}
              camera={camera}
              onSelect={() => setSelectedObjectId(object.id)}
              onChange={(html) => updateTextObject(object.id, html)}
              onDelete={() => removeObject(object.id)}
            />
          ) : null,
        )}
      </div>

      {!note.objects.length ? (
        <div
          className="blank-note-invitation"
          style={{
            transform: `translate(${camera.x + 40 * camera.zoom}px, ${camera.y + 36 * camera.zoom}px) scale(${camera.zoom})`,
          }}
        >
          Click anywhere to begin
        </div>
      ) : null}

      {selectionDraft ? (
        <div
          className="ink-selection"
          style={{
            left:
              camera.x + normalizeRect(selectionDraft.start, selectionDraft.end).x * camera.zoom,
            top: camera.y + normalizeRect(selectionDraft.start, selectionDraft.end).y * camera.zoom,
            width: normalizeRect(selectionDraft.start, selectionDraft.end).width * camera.zoom,
            height: normalizeRect(selectionDraft.start, selectionDraft.end).height * camera.zoom,
          }}
        />
      ) : null}

      <div className="canvas-status tinted-glass">
        <span>Ink stays on device</span>
        <span ref={pressureLabelRef}>Pressure 0%</span>
      </div>



      {tool === 'image' ? (
        <div className="canvas-hint">
          <ImagePlus size={16} /> Click to place an image, or paste one
        </div>
      ) : null}
      {tool === 'handwriting' ? (
        <div className="canvas-hint">Draw a box around handwriting to convert it</div>
      ) : null}

      <input
        ref={fileInputRef}
        className="visually-hidden"
        type="file"
        accept="image/*"
        onChange={handleFileChange}
      />
    </div>
  );
}

function drawCanvas(
  context: CanvasRenderingContext2D,
  objects: CanvasObject[],
  camera: Camera,
  size: { width: number; height: number },
  draft: ShapeDraft | null,
  settings: Settings,
  canvasColor: string,
  canvasPattern: CanvasPattern,
) {
  drawCanvasPattern(context, camera, size, canvasColor, canvasPattern);
  context.save();
  context.translate(camera.x, camera.y);
  context.scale(camera.zoom, camera.zoom);

  objects.forEach((object) => {
    if (object.type === 'stroke') {
      drawStroke(context, object, settings.pressureWidth);
    }

    if (object.type === 'shape') {
      drawShape(context, object);
    }

    if (object.type === 'image') {
      drawImage(context, object);
    }
  });

  if (draft) {
    const selectedShapeType = settings.selectedShape ?? 'rectangle';
    drawShape(context, {
      id: 'draft',
      type: 'shape',
      shape: selectedShapeType,
      x:
        selectedShapeType === 'arrow' || selectedShapeType === 'line'
          ? draft.start.x
          : Math.min(draft.start.x, draft.end.x),
      y:
        selectedShapeType === 'arrow' || selectedShapeType === 'line'
          ? draft.start.y
          : Math.min(draft.start.y, draft.end.y),
      width:
        selectedShapeType === 'arrow' || selectedShapeType === 'line'
          ? draft.end.x - draft.start.x
          : Math.abs(draft.end.x - draft.start.x),
      height:
        selectedShapeType === 'arrow' || selectedShapeType === 'line'
          ? draft.end.y - draft.start.y
          : Math.abs(draft.end.y - draft.start.y),
      color: '#d46a61',
      createdAt: Date.now(),
    });
  }

  context.restore();
}

function drawCanvasPattern(
  context: CanvasRenderingContext2D,
  camera: Camera,
  size: { width: number; height: number },
  canvasColor: string,
  canvasPattern: CanvasPattern,
) {
  if (canvasPattern === 'plain') {
    return;
  }

  const spacing = 28 * camera.zoom;
  const offsetX = ((camera.x % spacing) + spacing) % spacing;
  const offsetY = ((camera.y % spacing) + spacing) % spacing;
  const lineColor = isLightColor(canvasColor)
    ? 'rgba(26, 32, 43, .09)'
    : 'rgba(231, 235, 242, .075)';

  context.save();
  context.strokeStyle = lineColor;
  context.fillStyle = lineColor;
  context.lineWidth = 1;

  if (canvasPattern === 'dots') {
    context.beginPath();
    for (let x = offsetX; x < size.width; x += spacing) {
      for (let y = offsetY; y < size.height; y += spacing) {
        context.moveTo(x + 0.85, y);
        context.arc(x, y, 0.85, 0, Math.PI * 2);
      }
    }
    context.fill();
  } else {
    context.beginPath();
    for (let y = offsetY; y < size.height; y += spacing) {
      const lineY = Math.floor(y) + 0.5;
      context.moveTo(0, lineY);
      context.lineTo(size.width, lineY);
    }

    if (canvasPattern === 'grid') {
      for (let x = offsetX; x < size.width; x += spacing) {
        const lineX = Math.floor(x) + 0.5;
        context.moveTo(lineX, 0);
        context.lineTo(lineX, size.height);
      }
    }

    context.stroke();
  }

  context.restore();
}

function drawStrokeSegment(
  context: CanvasRenderingContext2D,
  points: Point[],
  stroke: InkStroke,
  camera: Camera,
  pressureWidth: boolean,
) {
  context.save();
  context.translate(camera.x, camera.y);
  context.scale(camera.zoom, camera.zoom);
  drawStroke(context, { ...stroke, points }, pressureWidth);
  context.restore();
}

function drawStroke(context: CanvasRenderingContext2D, stroke: InkStroke, pressureWidth: boolean) {
  if (stroke.points.length < 2) {
    return;
  }

  context.save();
  if (stroke.isHighlighter) {
    context.globalCompositeOperation = 'multiply';
    context.strokeStyle = stroke.color;
    context.lineCap = 'square';
    context.lineJoin = 'miter';
  } else {
    context.strokeStyle = stroke.color;
    context.lineCap = 'round';
    context.lineJoin = 'round';
  }

  if (!pressureWidth || stroke.isHighlighter) {
    context.lineWidth = stroke.width;
    context.beginPath();
    context.moveTo(stroke.points[0].x, stroke.points[0].y);

    for (let index = 1; index < stroke.points.length; index += 1) {
      context.lineTo(stroke.points[index].x, stroke.points[index].y);
    }

    context.stroke();
  } else {
    for (let index = 1; index < stroke.points.length; index += 1) {
      const previous = stroke.points[index - 1];
      const current = stroke.points[index];
      const pressure = (previous.pressure + current.pressure) / 2;

      context.lineWidth = stroke.width * (0.45 + pressure * 1.2);
      context.beginPath();
      context.moveTo(previous.x, previous.y);
      context.lineTo(current.x, current.y);
      context.stroke();
    }
  }

  context.restore();
}

function drawShape(context: CanvasRenderingContext2D, shape: ShapeObject) {
  context.save();
  context.strokeStyle = shape.color;
  context.fillStyle = `${shape.color}17`;
  context.lineWidth = 2;

  if (shape.shape === 'rectangle') {
    context.beginPath();
    context.roundRect(shape.x, shape.y, shape.width, shape.height, 16);
    context.fill();
    context.stroke();
  }

  if (shape.shape === 'ellipse') {
    context.beginPath();
    context.ellipse(
      shape.x + shape.width / 2,
      shape.y + shape.height / 2,
      Math.abs(shape.width / 2),
      Math.abs(shape.height / 2),
      0,
      0,
      Math.PI * 2,
    );
    context.fill();
    context.stroke();
  }

  if (shape.shape === 'diamond') {
    const cx = shape.x + shape.width / 2;
    const cy = shape.y + shape.height / 2;
    context.beginPath();
    context.moveTo(cx, shape.y);
    context.lineTo(shape.x + shape.width, cy);
    context.lineTo(cx, shape.y + shape.height);
    context.lineTo(shape.x, cy);
    context.closePath();
    context.fill();
    context.stroke();
  }

  if (shape.shape === 'triangle') {
    const cx = shape.x + shape.width / 2;
    context.beginPath();
    context.moveTo(cx, shape.y);
    context.lineTo(shape.x + shape.width, shape.y + shape.height);
    context.lineTo(shape.x, shape.y + shape.height);
    context.closePath();
    context.fill();
    context.stroke();
  }

  if (shape.shape === 'line') {
    context.beginPath();
    context.moveTo(shape.x, shape.y);
    context.lineTo(shape.x + shape.width, shape.y + shape.height);
    context.stroke();
  }

  if (shape.shape === 'arrow') {
    const endX = shape.x + shape.width;
    const endY = shape.y + shape.height;
    const angle = Math.atan2(shape.height, shape.width);

    context.beginPath();
    context.moveTo(shape.x, shape.y);
    context.lineTo(endX, endY);
    context.lineTo(
      endX - 12 * Math.cos(angle - Math.PI / 6),
      endY - 12 * Math.sin(angle - Math.PI / 6),
    );
    context.moveTo(endX, endY);
    context.lineTo(
      endX - 12 * Math.cos(angle + Math.PI / 6),
      endY - 12 * Math.sin(angle + Math.PI / 6),
    );
    context.stroke();
  }

  context.restore();
}

function drawImage(context: CanvasRenderingContext2D, object: ImageObject) {
  let image = imageCache.get(object.source);

  if (!image) {
    image = new window.Image();
    image.src = object.source;
    imageCache.set(object.source, image);
  }

  if (image.complete) {
    context.save();
    context.beginPath();
    context.roundRect(object.x, object.y, object.width, object.height, 14);
    context.clip();
    context.drawImage(image, object.x, object.y, object.width, object.height);
    context.restore();
  }
}
