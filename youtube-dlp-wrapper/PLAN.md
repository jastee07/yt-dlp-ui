# youtube-dlp-wrapper Plan

## Goal
Deliver a deterministic, testable Node CLI that wraps `yt-dlp` per the CONTRACT.md requirements, with a strict JSON envelope, validation, metadata inspection, and download orchestration for the Mac clipper.

## Phase 1: Metadata (TDD basis)
1. Keep the metadata tests written above as the immediate failing specification.
2. Implement `validateMetadataPayload` (check `payload.url`, optional `forceRefresh`, ensure `requestId` is preserved) and `buildMetadataArgs` (`-J --no-warnings --skip-download <url>`).
3. Add helpers to normalize yt-dlp paths/env overrides and emit precise error envelopes once metadata command runs.
4. Once metadata path satisfies tests, extend coverage with process mocks to assert JSON envelopes and error handling.

## Phase 2: Download orchestration
1. Implement payload validation (required fields: `url`, `savePath`, `clipNamePolicy`, `outputHint`).
2. Build deterministic output template with sanitized names or auto-increment hints, include `--download-sections` when `clip.start`/`clip.end` are provided, respect explicit `format`, `preferredExtractors`, and env overrides.
3. Ensure CLI spawns `yt-dlp` with `stdio: ['ignore','pipe','pipe']` and surfaces `result.usedArgs` and `savedFile` on success, while mapping exit details to `PROCESS` errors.
4. Expand tests to cover timeout handling, dependency failures, and forking `YTDLP_PATH`/`FFMPEG_PATH` overrides.

## Phase 3: CLI & Integration
1. Wire the CLI entry (`bin/cli.js`) to parse command/payload, route to metadata/download modules, and emit the normalized JSON envelope plus logging to stderr.
2. Stub dependency checks (e.g., `which yt-dlp`) to surface `DEPENDENCY` errors in tests.
3. Run `node --test` in the Ralph/TDD pipeline to verify coverage.
4. Once CLI is stable, coordinate with the Mac desktop app to call the wrapper and confirm end-to-end flows (metadata then download).

## Next Steps for this sprint
- Implement the metadata helpers so the existing tests pass.
- Build the download argument builder + validation and add tests for format overrides + section handling.
- Expand CLI scaffolding to call the new helpers and provide proper error envelopes per the CONTRACT.md taxonomy.
