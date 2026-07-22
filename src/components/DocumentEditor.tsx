import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import { Editor, EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Check,
  CheckSquare,
  ChevronDown,
  FileText,
  Heading2,
  Italic,
  List,
  Minus,
  Palette,
  Plus,
  Redo2,
  Table2,
  Undo2,
} from 'lucide-react';
import type { CanvasPattern, DocumentPage, InkStroke, Note, Point, Settings, Tool } from '../types';
import { RichTextSlashMenu } from './RichTextSlashMenu';
import { TextStyleMark } from '../lib/tiptapTextStyle';

const PALETTE_COLORS = [
  { id: 'default', label: 'Default', value: '' },
  { id: 'white', label: 'White', value: '#ffffff' },
  { id: 'muted', label: 'Muted', value: '#94a3b8' },
  { id: 'red', label: 'Red', value: '#ff5c5c' },
  { id: 'crimson', label: 'Crimson', value: '#e63946' },
  { id: 'orange', label: 'Orange', value: '#ff8c38' },
  { id: 'gold', label: 'Gold', value: '#ffd166' },
  { id: 'yellow', label: 'Yellow', value: '#fee440' },
  { id: 'mint', label: 'Mint', value: '#2ec4b6' },
  { id: 'sky', label: 'Sky', value: '#3a86ff' },
  { id: 'indigo', label: 'Indigo', value: '#4361ee' },
  { id: 'purple', label: 'Purple', value: '#8a2be2' },
  { id: 'pink', label: 'Pink', value: '#ff70a6' },
  { id: 'magenta', label: 'Magenta', value: '#f72585' },
];

interface DocumentEditorProps {
  note: Note;
  tool: Tool;
  settings: Settings;
  onChange: (note: Note) => void;
  onPenDetected: () => void;
  children?: React.ReactNode;
  audioPlayer?: React.ReactNode;
}

interface DocumentPageEditorProps {
  page: DocumentPage;
  pageNumber: number;
  paperColor: string;
  pattern: CanvasPattern;
  tool: Tool;
  settings: Settings;
  onActivateEditor: (editor: Editor) => void;
  onOpenSlashMenu: (editor: Editor) => void;
  onCloseSlashMenu: () => void;
  onChange: (page: DocumentPage) => void;
}

const pageWidth = 794;
const pageHeight = 1123;
const paperColors = ['#000000', '#17181b', '#202226', '#292b30', '#f5f3ee', '#ffffff'];
const paperPatterns: { id: CanvasPattern; label: string }[] = [
  { id: 'plain', label: 'Plain' },
  { id: 'ruled', label: 'Ruled' },
  { id: 'grid', label: 'Grid' },
  { id: 'dots', label: 'Dots' },
];

const makeId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

const isLightColor = (hex: string) => {
  const value = hex.replace('#', '');
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);

  return (red * 299 + green * 587 + blue * 114) / 1000 > 160;
};

export function DocumentEditor({
  note,
  tool,
  settings,
  onChange,
  onPenDetected,
  children,
  audioPlayer,
}: DocumentEditorProps) {
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const [paperMenuOpen, setPaperMenuOpen] = useState(false);
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const [documentZoom, setDocumentZoom] = useState(1.28);
  const wordCount = useMemo(() => {
    const text = note.pages.map((p) => p.html.replace(/<[^>]*>/g, ' ')).join(' ');
    return text.trim().split(/\s+/).filter(Boolean).length;
  }, [note.pages]);
  const [slashMenu, setSlashMenu] = useState<{
    editor: Editor;
    position: { x: number; y: number };
  } | null>(null);

  const updatePage = (nextPage: DocumentPage) => {
    onChange({
      ...note,
      updatedAt: Date.now(),
      pages: note.pages.map((page) => (page.id === nextPage.id ? nextPage : page)),
    });
  };

  const updateSurface = (patch: Partial<Pick<Note, 'canvasColor' | 'canvasPattern'>>) => {
    onChange({ ...note, ...patch, updatedAt: Date.now() });
  };

  const addPage = () => {
    const page: DocumentPage = { id: makeId('page'), html: '<p></p>', objects: [] };

    onChange({ ...note, pages: [...note.pages, page], updatedAt: Date.now() });
  };

  const openSlashMenu = (editor: Editor) => {
    const coordinates = editor.view.coordsAtPos(editor.state.selection.from);

    setActiveEditor(editor);
    setSlashMenu({
      editor,
      position: {
        x: Math.max(12, Math.min(coordinates.left, window.innerWidth - 300)),
        y: Math.max(12, Math.min(coordinates.bottom + 6, window.innerHeight - 390)),
      },
    });
  };

  const formatButton = (
    label: string,
    icon: React.ReactNode,
    action: (editor: Editor) => void,
    active = false,
  ) => (
    <button
      aria-label={label}
      className={active ? 'active' : ''}
      disabled={!activeEditor}
      onPointerDown={(event) => event.preventDefault()}
      onClick={() => activeEditor && action(activeEditor)}
    >
      {icon}
    </button>
  );

  return (
    <section
      className={`document-editor tool-${tool}`}
      onPointerEnter={(event) => {
        if (event.pointerType === 'pen' && tool !== 'pen') {
          onPenDetected();
        }
      }}
      onPointerMove={(event) => {
        if (event.pointerType === 'pen' && tool !== 'pen') {
          onPenDetected();
        }
      }}
    >
      <div className="document-topbar">
        {children}
        <div className="document-format-bar" aria-label="Text formatting">
          {formatButton('Undo', <Undo2 size={16} />, (editor) =>
            editor.chain().focus().undo().run(),
          )}
          {formatButton('Redo', <Redo2 size={16} />, (editor) =>
            editor.chain().focus().redo().run(),
          )}
          <span />
          <select
            className="toolbar-select"
            aria-label="Font size"
            disabled={!activeEditor}
            onChange={(event) => {
              const val = event.target.value;
              if (activeEditor) {
                if (val === 'normal') {
                  activeEditor.chain().focus().setMark('textStyle', { fontSize: null }).run();
                } else {
                  activeEditor.chain().focus().setMark('textStyle', { fontSize: val }).run();
                }
              }
            }}
          >
            <option value="normal">Size</option>
            <option value="13px">13px</option>
            <option value="16px">16px</option>
            <option value="20px">20px</option>
            <option value="26px">26px</option>
            <option value="34px">34px</option>
          </select>
          <div className="color-palette-container">
            <button
              className={colorMenuOpen ? 'active' : ''}
              disabled={!activeEditor}
              onClick={() => setColorMenuOpen((open) => !open)}
              aria-label="Color palette"
              title="Text color"
            >
              <Palette size={16} />
            </button>
            {colorMenuOpen && activeEditor ? (
              <div className="text-color-palette tinted-glass">
                <div className="swatch-grid">
                  {PALETTE_COLORS.map((c) => (
                    <button
                      key={c.id}
                      className="swatch-item"
                      style={{ backgroundColor: c.value || '#e2e8f0' }}
                      title={c.label}
                      onClick={() => {
                        if (c.value) {
                          activeEditor.chain().focus().setMark('textStyle', { color: c.value }).run();
                        } else {
                          activeEditor.chain().focus().setMark('textStyle', { color: null }).run();
                        }
                        setColorMenuOpen(false);
                      }}
                    />
                  ))}
                </div>
                <label className="custom-color-row">
                  <span>Custom</span>
                  <input
                    type="color"
                    onChange={(event) => {
                      activeEditor.chain().focus().setMark('textStyle', { color: event.target.value }).run();
                      setColorMenuOpen(false);
                    }}
                  />
                </label>
              </div>
            ) : null}
          </div>
          <span />
          {formatButton(
            'Bold',
            <Bold size={16} />,
            (editor) => editor.chain().focus().toggleBold().run(),
            Boolean(activeEditor?.isActive('bold')),
          )}
          {formatButton(
            'Italic',
            <Italic size={16} />,
            (editor) => editor.chain().focus().toggleItalic().run(),
            Boolean(activeEditor?.isActive('italic')),
          )}
          {formatButton(
            'Heading',
            <Heading2 size={17} />,
            (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
            Boolean(activeEditor?.isActive('heading', { level: 2 })),
          )}
          {formatButton(
            'Bullet list',
            <List size={17} />,
            (editor) => editor.chain().focus().toggleBulletList().run(),
            Boolean(activeEditor?.isActive('bulletList')),
          )}
          {formatButton(
            'Checklist',
            <CheckSquare size={16} />,
            (editor) => editor.chain().focus().toggleTaskList().run(),
            Boolean(activeEditor?.isActive('taskList')),
          )}
          {formatButton('Table', <Table2 size={16} />, (editor) =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
          )}
        </div>
      </div>

      <div className="document-viewport-controls">
        <div className="document-zoom-control" aria-label="Page zoom">
          <button
            onClick={() =>
              setDocumentZoom((zoom) => Math.max(0.9, Number((zoom - 0.1).toFixed(2))))
            }
            aria-label="Zoom out"
          >
            <Minus size={14} />
          </button>
          <button onClick={() => setDocumentZoom(1.28)} aria-label="Reset page zoom">
            {Math.round(documentZoom * 100)}%
          </button>
          <button
            onClick={() =>
              setDocumentZoom((zoom) => Math.min(1.5, Number((zoom + 0.1).toFixed(2))))
            }
            aria-label="Zoom in"
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="document-paper-control">
          <button
            className={paperMenuOpen ? 'active' : ''}
            onClick={() => setPaperMenuOpen((open) => !open)}
            aria-label="Page appearance"
          >
            A4 · {paperPatterns.find((item) => item.id === note.canvasPattern)?.label}
            <ChevronDown size={14} />
          </button>
          {paperMenuOpen ? (
            <div className="paper-menu">
              <p>Paper</p>
              <div className="paper-color-row">
                {paperColors.map((color) => (
                  <button
                    key={color}
                    className={note.canvasColor === color ? 'active' : ''}
                    style={{ backgroundColor: color }}
                    onClick={() => updateSurface({ canvasColor: color })}
                    aria-label={`Page color ${color}`}
                  >
                    {note.canvasColor === color ? <Check size={12} /> : null}
                  </button>
                ))}
              </div>
              <p>Layout</p>
              <div className="paper-pattern-row">
                {paperPatterns.map((pattern) => (
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
      </div>

      <div className="document-scroll">
        {audioPlayer}
        <div className="document-header">
          <input
            className="document-inline-title"
            value={note.title}
            onChange={(event) =>
              onChange({ ...note, title: event.target.value, updatedAt: Date.now() })
            }
            placeholder="Untitled"
            aria-label="Note title"
          />
          <span className="document-mode-label">
            <FileText size={14} /> Document · {note.pages.length}{' '}
            {note.pages.length === 1 ? 'page' : 'pages'} · {wordCount} words
          </span>
        </div>
        <div
          className="document-page-stack"
          style={{ '--document-zoom': documentZoom } as React.CSSProperties}
        >
          {note.pages.map((page, index) => (
            <DocumentPageEditor
              key={page.id}
              page={page}
              pageNumber={index + 1}
              paperColor={note.canvasColor}
              pattern={note.canvasPattern}
              tool={tool}
              settings={settings}
              onActivateEditor={setActiveEditor}
              onOpenSlashMenu={openSlashMenu}
              onCloseSlashMenu={() => setSlashMenu(null)}
              onChange={updatePage}
            />
          ))}
          <button className="add-page-button" onClick={addPage}>
            <Plus size={16} /> Add page
          </button>
        </div>
      </div>
      {slashMenu ? (
        <RichTextSlashMenu
          editor={slashMenu.editor}
          position={slashMenu.position}
          onClose={() => setSlashMenu(null)}
        />
      ) : null}
    </section>
  );
}

function DocumentPageEditor({
  page,
  pageNumber,
  paperColor,
  pattern,
  tool,
  settings,
  onActivateEditor,
  onOpenSlashMenu,
  onCloseSlashMenu,
  onChange,
}: DocumentPageEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyleMark,
      Placeholder.configure({ placeholder: 'Start writing…' }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: page.html,
    onFocus: ({ editor: currentEditor }) => onActivateEditor(currentEditor),
    onUpdate: ({ editor: currentEditor }) => {
      const cursor = currentEditor.state.selection.from;
      const latestCharacter =
        cursor > 1 ? currentEditor.state.doc.textBetween(cursor - 1, cursor) : '';
      const previousCharacter =
        cursor > 2 ? currentEditor.state.doc.textBetween(cursor - 2, cursor - 1) : '';

      if (latestCharacter === '/' && (!previousCharacter || /\s/.test(previousCharacter))) {
        currentEditor
          .chain()
          .focus()
          .deleteRange({ from: cursor - 1, to: cursor })
          .run();
        onOpenSlashMenu(currentEditor);

        return;
      }

      onChange({ ...page, html: currentEditor.getHTML() });
    },
    editorProps: {
      handleKeyDown: (_view, event) => {
        if (event.key === 'Escape') {
          onCloseSlashMenu();
        }

        return false;
      },
    },
  });

  useEffect(() => {
    if (editor && editor.getHTML() !== page.html && !editor.isFocused) {
      editor.commands.setContent(page.html, { emitUpdate: false });
    }
  }, [editor, page.html]);

  useEffect(() => {
    if (editor && pageNumber === 1) {
      onActivateEditor(editor);

      let targetPos: number | null = null;
      editor.state.doc.descendants((node, pos) => {
        if (targetPos === null) {
          if (node.type.name === 'listItem' || node.type.name === 'taskItem') {
            targetPos = pos + 2;
          } else if (node.type.name === 'paragraph' && pos > 0) {
            targetPos = pos + 1;
          }
        }
      });

      if (targetPos !== null) {
        editor.chain().focus().setTextSelection(targetPos).run();
      } else {
        editor.commands.focus('end');
      }
    }
  }, [editor, onActivateEditor, pageNumber]);

  const light = isLightColor(paperColor);

  return (
    <article
      className="document-page"
      data-pattern={pattern}
      data-paper-tone={light ? 'light' : 'dark'}
      style={
        {
          backgroundColor: paperColor,
          '--page-ink': light ? '#232529' : '#f2f0ea',
          '--page-muted': light ? '#858991' : '#777a82',
        } as React.CSSProperties
      }
    >
      <div className="document-page-number">{pageNumber}</div>
      <EditorContent editor={editor} className="document-rich-text" />
      <DocumentInkLayer page={page} tool={tool} settings={settings} onChange={onChange} />
    </article>
  );
}

function DocumentInkLayer({
  page,
  tool,
  settings,
  onChange,
}: {
  page: DocumentPage;
  tool: Tool;
  settings: Settings;
  onChange: (page: DocumentPage) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement>(null);
  const pageRef = useRef(page);
  const workingStroke = useRef<InkStroke | null>(null);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const liveCanvas = liveCanvasRef.current;

    if (!canvas || !liveCanvas) {
      return;
    }

    const ratio = window.devicePixelRatio || 1;

    canvas.width = pageWidth * ratio;
    canvas.height = pageHeight * ratio;
    liveCanvas.width = pageWidth * ratio;
    liveCanvas.height = pageHeight * ratio;
    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, pageWidth, pageHeight);
    page.objects.forEach((object) => {
      if (object.type === 'stroke') {
        drawStroke(context, object, settings.pressureWidth);
      }
    });
  }, [page.objects, settings.pressureWidth]);

  const eventPoint = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const bounds = event.currentTarget.getBoundingClientRect();

    return {
      x: ((event.clientX - bounds.left) / bounds.width) * pageWidth,
      y: ((event.clientY - bounds.top) / bounds.height) * pageHeight,
      pressure: event.pressure > 0 ? event.pressure : event.pointerType === 'mouse' ? 0.5 : 0.12,
      tiltX: event.tiltX,
      tiltY: event.tiltY,
      time: performance.now(),
    };
  };

  const eraseAt = (point: Point) => {
    const nextObjects = pageRef.current.objects.filter((object) => {
      if (object.type !== 'stroke') {
        return true;
      }

      return !object.points.some(
        (strokePoint) => Math.hypot(strokePoint.x - point.x, strokePoint.y - point.y) <= 14,
      );
    });

    if (nextObjects.length !== pageRef.current.objects.length) {
      const nextPage = { ...pageRef.current, objects: nextObjects };

      pageRef.current = nextPage;
      onChange(nextPage);
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool !== 'pen' && tool !== 'eraser') {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    const point = eventPoint(event);

    if (tool === 'eraser') {
      eraseAt(point);
      return;
    }

    workingStroke.current = {
      id: makeId('stroke'),
      type: 'stroke',
      points: [point],
      color: settings.penColor,
      width: 3.2,
      createdAt: Date.now(),
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!event.buttons) {
      return;
    }

    const point = eventPoint(event);

    if (tool === 'eraser') {
      eraseAt(point);
      return;
    }

    const stroke = workingStroke.current;

    if (!stroke) {
      return;
    }

    const previous = stroke.points.at(-1)!;

    if (Math.hypot(previous.x - point.x, previous.y - point.y) < 0.08) {
      return;
    }

    stroke.points.push(point);
    const context = liveCanvasRef.current?.getContext('2d');

    if (context) {
      const ratio = window.devicePixelRatio || 1;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      drawStroke(context, { ...stroke, points: [previous, point] }, settings.pressureWidth);
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    const stroke = workingStroke.current;

    workingStroke.current = null;
    const liveCanvas = liveCanvasRef.current;
    const context = liveCanvas?.getContext('2d');

    if (liveCanvas && context) {
      const ratio = window.devicePixelRatio || 1;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, pageWidth, pageHeight);
    }

    if (stroke && stroke.points.length > 1) {
      const nextPage = {
        ...pageRef.current,
        objects: [...pageRef.current.objects, stroke],
      };

      pageRef.current = nextPage;
      onChange(nextPage);
    }
  };

  return (
    <div className={`document-ink-layer tool-${tool}`}>
      <canvas ref={canvasRef} />
      <canvas
        ref={liveCanvasRef}
        className="document-live-ink"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  );
}

function drawStroke(context: CanvasRenderingContext2D, stroke: InkStroke, pressureWidth: boolean) {
  if (stroke.points.length < 2) {
    return;
  }

  context.save();
  context.strokeStyle = stroke.color;
  context.lineCap = 'round';
  context.lineJoin = 'round';

  for (let index = 1; index < stroke.points.length; index += 1) {
    const previous = stroke.points[index - 1];
    const current = stroke.points[index];
    const pressure = pressureWidth ? (previous.pressure + current.pressure) / 2 : 0.5;

    context.lineWidth = stroke.width * (0.45 + pressure * 1.2);
    context.beginPath();
    context.moveTo(previous.x, previous.y);
    context.lineTo(current.x, current.y);
    context.stroke();
  }

  context.restore();
}
