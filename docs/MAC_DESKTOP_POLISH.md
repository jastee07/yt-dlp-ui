# Mac Desktop Polish — Issue #5

## What was addressed

### 1) Startup + app flow polish
- Added explicit startup status messaging in the renderer (`Starting app… checking dependencies and loading settings.`).
- Improved ready/dependency states so first-run behavior is clear.
- Metadata fetch continues to work even before selecting a folder (already fixed in prior issue work and retained).

### 2) Error presentation and guidance
- Added lightweight error hinting in UI for common operator errors:
  - missing save path
  - missing dependencies (yt-dlp / ffmpeg)
- Maintains detailed lifecycle/error text for troubleshooting while giving user-facing guidance.

### 3) Persisted desktop settings
- Added persisted settings updates via new IPC handler: `settings:update`.
- Persisted values:
  - `defaultSavePath`
  - `defaultFormat`
- Settings are loaded on startup and restored into form fields.
- Settings persist when:
  - selecting folder via chooser
  - leaving save path field
  - leaving format field
  - successful clip run

### 4) Logs accessibility for support/debugging
- Added log file output under app user data logs directory:
  - `.../logs/app.log`
- Added IPC for logs:
  - `logs:get-info`
  - `logs:open-folder`
- Added renderer UI control:
  - **Open Logs Folder** button
  - visible log file path
- Added structured log events for startup, settings updates, validation/dependency failures, wrapper failures, and completed clips.

## Packaging sanity-check
- Ran `npm run pack` successfully after installing dependencies.
- Output generated at:
  - `release/linux-unpacked`

## Notes for Mac distribution path
- Existing build config already defines mac targets (`dmg`, `zip`) in `package.json`.
- To complete full Mac artifact generation in a macOS environment:
  - `npm run dist:mac`
