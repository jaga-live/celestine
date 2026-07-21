import { useEffect } from 'react';
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
  Sigma,
  Table2,
  Trash2,
} from 'lucide-react';
import type { TextObject } from '../types';

interface TextCardProps {
  object: TextObject;
  selected: boolean;
  camera: { x: number; y: number; zoom: number };
  onSelect: () => void;
  onChange: (html: string) => void;
  onDelete: () => void;
}

export function TextCard({
  object,
  selected,
  camera,
  onSelect,
  onChange,
  onDelete,
}: TextCardProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
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
    width: object.width,
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
