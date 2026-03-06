# YouTube Clipper (MVP) — macOS Desktop App PRD

## Goal
Build a minimal Mac desktop app that lets a user paste a YouTube URL and save either full video or a clipped segment using `yt-dlp`.

## Product Shape
- Native-feeling desktop shell (Electron)
- Single-window form UI
- Local-only execution (no cloud)

## Core User Flow
1. Open app
2. Paste YouTube watch URL
3. Choose/enter save folder path
4. Optionally set clip name
5. Optionally set start/end (`HH:MM:SS`)
6. Click **Save Clip**
7. App runs `yt-dlp` and shows success/error

## Required Behavior
1. Save path persists after first successful run and becomes default.
2. Clip naming:
   - If name provided: use sanitized version.
   - If blank: auto `clip-1`, `clip-2`, ... (per save path).
3. Time behavior:
   - Blank start => beginning
   - Blank end => video end
   - If provided, must be `HH:MM:SS`
   - If both provided, end must be after start
4. Execution:
   - No range => normal `yt-dlp` output template
   - Range set => add `--download-sections "*start-end"`

## Architecture (MVP)
- `src/main.js`: Electron main process, IPC handlers, process spawn for `yt-dlp`
- `src/preload.js`: safe API bridge to renderer
- `src/renderer/*`: form UI
- `src/core/clipper.js`: pure logic for validation, naming, argument building
- Persisted state in app user-data config JSON

## TDD Acceptance Criteria (mandatory)
Before implementation for core logic:
- Failing tests define expected behavior for:
  - time validation
  - filename auto-increment
  - command arg construction
- Implement until tests pass
- Run full suite and keep green

## Non-Goals (v1)
- Browser extension
- Progress streaming UI
- Batch queueing
- Codec/format controls
- Cloud sync

## Dependencies
- `yt-dlp` available in PATH
- `ffmpeg` installed for robust clipping

## Success Criteria
- User can run app and save clips reliably with defaults behaving exactly as above.
