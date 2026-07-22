import { useState } from 'react';
import {
  ArrowRight,
  Circle,
  Diamond,
  Eraser,
  Image,
  Minus,
  MousePointer2,
  Palette,
  PenLine,
  ScanText,
  Square,
  Triangle,
  Type,
} from 'lucide-react';
import type { NoteMode, Settings, ShapeType, Tool } from '../types';

interface ToolDockProps {
  tool: Tool;
  mode: NoteMode;
  settings: Settings;
  onToolChange: (tool: Tool) => void;
  onColorChange: (color: string) => void;
  onShapeChange?: (shape: ShapeType) => void;
}

const canvasTools = [
  { id: 'text', label: 'Write', icon: Type },
  { id: 'pen', label: 'Draw', icon: PenLine },
  { id: 'eraser', label: 'Erase', icon: Eraser },
  { id: 'shape', label: 'Shapes', icon: Square },
  { id: 'select', label: 'Move', icon: MousePointer2 },
  { id: 'image', label: 'Image', icon: Image },
  { id: 'handwriting', label: 'Read ink', icon: ScanText },
] as const;

const documentTools = canvasTools.slice(0, 3);

const shapesList: Array<{ id: ShapeType; label: string; icon: typeof Square }> = [
  { id: 'rectangle', label: 'Rectangle', icon: Square },
  { id: 'ellipse', label: 'Circle', icon: Circle },
  { id: 'diamond', label: 'Diamond', icon: Diamond },
  { id: 'arrow', label: 'Arrow', icon: ArrowRight },
  { id: 'line', label: 'Line', icon: Minus },
  { id: 'triangle', label: 'Triangle', icon: Triangle },
];

const inkColors = ['#f2f0ea', '#17181b', '#4c9bff', '#8f65e9', '#f19b3f', '#62b58f'];

export function ToolDock({
  tool,
  mode,
  settings,
  onToolChange,
  onColorChange,
  onShapeChange,
}: ToolDockProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shapesOpen, setShapesOpen] = useState(false);
  const tools = mode === 'document' ? documentTools : canvasTools;

  return (
    <div className="tool-dock tinted-glass" role="toolbar" aria-label="Note tools">
      <div className="tool-actions">
        {tools.map((item, index) => {
          const Icon = item.icon;
          const shortcut = settings.shortcuts[item.id as keyof typeof settings.shortcuts];

          return (
            <div className="tool-item-wrap" key={item.id}>
              {mode === 'canvas' && index === 4 ? <span className="tool-divider" /> : null}
              <button
                className={tool === item.id ? 'tool-button active' : 'tool-button'}
                onClick={() => {
                  onToolChange(item.id);
                  if (item.id === 'shape') {
                    setShapesOpen((open) => !open);
                    setPaletteOpen(false);
                  } else {
                    setShapesOpen(false);
                  }
                }}
                aria-label={`${item.label}${shortcut ? ` (${shortcut.toUpperCase()})` : ''}`}
              >
                <Icon size={19} strokeWidth={1.8} />
                <span>{item.label}</span>
              </button>
            </div>
          );
        })}
        <span className="tool-divider" />
        <button
          className={paletteOpen ? 'palette-toggle active' : 'palette-toggle'}
          onClick={() => {
            setPaletteOpen((open) => !open);
            setShapesOpen(false);
          }}
          aria-label="Ink colors"
        >
          <Palette size={17} />
          <span className="current-ink" style={{ background: settings.penColor }} />
        </button>
      </div>
      {shapesOpen && tool === 'shape' ? (
        <div className="shapes-palette tinted-glass" aria-label="Choose shape">
          {shapesList.map((shape) => {
            const ShapeIcon = shape.icon;
            const isSelected = (settings.selectedShape ?? 'rectangle') === shape.id;

            return (
              <button
                key={shape.id}
                className={isSelected ? 'shape-option active' : 'shape-option'}
                onClick={() => {
                  if (onShapeChange) {
                    onShapeChange(shape.id);
                  }
                  setShapesOpen(false);
                }}
                title={shape.label}
              >
                <ShapeIcon size={16} />
                <span>{shape.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
      {paletteOpen ? (
        <div className="ink-palette" aria-label="Ink color">
          {inkColors.map((color) => (
            <button
              key={color}
              className={settings.penColor === color ? 'ink-swatch active' : 'ink-swatch'}
              style={{ '--ink-color': color } as React.CSSProperties}
              onClick={() => {
                onColorChange(color);
                setPaletteOpen(false);
              }}
              aria-label={`Use ${color} ink`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
