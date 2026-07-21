import { FileText, GitBranch, LayoutTemplate, Mic2, Search, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { NoteMode, Workspace } from '../types';
import type { CelestineTemplate } from './HomeDesk';

interface TemplateViewProps {
  onCreate: (mode: NoteMode, template: CelestineTemplate) => void;
  customTemplates: NonNullable<Workspace['customTemplates']>;
  onCreateCustom: (id: string) => void;
  onDuplicateCustom: (id: string) => void;
  onDeleteCustom: (id: string) => void;
}

const templates: Array<{
  id: CelestineTemplate;
  title: string;
  description: string;
  mode: NoteMode;
  icon: typeof FileText;
}> = [
  {
    id: 'blank',
    title: 'Blank note',
    description: 'A clean page for any idea, thought or task.',
    mode: 'document',
    icon: FileText,
  },
  {
    id: 'study',
    title: 'Study notes',
    description: 'Organize concepts, questions and key takeaways.',
    mode: 'document',
    icon: FileText,
  },
  {
    id: 'system',
    title: 'System design',
    description: 'Plan architecture, flows and components visually.',
    mode: 'canvas',
    icon: GitBranch,
  },
  {
    id: 'meeting',
    title: 'Meeting notes',
    description: 'Capture discussion, decisions and action items.',
    mode: 'document',
    icon: Mic2,
  },
  {
    id: 'revision',
    title: 'Revision sheet',
    description: 'Active recall, key points and confidence tracking.',
    mode: 'document',
    icon: LayoutTemplate,
  },
  {
    id: 'mindmap',
    title: 'Mind map',
    description: 'Visualize relationships and explore ideas.',
    mode: 'canvas',
    icon: GitBranch,
  },
  {
    id: 'thought',
    title: 'Quick thought',
    description: 'Capture fleeting ideas before they fade away.',
    mode: 'document',
    icon: Sparkles,
  },
  {
    id: 'audio',
    title: 'Audio note',
    description: 'Record, transcribe and revisit your thoughts.',
    mode: 'document',
    icon: Mic2,
  },
];

function renderTemplateVisual(id: CelestineTemplate | 'custom') {
  switch (id) {
    case 'blank':
      return (
        <div className="template-visual visual-blank">
          <span className="visual-plus">+</span>
        </div>
      );
    case 'study':
      return (
        <div className="template-visual visual-study">
          <div className="study-line study-head" />
          <div className="study-line study-highlight" />
          <div className="study-bullet-row">
            <span className="bullet" />
            <div className="study-line" />
          </div>
          <div className="study-bullet-row">
            <span className="bullet" />
            <div className="study-line" />
          </div>
          <div className="study-bullet-row">
            <span className="bullet" />
            <div className="study-line short" />
          </div>
        </div>
      );
    case 'system':
      return (
        <div className="template-visual visual-system">
          <div className="sys-node sys-top">API</div>
          <div className="sys-connectors">
            <span />
            <span />
          </div>
          <div className="sys-row">
            <div className="sys-node sys-mid">Auth</div>
            <div className="sys-node sys-mid">Core</div>
          </div>
        </div>
      );
    case 'meeting':
      return (
        <div className="template-visual visual-meeting">
          <div className="meeting-item">
            <span className="check checked" />
            <div className="meet-line" />
          </div>
          <div className="meeting-item">
            <span className="check checked" />
            <div className="meet-line short" />
          </div>
          <div className="meeting-item">
            <span className="check" />
            <div className="meet-line" />
          </div>
        </div>
      );
    case 'revision':
      return (
        <div className="template-visual visual-revision">
          <div className="rev-row">
            <div className="rev-line" />
            <span className="stars">★★★★☆</span>
          </div>
          <div className="rev-row">
            <div className="rev-line short" />
            <span className="stars">★★★☆☆</span>
          </div>
          <div className="rev-row">
            <div className="rev-line" />
            <span className="stars">★★★★★</span>
          </div>
        </div>
      );
    case 'mindmap':
      return (
        <div className="template-visual visual-mindmap">
          <div className="mm-branch mm-left" />
          <div className="mm-center">Idea</div>
          <div className="mm-branch mm-right" />
        </div>
      );
    case 'thought':
      return (
        <div className="template-visual visual-thought">
          <div className="thought-bar bar-1" />
          <div className="thought-bar bar-2" />
          <div className="thought-bar bar-3" />
        </div>
      );
    case 'audio':
      return (
        <div className="template-visual visual-audio">
          <div className="waveform">
            <i style={{ height: '32%' }} />
            <i style={{ height: '65%' }} />
            <i style={{ height: '100%' }} />
            <i style={{ height: '50%' }} />
            <i style={{ height: '85%' }} />
            <i style={{ height: '40%' }} />
            <i style={{ height: '75%' }} />
            <i style={{ height: '30%' }} />
          </div>
        </div>
      );
    default:
      return (
        <div className="template-visual visual-custom">
          <div className="study-line study-head" />
          <div className="study-line" />
          <div className="study-line short" />
        </div>
      );
  }
}

export function TemplatesView({
  onCreate,
  customTemplates,
  onCreateCustom,
  onDuplicateCustom,
  onDeleteCustom,
}: TemplateViewProps) {
  const [search, setSearch] = useState('');
  const filteredTemplates = useMemo(
    () =>
      templates.filter((template) =>
        `${template.title} ${template.description}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [search],
  );

  return (
    <section className="library-view templates-page">
      <header className="templates-header">
        <div>
          <span>Templates</span>
          <h1>
            Start with <em>structure.</em>
          </h1>
          <p>Every template creates a real, editable note in your workspace.</p>
        </div>
        <div className="templates-tools">
          <label>
            <Search size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search templates…"
            />
            <kbd>⌘ K</kbd>
          </label>
        </div>
      </header>
      <div className="template-gallery">
        {filteredTemplates.map((template) => {
          const Icon = template.icon;
          return (
            <article
              key={template.id}
              className={`template-tile template-${template.id}`}
              role="button"
              tabIndex={0}
              onClick={() => onCreate(template.mode, template.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ')
                  onCreate(template.mode, template.id);
              }}
            >
              <div className="template-title-row">
                <span className="template-icon">
                  <Icon size={23} strokeWidth={1.7} />
                </span>
                <h2>{template.title}</h2>
              </div>
              <p>{template.description}</p>
              {renderTemplateVisual(template.id)}
            </article>
          );
        })}
        {customTemplates.map((template) => (
          <article
            key={template.id}
            className="template-tile"
            role="button"
            tabIndex={0}
            onClick={() => onCreateCustom(template.id)}
          >
            <div className="template-title-row">
              <span className="template-icon">
                <LayoutTemplate size={23} />
              </span>
              <h2>{template.name}</h2>
            </div>
            <p>Custom {template.mode} template.</p>
            {renderTemplateVisual('custom')}
          </article>
        ))}
      </div>
      {!filteredTemplates.length ? (
        <div className="template-empty">
          <Search size={25} />
          <h2>No templates found</h2>
          <p>Try a different search.</p>
        </div>
      ) : null}
    </section>
  );
}
