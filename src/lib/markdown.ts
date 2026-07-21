import TurndownService from 'turndown';
import type { ImageObject, Note, ShapeObject, TextObject } from '../types';

const turndown = new TurndownService({
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  headingStyle: 'atx',
});

const textToMarkdown = (object: TextObject) => turndown.turndown(object.html);

const imageToMarkdown = (object: ImageObject) => `![${object.alt || 'Image'}](${object.source})`;

const shapeToMarkdown = (object: ShapeObject) =>
  `<!-- celestine:shape ${JSON.stringify({
    shape: object.shape,
    x: object.x,
    y: object.y,
    width: object.width,
    height: object.height,
    color: object.color,
  })} -->`;

export const noteToMarkdown = (note: Note) => {
  const objectToMarkdown = (object: Note['objects'][number]) => {
    if (object.type === 'text') {
      return textToMarkdown(object);
    }

    if (object.type === 'image') {
      return imageToMarkdown(object);
    }

    if (object.type === 'shape') {
      return shapeToMarkdown(object);
    }

    return `<!-- celestine:ink stroke=${object.id} points=${object.points.length} -->`;
  };
  const body =
    note.mode === 'document'
      ? note.pages
          .map((page, index) => {
            const typedText = turndown.turndown(page.html);
            const pageObjects = [...page.objects]
              .sort((left, right) => left.createdAt - right.createdAt)
              .map(objectToMarkdown)
              .join('\n\n');

            return [`<!-- page ${index + 1} -->`, typedText, pageObjects]
              .filter(Boolean)
              .join('\n\n');
          })
          .join('\n\n---\n\n')
      : [...note.objects]
          .sort((left, right) => left.createdAt - right.createdAt)
          .map(objectToMarkdown)
          .join('\n\n');

  return `# ${note.title}\n\n${body}\n`;
};

export const downloadMarkdown = (note: Note) => {
  const blob = new Blob([noteToMarkdown(note)], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = `${note.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'note'}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
};
