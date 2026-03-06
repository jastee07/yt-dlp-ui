# YouTube‑dlp Wrapper — Scope & CLI Contract

## Overview
The `youtube-dlp-wrapper` is the deterministic, testable bridge between the Mac desktop clipper and the raw `yt-dlp` executable. Its job is to expose:

1. **Safe validation** of URLs, clip windows, output folders, and dependency presence.
2. **Metadata extraction** for a single video or playlist (useful for preview UI and decisions like default clip names).
3. **Download orchestration** for clips/audio/video segments, with deterministic naming, section handling, and consistent success/failure payloads.

The wrapper runs inside the same Node/Electron runtime as the desktop app but is factored into its own CLI module so it can be exercised by standalone tests, Ralph/TDD pipelines, and eventual reuse by other clients.

## Goals (in scope)
- Provide CLI commands for metadata and download flows that accept a strict JSON payload and emit JSON responses.
- Encode `yt-dlp` argument construction (output template, sections, format selectors) in a single place.
- Decline invalid inputs with machine-readable validation errors.
- Surface structured error taxonomy for dependency failures, `yt-dlp` process failures, and implicit timeouts so the UI can map them to user messaging.
- Support deterministic clip naming per folder using the same auto-increment strategy that the skin already relies on.

## Non-Goals (for v1)
- Hosting network requests or upload flows (keeps execution local).
- Streaming progress events over sockets—progress remains a future reliability enhancement once the command runner is stable.
- Feature parity with the legacy web server (that code lives in `server.js` and will be retired once the wrapper proves out).

## CLI Commands
Each command is invoked as `node ./youtube-dlp-wrapper/cli.js <command> --payload <json-string>` (or via stdin for multiline payloads). The wrapper normalizes inputs and writes a single JSON object to stdout.

### `metadata`
- **Purpose:** Inspect a YouTube URL and return normalized metadata (title, duration, format hints, playlist info). Used by the renderer to prefill clip data and validate URLs before the download flow begins.
- **Required fields:** `payload.url`
- **Optional fields:** `payload.forceRefresh` (true => bypass cached metadata), `payload.requestId` (for tracing/log correlation).
- **Implementation note:** Internally runs `yt-dlp -J --no-warnings --skip-download <url>` and maps relevant keys (+ `duration`, `title`, `thumbnails`, `uploader`, `webpage_url`).

### `download`
- **Purpose:** Package everything needed to run `yt-dlp` for the actual clip save.
- **Required fields:** `payload.url`, `payload.savePath`, `payload.clipNamePolicy` (auto/explicit), `payload.outputHint` (fallback basename).
- **Optional fields:** `payload.clip.start`, `payload.clip.end`, `payload.clip.name`, `payload.format`, `payload.preferredExtractors`, `payload.requestId`, `payload.timeoutMs`, `payload.env` (extra env vars such as `YTDLP_PATH`).
- **Behavior:** Build output template `path.join(savePath, <base>.%(ext)s)`, append `--download-sections` when `start`/`end` provided, respect `format` overrides, and spawn `yt-dlp` with `stdio: ['ignore', 'pipe', 'pipe']`. Resolves when the child exits.

## Input Schema (common envelope)
```json
{
  "command": "metadata|download",
  "requestId": "uuid-1234",
  "payload": { /* command-specific */ }
}
```
- `requestId`: optional for logging/tracing; echoed in responses.
- Commands are rejected if absent or unrecognized.
- Payload objects are validated before `yt-dlp` is touched.

## `metadata` Payload (example)
```json
{
  "url": "https://www.youtube.com/watch?v=abc",
  "forceRefresh": false
}
```
## `download` Payload (example)
```json
{
  "url": "https://www.youtube.com/watch?v=abc",
  "savePath": "/Users/jake/Clips",
  "clip": {
    "name": "episode-1",
    "start": "00:02:30",
    "end": "00:05:00"
  },
  "format": "bestvideo+bestaudio/best"
}
```
- `clip.name`: optional string; sanitized before used.
- `clip.start` / `clip.end`: validated as `HH:MM:SS` (the same regex/logic as the UI already uses).
- `clipNamePolicy`: `"auto"` or `"explicit"`; determines whether to auto-increment names when the sanitized `clip.name` is blank.

## Output Schema
```json
{
  "ok": true|false,
  "requestId": "uuid-1234",
  "command": "metadata|download",
  "result": { ... },
  "error": {
    "code": "VALIDATION|DEPENDENCY|PROCESS|TIMEOUT|INTERNAL",
    "message": "Human-friendly text",
    "details": { /* optional, structured */ }
  }
}
```
- On success: `ok: true`, `result` populated (metadata or file path). `error` absent.
- On failure: `ok: false`, `result` absent, `error` describes the failure.

### Success Result Examples
- `metadata`: `{ "title": "How to clip", "duration": 367, "formats": ["mp4", ...], "webpage_url": "..." }`
- `download`: `{ "savedFile": "/Users/jake/Clips/clip-1.mp4", "duration": 310, "usedArgs": [...] }`

## Error Taxonomy
| Code | Meaning | Consumer action |
| --- | --- | --- |
| `VALIDATION` | Bad URL, missing save path, invalid timestamps, or missing command | Show user message and abort before spawning `yt-dlp`.
| `DEPENDENCY` | `yt-dlp` / `ffmpeg` missing or not executable | Surface dependency banner + install instructions.
| `PROCESS` | `yt-dlp` exited non-zero (network failure, region block, extraction error). `details.exitCode` and `details.stderr` provided. | Report failure and allow retry.
| `TIMEOUT` | Wrapper forced a timeout (default 90s) before `yt-dlp` finished. | Ask user to retry or adjust rand.
| `INTERNAL` | Unexpected throw inside the wrapper. | Log (via stderr) and bubble up sanitized message.

Each `error` can include `details.source`, `details.attempt`, and `details.hint` when applicable.

## Environment & Platform Constraints
- **Platform:** Targeting macOS (Ventura+), but code stays portable for Linux/Win for CI.
- **Runtime:** Node 20+ (matches Electron 27+). Use `package.json` `engines` to pin this.
- **Dependencies:** `yt-dlp` and `ffmpeg` must be on `PATH`. The CLI honors `YTDLP_PATH` and `FFMPEG_PATH` overrides for test harnesses.
- **Binary invocation:** Example `spawn(config.ytDlpPath || 'yt-dlp', args, { env: { ...process.env, ...payload.env }})`.
- **Working directory:** CLI runs from repo root; callers can set `cwd` if they want JSON log files.

## Integration Notes for the Mac Desktop App
- The Electron main process will replace the direct `spawn('yt-dlp', ...)` call with `spawn('node', [path.resolve(__dirname, '../youtube-dlp-wrapper/cli.js'), command, '--payload', JSON.stringify(env)])`.
- Capture stdout for the JSON success/failure envelope. `stderr` is reserved for log-level messages (e.g., internal stack traces). The UI should never parse `stderr` for machine state.
- Keep `clip:run` handler CPU-friendly by awaiting the wrapper response via promise; handle any `error.code` to show user-critical dialogs (missing dependencies, invalid input).

## Logging & Observability
- CLI prints `[INFO]`/`[ERROR]` prefixed lines to stderr for debugging but never interleaves JSON with stdout.
- When running locally, wrap `spawn` with `stdio: ['ignore', 'pipe', 'pipe']` and optionally log `result.usedArgs` for diagnostics.

## Testing & TDD Requirements
- All logic inside the wrapper must be covered by `node:test` suites before implementation code is written.
- Metadata extraction should first have a failing test (mocking `yt-dlp --dump-json`) before the code path is added.
- Download orchestration tests should assert argument sequences for variations (full video, ranged, named, format override).
- CLI error handling must have tests for each error code.

## Next Steps (unblocks)
1. Flesh out the wrapper directory with `package.json`, `bin/cli.js`, and `lib/` modules per the above contract. (t-20260305-004)
2. Add TDD scaffolding for metadata (t-20260305-005) and download flows (t-20260305-006).
3. Once CLI stabilizes, swap the desktop app `clip:run` implementation to call the wrapper and ensure tests still pass.
