# yt-dlp-ui

Minimal desktop app for clipping/downloading YouTube videos with `yt-dlp`.

## Features
- Paste YouTube watch URL
- Choose save folder (native picker)
- Optional clip name
- Optional start/end (`HH:MM:SS`)
- Saves default folder after first run
- Auto names clips `clip-1`, `clip-2`, ... when name is blank
- Startup dependency check for `yt-dlp` and `ffmpeg`

## Requirements (dev)
- Node.js 20+
- `yt-dlp`
- `ffmpeg`

macOS install for deps:
```bash
brew install yt-dlp ffmpeg
```

Windows (example with winget):
```powershell
winget install yt-dlp.yt-dlp
winget install Gyan.FFmpeg
```

## Local Dev
```bash
git clone https://github.com/jastee07/yt-dlp-ui.git
cd yt-dlp-ui
npm install
npm test
npm start
```

## Build unsigned release artifacts

### macOS
```bash
npm run dist:mac
```
Outputs to `release/` (DMG + ZIP).

### Windows
```bash
npm run dist:win
```
Outputs to `release/` (NSIS installer + portable EXE).

## Publish for non-technical users (no certs)
1. Build artifacts with `npm run dist:mac` and/or `npm run dist:win`
2. Create a GitHub Release
3. Upload files from `release/`
4. In release notes, include first-launch warning bypass steps below

## Unsigned app first-launch instructions

### macOS (Gatekeeper)
If macOS says the app cannot be verified:
1. Open **Finder → Applications**
2. Right-click the app → **Open**
3. Click **Open** again in the dialog

(If needed: **System Settings → Privacy & Security** and allow the app.)

### Windows (SmartScreen)
If Windows warns about unknown publisher:
1. Click **More info**
2. Click **Run anyway**

## User usage
1. Open app
2. Paste YouTube URL (`https://www.youtube.com/watch?v=...`)
3. Choose save folder
4. Optional: set clip name
5. Optional: set `start`/`end` in `HH:MM:SS`
6. Click **Save Clip**

## Notes
- Blank `start` and `end` => full video download
- One-sided bound is supported (start-only or end-only)
- Blank name => auto-incremented clip name per folder

## Troubleshooting
- Missing dependencies banner: install `yt-dlp` and `ffmpeg`
- Verify installs:
  ```bash
  yt-dlp --version
  ffmpeg -version
  ```
- Permission errors writing files: choose a writable folder
