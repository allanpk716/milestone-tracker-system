---
estimated_steps: 19
estimated_files: 4
skills_used: []
---

# T01: Create structured logger module with unit tests

Create `src/lib/server/logger.ts` with a `createLogger(module)` factory function. Zero external dependencies.

**Logger design:**
- Levels: debug(0), info(1), warn(2), error(3) — numeric comparison for threshold filtering
- Format: `[ISO_TIMESTAMP] [LEVEL] [module] message {meta JSON}`
- Dual output: stdout (via console methods for level-appropriate streams) + append to `logs/app-YYYY-MM-DD.log`
- LOG_LEVEL env var controls minimum level (default: 'info')
- File rotation: on each write, check if date changed; on startup, delete files older than 7 days in `logs/`
- Auto-create `logs/` directory if missing
- Graceful degradation: if file write fails, log warning to stdout and continue stdout-only
- Must NOT log secrets (API keys, passwords, Bearer tokens)

Create `src/lib/server/logger.test.ts` covering:
1. Format correctness (timestamp, level tag, module tag, message)
2. Level filtering (debug below threshold is suppressed)
3. File writing (append to correct dated file)
4. Rotation cleanup (files older than maxAgeDays are deleted)
5. Graceful degradation (non-existent log dir recovers)
6. createLogger returns object with debug/info/warn/error methods

Update `.env.example` to add `LOG_LEVEL=info`.
Update `.gitignore` to add `logs/` directory.

## Inputs

- `src/lib/server/llm-client.ts`
- `src/lib/server/compare-service.ts`
- `.env.example`
- `.gitignore`

## Expected Output

- `src/lib/server/logger.ts`
- `src/lib/server/logger.test.ts`
- `.env.example`
- `.gitignore`

## Verification

cd C:/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M002 && npx vitest run src/lib/server/logger.test.ts

## Observability Impact

Signals added: structured log format with level/timestamp/module to file + stdout. Future agent can tail logs/app-YYYY-MM-DD.log or set LOG_LEVEL=debug for verbose output.
