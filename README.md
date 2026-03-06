# yt-dlp-ui

Minimal macOS desktop app for clipping/downloading YouTube videos with `yt-dlp`.

## Features
- Paste YouTube watch URL
- Choose save folder (native picker)
- Optional clip name
- Optional start/end (`HH:MM:SS`)
- Defaults save path after first run
- Auto names clips `clip-1`, `clip-2`, ... when name is blank
- Startup dependency check for `yt-dlp` and `ffmpeg`

## Requirements
- macOS
- Node.js 20+
- Homebrew (recommended)
- `yt-dlp`
- `ffmpeg`

## Installation

### 1) Clone
```bash
git clone https://github.com/jastee07/yt-dlp-ui.git
cd yt-dlp-ui
```

### 2) Install system dependencies
```bash
brew install yt-dlp ffmpeg
```

### 3) Install app dependencies
```bash
npm install
```

## Run
```bash
npm start
```

## Test
```bash
npm test
```

## Usage
1. Launch app with `npm start`
2. Paste YouTube URL (`https://www.youtube.com/watch?v=...`)
3. Choose save folder
4. Optional: set clip name
5. Optional: set `start`/`end` in `HH:MM:SS`
6. Click **Save Clip**

## Notes
- If `start` and `end` are blank, full video is downloaded.
- If only one bound is set, clip runs from/to the video edge.
- If clip name is blank, app auto-increments clip name per folder.

## Troubleshooting
- **Missing dependencies banner**: install with `brew install yt-dlp ffmpeg`
- **`yt-dlp` fails**: run in terminal to verify install:
  ```bash
  yt-dlp --version
  ffmpeg -version
  ```
- **Permission errors writing files**: choose a folder your user can write to.
