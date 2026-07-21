import { useEffect } from 'react';
import {
  AlignLeft,
  CheckSquare,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Minus,
  Quote,
  Table2,
} from 'lucide-react';
import type { Editor } from '@tiptap/react';

interface RichTextSlashMenuProps {
  editor: Editor;
  position: { x: number; y: number };
  onClose: () => void;
}

const commands = [
  {
    label: 'Text',
    description: 'Start with a plain paragraph',
    icon: AlignLeft,
    run: (editor: Editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    label: 'Heading 1',
    description: 'Large section title',
    icon: Heading1,
    run: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    label: 'Heading 2',
    description: 'Section heading',
    icon: Heading2,
    run: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    label: 'Subheading',
    description: 'Smaller section heading',
    icon: Heading3,
    run: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    label: 'Bulleted list',
    description: 'A simple unordered list',
    icon: List,
    run: (editor: Editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    label: 'Numbered list',
    description: 'A list in sequence',
    icon: ListOrdered,
    run: (editor: Editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    label: 'To-do list',
    description: 'Track what is next',
    icon: CheckSquare,
    run: (editor: Editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    label: 'Quote',
    description: 'Call out an important idea',
    icon: Quote,
    run: (editor: Editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    label: 'Code block',
    description: 'Preserve code formatting',
    icon: Code2,
    run: (editor: Editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    label: 'Table',
    description: 'Insert a 3 by 3 table',
    icon: Table2,
    run: (editor: Editor) =>
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    label: 'Divider',
    description: 'Separate two ideas',
    icon: Minus,
    run: (editor: Editor) => editor.chain().focus().setHorizontalRule().run(),
  },
];

export function RichTextSlashMenu({ editor, position, onClose }: RichTextSlashMenuProps) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', closeOnEscape);

    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    <div
      className="slash-command-menu"
      style={{ left: position.x, top: position.y }}
      role="menu"
      aria-label="Insert a block"
      onPointerDown={(event) => event.preventDefault()}
    >
      <div className="slash-command-title">Insert a block</div>
      <div className="slash-command-options">
        {commands.map((command) => {
          const Icon = command.icon;

          return (
            <button
              key={command.label}
              role="menuitem"
              onClick={() => {
                command.run(editor);
                onClose();
              }}
            >
              <Icon size={16} />
              <span>
                <strong>{command.label}</strong>
                <small>{command.description}</small>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
