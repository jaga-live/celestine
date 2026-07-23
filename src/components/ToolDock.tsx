import { useState } from 'react';
import {
  ArrowRight,
  Circle,
  Diamond,
  Eraser,
  Highlighter,
  Image,
  Minus,
  MousePointer2,
  Palette,
  PenLine,
  ScanText,
  Square,
  Settings as SettingsIcon,
  Sliders,
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
  onSizeChange?: (size: number) => void;
  onOpenSettings?: () => void;
}

const canvasTools = [
  { id: 'select', label: 'Move', icon: MousePointer2 },
  { id: 'text', label: 'Write', icon: Type },
  { id: 'pen', label: 'Draw', icon: PenLine },
  { id: 'highlighter', label: 'Highlight', icon: Highlighter },
  { id: 'eraser', label: 'Erase', icon: Eraser },
  { id: 'shape', label: 'Shapes', icon: Square },
  { id: 'image', label: 'Image', icon: Image },
  { id: 'handwriting', label: 'Read ink', icon: ScanText },
] as const;

const documentTools = [
  { id: 'text', label: 'Write', icon: Type },
  { id: 'pen', label: 'Draw', icon: PenLine },
  { id: 'highlighter', label: 'Highlight', icon: Highlighter },
  { id: 'eraser', label: 'Erase', icon: Eraser },
] as const;

const shapesList: Array<{ id: ShapeType; label: string; icon: typeof Square }> = [
  { id: 'rectangle', label: 'Rectangle', icon: Square },
  { id: 'ellipse', label: 'Circle', icon: Circle },
  { id: 'diamond', label: 'Diamond', icon: Diamond },
  { id: 'arrow', label: 'Arrow', icon: ArrowRight },
  { id: 'line', label: 'Line', icon: Minus },
  { id: 'triangle', label: 'Triangle', icon: Triangle },
];

const inkColors = ['#f2f0ea', '#17181b', '#4c9bff', '#8f65e9', '#f19b3f', '#62b58f'];

const penSizePresets = [
  { label: 'Thin', size: 2 },
  { label: 'Regular', size: 3.2 },
  { label: 'Bold', size: 6 },
  { label: 'Thick', size: 10 },
];
const highlighterSizePresets = [
  { label: 'Thin', size: 12 },
  { label: 'Regular', size: 18 },
  { label: 'Bold', size: 26 },
  { label: 'Thick', size: 36 },
];
const eraserSizePresets = [
  { label: 'Small', size: 14 },
  { label: 'Medium', size: 24 },
  { label: 'Large', size: 40 },
  { label: 'X-Large', size: 60 },
];

export function ToolDock({
  tool,
  mode,
  settings,
  onToolChange,
  onColorChange,
  onShapeChange,
  onSizeChange,
  onOpenSettings,
}: ToolDockProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shapesOpen, setShapesOpen] = useState(false);
  const [sizeOpen, setSizeOpen] = useState(false);
  const tools = mode === 'document' ? documentTools : canvasTools;

  const currentColor =
    tool === 'highlighter'
      ? settings.highlighterColor
      : tool === 'shape'
        ? settings.shapeColor
        : tool === 'text'
          ? settings.textColor
          : settings.penColor;

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
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => {
                  onToolChange(item.id);
                  if (item.id === 'shape') {
                    setShapesOpen((open) => !open);
                    setPaletteOpen(false);
                    setSizeOpen(false);
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
        {tool === 'pen' || tool === 'highlighter' || tool === 'eraser' ? (
          <button
            className={sizeOpen ? 'size-toggle active' : 'size-toggle'}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              setSizeOpen((open) => !open);
              setPaletteOpen(false);
              setShapesOpen(false);
            }}
            aria-label="Stroke thickness"
            title="Stroke Thickness"
          >
            <Sliders size={17} />
          </button>
        ) : null}
        <button
          className={paletteOpen ? 'palette-toggle active' : 'palette-toggle'}
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => {
            setPaletteOpen((open) => !open);
            setShapesOpen(false);
            setSizeOpen(false);
          }}
          aria-label="Ink colors"
        >
          <Palette size={17} />
          <span className="current-ink" style={{ background: currentColor }} />
        </button>
        {onOpenSettings ? (
          <button
            className="tool-button settings-btn"
            onPointerDown={(e) => e.preventDefault()}
            onClick={onOpenSettings}
            aria-label="Editor settings"
            title="Editor & Drawing Settings"
          >
            <SettingsIcon size={17} />
          </button>
        ) : null}
      </div>
      {sizeOpen && (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') ? (
        <div className="stroke-size-palette tinted-glass" aria-label="Stroke thickness">
          {(tool === 'highlighter'
            ? highlighterSizePresets
            : tool === 'eraser'
              ? eraserSizePresets
              : penSizePresets
          ).map((preset) => {
            const currentSize =
              tool === 'highlighter'
                ? settings.highlighterSize || 18
                : tool === 'eraser'
                  ? settings.eraserSize || 24
                  : settings.penSize || 3.2;
            const isSelected = Math.abs(currentSize - preset.size) < 0.8;

            return (
              <button
                key={preset.label}
                className={isSelected ? 'size-option active' : 'size-option'}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (onSizeChange) {
                    onSizeChange(preset.size);
                  }
                  setSizeOpen(false);
                }}
              >
                <span
                  className="size-dot-indicator"
                  style={{
                    width: Math.max(5, Math.min(20, preset.size / 1.6)),
                    height: Math.max(5, Math.min(20, preset.size / 1.6)),
                  }}
                />
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
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
              className={currentColor === color ? 'ink-swatch active' : 'ink-swatch'}
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
