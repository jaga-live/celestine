import { Mark, mergeAttributes } from '@tiptap/core';

export const TextStyleMark = Mark.create({
  name: 'textStyle',
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => element.style.color || null,
        renderHTML: (attributes) => {
          if (!attributes.color) {
            return {};
          }

          return { style: `color: ${attributes.color}` };
        },
      },
      fontSize: {
        default: null,
        parseHTML: (element) => element.style.fontSize || null,
        renderHTML: (attributes) => {
          if (!attributes.fontSize) {
            return {};
          }

          return { style: `font-size: ${attributes.fontSize}` };
        },
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[style]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },
});
