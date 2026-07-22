import { useEffect, useState } from 'react';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  CheckSquare,
  Code2,
  Heading2,
  Italic,
  List,
  Palette,
  Sigma,
  Table2,
  Trash2,
} from 'lucide-react';
import type { TextObject } from '../types';
import { TextStyleMark } from '../lib/tiptapTextStyle';

interface TextCardProps {
  object: TextObject;
  selected: boolean;
  camera: { x: number; y: number; zoom: number };
  onSelect: () => void;
  onChange: (html: string) => void;
  onDelete: () => void;
}

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

export function TextCard({
  object,
  selected,
  camera,
  onSelect,
  onChange,
  onDelete,
}: TextCardProps) {
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyleMark,
      Placeholder.configure({ placeholder: 'Write something…' }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: object.html,
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getHTML()),
    onBlur: ({ editor: currentEditor }) => {
      if (currentEditor.isEmpty) {
        onDelete();
      }
    },
  });

  useEffect(() => {
    if (editor && editor.getHTML() !== object.html && !editor.isFocused) {
      editor.commands.setContent(object.html, { emitUpdate: false });
    }
  }, [editor, object.html]);

  useEffect(() => {
    if (editor && selected && editor.isEmpty) {
      editor.commands.focus('end');
    }
  }, [editor, selected]);

  if (!editor) {
    return null;
  }

  const style = {
    width: object.textStyle === 'handwriting' ? 'fit-content' : object.width,
    maxWidth: 720,
    minWidth: 48,
    transform: `translate(${camera.x + object.x * camera.zoom}px, ${camera.y + object.y * camera.zoom}px) scale(${camera.zoom})`,
  };

  return (
    <article
      className={`${selected ? 'text-card selected' : 'text-card'}${object.textStyle === 'handwriting' ? ` handwriting-text font-${object.handwritingFont ?? 'chalkboard'}` : ''}`}
      style={style}
      onPointerDown={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      {selected ? (
        <div
          className="text-toolbar tinted-glass"
          onPointerDown={(event) => event.preventDefault()}
        >
          <select
            className="text-size-select"
            aria-label="Text size"
            onChange={(event) => {
              const val = event.target.value;
              if (val === 'normal') {
                editor.chain().focus().setMark('textStyle', { fontSize: null }).run();
              } else {
                editor.chain().focus().setMark('textStyle', { fontSize: val }).run();
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
          <button
            className={colorMenuOpen ? 'active' : ''}
            onClick={() => setColorMenuOpen((open) => !open)}
            aria-label="Color palette"
            title="Text Color"
          >
            <Palette size={14} />
          </button>
          {colorMenuOpen ? (
            <div className="text-color-palette">
              <div className="swatch-grid">
                {PALETTE_COLORS.map((c) => (
                  <button
                    key={c.id}
                    className="swatch-item"
                    style={{ backgroundColor: c.value || '#e2e8f0' }}
                    title={c.label}
                    onClick={() => {
                      if (c.value) {
                        editor.chain().focus().setMark('textStyle', { color: c.value }).run();
                      } else {
                        editor.chain().focus().setMark('textStyle', { color: null }).run();
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
                    editor.chain().focus().setMark('textStyle', { color: event.target.value }).run();
                    setColorMenuOpen(false);
                  }}
                />
              </label>
            </div>
          ) : null}
          <button
            className={editor.isActive('bold') ? 'active' : ''}
            onClick={() => editor.chain().focus().toggleBold().run()}
            aria-label="Bold"
          >
            <Bold size={14} />
          </button>
          <button
            className={editor.isActive('italic') ? 'active' : ''}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            aria-label="Italic"
          >
            <Italic size={14} />
          </button>
          <button
            className={editor.isActive('heading', { level: 2 }) ? 'active' : ''}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            aria-label="Heading"
          >
            <Heading2 size={14} />
          </button>
          <button
            className={editor.isActive('bulletList') ? 'active' : ''}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            aria-label="Bullet list"
          >
            <List size={14} />
          </button>
          <button
            className={editor.isActive('taskList') ? 'active' : ''}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            aria-label="Checklist"
          >
            <CheckSquare size={14} />
          </button>
          <button
            className={editor.isActive('codeBlock') ? 'active' : ''}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            aria-label="Code block"
          >
            <Code2 size={14} />
          </button>
          <button
            onClick={() =>
              editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            }
            aria-label="Insert table"
          >
            <Table2 size={14} />
          </button>
          <button
            onClick={() => editor.chain().focus().insertContent('$E = mc^2$').run()}
            aria-label="Insert math annotation"
          >
            <Sigma size={14} />
          </button>
          <span className="text-toolbar-spacer" />
          <button className="delete-text" onClick={onDelete} aria-label="Remove text block">
            <Trash2 size={14} />
          </button>
        </div>
      ) : null}
      <EditorContent editor={editor} />
    </article>
  );
}
