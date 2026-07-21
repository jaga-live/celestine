# Celestine architecture

## Goals

- Keep handwriting latency low and preserve raw pen data.
- Store all user content locally by default.
- Use one cross-platform document model while allowing narrow native adapters.
- Keep rich text, ink, diagrams, and images editable on the same infinite surface.

## Runtime design

```text
React interface
  ├─ Library and settings
  ├─ Tiptap rich-text cards
  └─ Infinite canvas scene
       ├─ Vector ink
       ├─ Shapes
       └─ Images
            │
            ▼
       Tauri command bridge
            │
            ▼
       Rust desktop core
       ├─ Atomic workspace persistence
       ├─ Future search/index storage
       └─ Future native input and recognition providers
```

The canvas uses a world-space coordinate system. Camera translation and zoom affect rendering without modifying stored object coordinates.

## Document model

A workspace owns folders, tags, settings, and notes. Each note owns a camera and an ordered collection of canvas objects:

- `stroke`: timestamped position, pressure, and tilt samples
- `text`: positioned Tiptap HTML content
- `shape`: positioned vector geometry
- `image`: positioned raster source and dimensions

The current alpha stores the complete workspace as JSON. The Rust backend writes a temporary file and renames it over the previous workspace, preventing partial writes. SQLite metadata and content-addressed assets are planned when library scale requires them.

## Pen input

The first provider is W3C Pointer Events from the platform webview. It captures normalized pressure and tilt without vendor-specific tablet integration.

If hardware testing shows missing or low-quality data, native providers can be added behind the same normalized point model:

- macOS: AppKit tablet events
- Windows: Windows Ink / WinUI pointer input
- Linux: compositor pointer events, with libinput evaluation where appropriate

Tablet-pad buttons remain outside the app. Users map Celestine keyboard shortcuts in their tablet driver's per-app profile.

## Pen input

Hover and contact use the same absolute tablet coordinates. Active strokes retain coalesced pointer samples and pressure data without movement gain or stabilization, so lifting and touching the pen never changes the coordinate model.

## Handwriting recognition

The frontend rasterizes only the selected ink strokes onto a high-contrast temporary canvas. On macOS, the Rust command passes that image to a bundled Swift helper using Apple Vision in accurate, English-only mode. No image leaves the device. Provider-specific implementations for Windows Ink and Linux can implement the same command contract later.

This interaction must be tuned with real tablets because absolute devices can visibly re-anchor after a stroke.

## Handwriting recognition

Recognition will use a provider interface and run only after a completed stroke group or explicit user request:

- macOS on-device recognizer where supported
- Windows installed ink recognizer where supported
- Bundled local English model as a compatibility fallback

Results become editable text cards rendered with an automatically selected or user-selected handwriting font. Original strokes remain recoverable.

## Markdown

Markdown is an interchange format, not the canonical canvas format. Rich text maps naturally to Markdown; math uses `$...$` and textual diagrams can use fenced `mermaid` blocks. Spatial geometry and pressure ink require Celestine metadata or a sidecar file.
