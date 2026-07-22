import { useEffect, useRef, useState } from 'react';
import {
  Download,
  Keyboard,
  Mic,
  Moon,
  Palette,
  PenLine,
  Settings2,
  Sun,
  Upload,
  UserRound,
  X,
} from 'lucide-react';
import type { Settings, Theme } from '../types';
import type { GoogleAuthState } from '../lib/googleAuth';

interface SettingsPanelProps {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onClose: () => void;
  googleAuth: GoogleAuthState;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
  onExportData: () => void;
  onImportData: (file: File) => void;
}

type SettingsCategory = 'profile' | 'appearance' | 'writing' | 'keybinds' | 'data';

const themes: { id: Theme; label: string; icon: typeof Moon }[] = [
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'light', label: 'Light', icon: Sun },
];

const categories: { id: SettingsCategory; label: string; icon: typeof UserRound }[] = [
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'writing', label: 'Writing & canvas', icon: PenLine },
  { id: 'keybinds', label: 'Keybinds', icon: Keyboard },
  { id: 'data', label: 'Data & about', icon: Settings2 },
];

export function SettingsPanel({
  settings,
  onChange,
  onClose,
  googleAuth,
  onGoogleSignIn,
  onGoogleSignOut,
  onExportData,
  onImportData,
}: SettingsPanelProps) {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('profile');
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const inputs = devices.filter((device) => device.kind === 'audioinput');
          setAudioDevices(inputs);
        })
        .catch(() => {});
    }
  }, []);
  const update = <Key extends keyof Settings>(key: Key, value: Settings[Key]) =>
    onChange({ ...settings, [key]: value });

  return (
    <div className="settings-backdrop" onPointerDown={onClose}>
      <section
        className="settings-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <aside className="settings-navigation">
          <div className="settings-brand">
            <span>Celestine</span>
            <strong>Settings</strong>
          </div>
          <nav aria-label="Settings categories">
            {categories.map((category) => {
              const Icon = category.icon;

              return (
                <button
                  key={category.id}
                  className={activeCategory === category.id ? 'active' : ''}
                  onClick={() => setActiveCategory(category.id)}
                >
                  <Icon size={18} />
                  {category.label}
                </button>
              );
            })}
          </nav>
          <p>Preferences save automatically.</p>
        </aside>

        <main className="settings-content">
          <header>
            <div>
              <span className="section-label">Workspace preferences</span>
              <h2 id="settings-title">
                {categories.find((category) => category.id === activeCategory)?.label}
              </h2>
            </div>
            <button className="icon-button" onClick={onClose} aria-label="Close settings">
              <X size={20} />
            </button>
          </header>

          <div className="settings-scroll-area">
            {activeCategory === 'profile' ? (
              <>
                <section className="settings-section">
                  <h3>Your profile</h3>
                  <p>Personalize the greeting shown when you open Celestine.</p>
                  <label className="select-setting">
                    <span>Profile name</span>
                    <input
                      value={settings.profileName ?? ''}
                      placeholder="Your name"
                      onChange={(event) => update('profileName', event.target.value)}
                    />
                  </label>
                </section>
                <section className="settings-section">
                  <h3>Google account</h3>
                  {googleAuth.status === 'signed-in' ? (
                    <div className="google-account-card">
                      {googleAuth.profile.picture ? (
                        <img src={googleAuth.profile.picture} alt="" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="google-avatar-fallback">
                          {googleAuth.profile.name.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <div>
                        <strong>{googleAuth.profile.name}</strong>
                        <small>{googleAuth.profile.email}</small>
                        <em>Signed in with Google</em>
                      </div>
                      <button onClick={onGoogleSignOut}>Sign out</button>
                    </div>
                  ) : (
                    <div className="google-signin-card">
                      <span className="google-g" aria-hidden="true">
                        G
                      </span>
                      <div>
                        <strong>Google account</strong>
                        <p>
                          Use your Google identity for your Celestine profile. Your notes remain
                          local.
                        </p>
                        {googleAuth.status === 'error' || googleAuth.status === 'unavailable' ? (
                          <small role="alert">{googleAuth.message}</small>
                        ) : null}
                      </div>
                      <button onClick={onGoogleSignIn} disabled={googleAuth.status === 'loading'}>
                        {googleAuth.status === 'loading' ? 'Connecting…' : 'Sign in with Google'}
                      </button>
                    </div>
                  )}
                </section>
                <section className="settings-section">
                  <h3>Home space</h3>
                  <label className="settings-toggle">
                    <span>
                      <strong>Show home utility panel</strong>
                      <small>Keep quick tools visible on Home.</small>
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.utilityPanelVisible ?? true}
                      onChange={(event) => update('utilityPanelVisible', event.target.checked)}
                    />
                  </label>
                </section>
              </>
            ) : null}

            {activeCategory === 'appearance' ? (
              <>
                <section className="settings-section">
                  <h3>Interface</h3>
                  <p>Set the reading environment that feels best for your notes.</p>
                  <div className="theme-picker">
                    {themes.map((theme) => {
                      const Icon = theme.icon;
                      return (
                        <button
                          className={settings.theme === theme.id ? 'active' : ''}
                          key={theme.id}
                          onClick={() => update('theme', theme.id)}
                        >
                          <Icon size={18} />
                          {theme.label}
                        </button>
                      );
                    })}
                  </div>
                </section>
              </>
            ) : null}

            {activeCategory === 'writing' ? (
              <>
                <section className="settings-section">
                  <h3>Canvas defaults</h3>
                  <label className="select-setting">
                    <span>Default canvas</span>
                    <select
                      value={settings.defaultCanvasPattern ?? 'plain'}
                      onChange={(event) =>
                        update(
                          'defaultCanvasPattern',
                          event.target.value as Settings['defaultCanvasPattern'],
                        )
                      }
                    >
                      <option value="plain">Black / plain</option>
                      <option value="dots">Dotted</option>
                      <option value="grid">Graph</option>
                      <option value="ruled">Ruled</option>
                    </select>
                  </label>
                  <label className="select-setting">
                    <span>Default canvas color</span>
                    <select
                      value={settings.defaultCanvasColor ?? '#000000'}
                      onChange={(event) => update('defaultCanvasColor', event.target.value)}
                    >
                      <option value="#000000">Black</option>
                      <option value="#ffffff">White</option>
                    </select>
                  </label>
                  <label className="settings-toggle">
                    <span>
                      <strong>Pressure-sensitive pen width</strong>
                      <small>Respond to pressure when drawing.</small>
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.pressureWidth}
                      onChange={(event) => update('pressureWidth', event.target.checked)}
                    />
                  </label>
                </section>
                <section className="settings-section">
                  <h3>Handwriting conversion</h3>
                  <p>
                    English recognition runs on this device. Converted text always uses the scribble
                    style you choose.
                  </p>
                  <div className="segmented-control">
                    <button
                      className={settings.conversionMode === 'manual' ? 'active' : ''}
                      onClick={() => update('conversionMode', 'manual')}
                    >
                      Manual
                    </button>
                    <button
                      className={settings.conversionMode === 'after-delay' ? 'active' : ''}
                      onClick={() => update('conversionMode', 'after-delay')}
                    >
                      After a pause
                    </button>
                  </div>
                  {settings.conversionMode === 'after-delay' ? (
                    <label className="range-setting">
                      <span>
                        Wait time <strong>{(settings.conversionDelayMs / 1000).toFixed(1)}s</strong>
                      </span>
                      <input
                        type="range"
                        min="1000"
                        max="8000"
                        step="500"
                        value={settings.conversionDelayMs}
                        onChange={(event) =>
                          update('conversionDelayMs', Number(event.target.value))
                        }
                      />
                    </label>
                  ) : null}
                  <label className="select-setting">
                    <span>Converted font</span>
                    <select
                      className={`handwriting-font-select font-${settings.handwritingFont}`}
                      value={settings.handwritingFont}
                      onChange={(event) =>
                        update('handwritingFont', event.target.value as Settings['handwritingFont'])
                      }
                      style={{
                        fontFamily:
                          settings.handwritingFont === 'chalkboard'
                            ? "'Chalkboard SE', 'Chalkboard', cursive"
                            : settings.handwritingFont === 'noteworthy'
                              ? "'Noteworthy', cursive"
                              : "'Bradley Hand', cursive",
                        fontSize: '18px',
                      }}
                    >
                      <option
                        value="chalkboard"
                        style={{
                          fontFamily: "'Chalkboard SE', 'Chalkboard', cursive",
                          fontSize: '18px',
                        }}
                      >
                        Chalkboard
                      </option>
                      <option
                        value="noteworthy"
                        style={{ fontFamily: "'Noteworthy', cursive", fontSize: '18px' }}
                      >
                        Noteworthy
                      </option>
                      <option
                        value="bradley-hand"
                        style={{ fontFamily: "'Bradley Hand', cursive", fontSize: '18px' }}
                      >
                        Bradley Hand
                      </option>
                    </select>
                  </label>
                </section>
                <section className="settings-section">
                  <h3>Audio</h3>
                  <label className="select-setting">
                    <span>
                      <Mic size={16} /> Microphone
                    </span>
                    <select
                      value={settings.microphoneId ?? ''}
                      onChange={(event) => update('microphoneId', event.target.value)}
                    >
                      <option value="">System default microphone</option>
                      {audioDevices.map((device, index) => (
                        <option key={device.deviceId || index} value={device.deviceId}>
                          {device.label || `Microphone ${index + 1}`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="settings-toggle">
                    <span>
                      <strong>Live transcription</strong>
                      <small>Write a transcript while recording.</small>
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.transcriptionEnabled ?? true}
                      onChange={(event) => update('transcriptionEnabled', event.target.checked)}
                    />
                  </label>
                </section>
              </>
            ) : null}

            {activeCategory === 'keybinds' ? (
              <>
                <section className="settings-section">
                  <h3>Creation & Global Keybinds</h3>
                  <p>
                    Use <code>Cmd / Ctrl + Shift + Key</code> to create notes and open workspaces
                    instantly.
                  </p>
                  <div className="shortcut-grid">
                    {Object.entries({
                      quickNote: 'Quick note',
                      newNote: 'New note',
                      canvas: 'New canvas',
                      meeting: 'Meeting note',
                    }).map(([key, label]) => {
                      const currentGlobals = settings.globalShortcuts ?? {
                        quickNote: 'q',
                        newNote: 'n',
                        canvas: 'd',
                        meeting: 'm',
                      };
                      const val = (currentGlobals[key] ?? key[0]).toUpperCase();

                      return (
                        <label key={key}>
                          <span>{label}</span>
                          <input
                            value={val}
                            maxLength={1}
                            onChange={(event) =>
                              update('globalShortcuts', {
                                ...currentGlobals,
                                [key]: event.target.value.toLowerCase(),
                              })
                            }
                          />
                        </label>
                      );
                    })}
                  </div>
                </section>
                <section className="settings-section">
                  <h3>Tools & Drawing Keybinds</h3>
                  <p>Single key shortcuts for switching tools when editing notes or canvas.</p>
                  <div className="shortcut-grid">
                    {Object.entries({
                      pen: 'Pen tool',
                      eraser: 'Eraser tool',
                      select: 'Select tool',
                      text: 'Text tool',
                      handwriting: 'Handwriting tool',
                    }).map(([command, label]) => (
                      <label key={command}>
                        <span>{label}</span>
                        <input
                          value={(
                            settings.shortcuts[command as keyof typeof settings.shortcuts] ?? ''
                          ).toUpperCase()}
                          maxLength={1}
                          onChange={(event) =>
                            update('shortcuts', {
                              ...settings.shortcuts,
                              [command]: event.target.value.toLowerCase(),
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <button
                    className="test-shortcut"
                    onClick={() =>
                      window.dispatchEvent(
                        new KeyboardEvent('keydown', { key: settings.shortcuts.pen }),
                      )
                    }
                  >
                    Test pen shortcut
                  </button>
                </section>
                <section className="settings-section">
                  <h3>System Keybinds</h3>
                  <label className="select-setting" style={{ marginBottom: '16px' }}>
                    <span>Confirm before quit (Cmd+Q)</span>
                    <select
                      value={settings.confirmQuit ?? 'ask'}
                      onChange={(event) =>
                        update('confirmQuit', event.target.value as 'ask' | 'never')
                      }
                    >
                      <option value="ask">Ask for confirmation</option>
                      <option value="never">Quit immediately</option>
                    </select>
                  </label>
                  <div className="shortcut-grid">
                    <label>
                      <span>Command palette</span>
                      <input value="K" disabled readOnly />
                    </label>
                    <label>
                      <span>Settings panel</span>
                      <input value="," disabled readOnly />
                    </label>
                  </div>
                </section>
              </>
            ) : null}

            {activeCategory === 'data' ? (
              <>
                <section className="settings-section">
                  <h3>Backup</h3>
                  <p>
                    Your backup includes notes, drawings, settings, focus items, templates, and
                    local recordings.
                  </p>
                  <div className="settings-data-actions">
                    <button onClick={onExportData}>
                      <Download size={17} />
                      Export backup
                    </button>
                    <button onClick={() => importRef.current?.click()}>
                      <Upload size={17} />
                      Import backup
                    </button>
                    <input
                      ref={importRef}
                      hidden
                      type="file"
                      accept="application/json,.json"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) onImportData(file);
                        event.target.value = '';
                      }}
                    />
                  </div>
                </section>
                <section className="settings-section about-section">
                  <h3>About Celestine</h3>
                  <p>
                    <strong>Celestine 0.1.0</strong>
                  </p>
                  <p>
                    A local-first workspace for written notes, canvas thinking, recordings, and
                    handwritten ideas.
                  </p>
                </section>
              </>
            ) : null}
          </div>
        </main>
      </section>
    </div>
  );
}
