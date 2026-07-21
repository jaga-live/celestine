# <img src="public/celestine-mark.svg" width="36" height="36" alt="Celestine Icon" align="center" /> Celestine

Celestine is a local-first desktop notebook for handwriting, rich text, images, and diagrams on one infinite canvas. It is built with Tauri, Rust, React, and TypeScript.

## Google sign-in

Celestine supports Google OpenID Connect in the desktop app using the installed-app authorization-code flow with PKCE. Create an OAuth client with application type **Desktop app** in Google Cloud Console, configure the consent screen, then launch Celestine with the public client ID:

```bash
The bundled Celestine build includes the configured public client ID. For development overrides, set `CELESTINE_GOOGLE_CLIENT_ID` before launching.
```

No client secret is used or bundled. Google opens in the system browser and returns to Celestine through a temporary loopback address. The refreshable session is stored separately from notes in the application-data directory with user-only file permissions. Signing out revokes the access token and removes that local session file.

> **Alpha:** The core canvas and desktop shell work. Handwriting recognition and native platform pen adapters are planned but are not implemented yet.

## What works

- Infinite pan-and-zoom canvas
- Pressure-sensitive vector ink using Pointer Events
- one-to-one pen tracking with pressure-aware stroke width
- local English handwriting recognition on macOS using Apple Vision
- Eraser, text, shape, image, and handwriting-conversion tool modes
- Rich-text cards with headings, lists, checklists, code, tables, and Markdown math notation
- Image paste and local upload
- Folders, tags, favorites, search, and recent-note ordering
- Dark and light themes
- Configurable single-key shortcuts for XP-Pen per-app mappings
- Debounced local autosave through the Rust backend
- Markdown export with Celestine metadata comments for non-Markdown canvas objects

## Quick start

Requirements:

- Node.js 22 or newer
- Rust 1.88 or newer
- The platform prerequisites from the [Tauri documentation](https://v2.tauri.app/start/prerequisites/)

```bash
npm install
npm run tauri dev
```

For browser-only UI development:

```bash
npm run dev
```

Create a production frontend build:

```bash
npm run build
```

## Default pen shortcuts

Configure the same keys in the tablet driver's per-application profile:

| Command | Key |
| --- | --- |
| Select | `V` |
| Pen | `B` |
| Eraser | `E` |
| Text | `T` |
| Shape | `S` |
| Convert handwriting | `H` |

Hold `Space` and drag to pan. Use the wheel or trackpad to zoom.

## Storage and privacy

Celestine does not require an account and does not send note content to a server. The Tauri app atomically saves the workspace to `workspace.json` in the operating system's application-data directory. Browser-only development uses `localStorage`.

Images are currently embedded in the workspace as data URLs. Moving them into a content-addressed asset directory is planned before large libraries are supported.

## Markdown compatibility

Rich text exports as ordinary Markdown. Math annotations use `$...$`, and future diagram text can use fenced `mermaid` blocks. Ink and spatial shapes do not have a standard Markdown representation, so exports include HTML metadata comments for those objects. A portable Celestine sidecar format is planned to preserve the complete canvas.

## Project structure

```text
src/                  React interface and canvas engine
src/components/       Library, editor, tools, settings, rich-text cards
src/lib/              Persistence bridge and Markdown export
src-tauri/             Tauri configuration and Rust persistence backend
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the data flow and platform strategy.

## Roadmap

- Native pen diagnostics for pressure, tilt, eraser, and hover
- On-device English handwriting recognition
- Closest-font selection and user-selected handwriting fonts
- Lasso selection and editable diagram connectors
- Undo/redo history and crash-recovery journal
- Content-addressed image assets and portable workspace export
- Windows Ink and Linux tablet validation

## Contributing

Keep changes focused and preserve local-first behaviour. Run the TypeScript build and Rust checks before opening a pull request:

```bash
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```
