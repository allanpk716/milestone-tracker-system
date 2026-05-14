# mt-cli GSD Extension

Opt-in GSD extension that synchronises task lifecycle events to the **Milestone Tracker** via the `mt-cli` CLI binary. Non-blocking and idempotent — sync failures never block auto-mode execution.

## Prerequisites

| Requirement | Details |
|---|---|
| **mt-cli on PATH** | The `mt-cli` binary must be built, installed, and reachable via `PATH`. Verify with `mt-cli --version`. |
| **Server config** | `.mt-cli.json` (or equivalent) must contain `serverUrl`, `milestoneId`, and `apiKey`. Run `mt-cli status` to confirm connectivity. |
| **GSD platform** | `>= 2.29.0` — extension hooks require this minimum version. |

## Installation

Copy or symlink the extension directory into your GSD extensions folder:

```bash
# Option A: Copy
cp -r .gsd/agent/extensions/mt-cli/ ~/.gsd/agent/extensions/mt-cli/

# Option B: Symlink (preferred for development)
ln -s "$(pwd)/.gsd/agent/extensions/mt-cli" ~/.gsd/agent/extensions/mt-cli
```

The extension will be loaded automatically on the next GSD session.

## Commands

### `/mt-cli bootstrap`

Walks the `.gsd/milestones/` tree and indexes all existing milestones, slices, and tasks into `.gsd/mt-sync.json`. Does **not** create tasks in the Milestone Tracker — only creates mapping entries. Safe to run multiple times (idempotent).

```
/mt-cli bootstrap
```

### `/mt-cli status`

Displays a summary of the current sync mapping:

```
/mt-cli status
```

Output includes milestone ID, slice/task counts, mapped vs. unmapped tasks, and the last sync timestamp.

## Auto-Mode Integration

The extension declares hooks in `extension-manifest.json` for `execute-task` and `complete-task` events. When these hooks fire, the sync engine:

1. **execute-task** → claims the task in Milestone Tracker (`mt-cli tasks claim`)
2. **complete-task** → marks the task complete (`mt-cli tasks complete`)
3. **complete-slice** → marks all mapped tasks in the slice as complete

### Manual Hook Patching

If your GSD version does not support manifest-declared hooks, you can manually patch `auto-post-unit.js`:

```js
// In auto-post-unit.js, after the existing runSafely calls:
import { runMtSync } from "../extensions/mt-cli/sync.js";

await runSafely('postUnit', 'mt-sync', () =>
  runMtSync(basePath, unitType, unitId)
);
```

## Configuration

| Preference | Default | Description |
|---|---|---|
| `mt_sync.enabled` | `true` | Master on/off switch for mt-cli sync. When `false`, all sync operations are skipped. |

Set in your GSD preferences (`.gsd/preferences.json` or equivalent):

```json
{
  "mt_sync": { "enabled": true }
}
```

## Mapping File (`.gsd/mt-sync.json`)

Human-readable JSON persisted at `.gsd/mt-sync.json`. Tracks:

- **`version`** — Schema version (currently `1`)
- **`milestoneId`** — Active milestone ID
- **`slices`** — Per-slice sync records keyed by `M###/S##`
- **`tasks`** — Per-task sync records keyed by `M###/S##/T##`

Each task record contains:

| Field | Type | Description |
|---|---|---|
| `mtTaskId` | `string \| null` | Milestone Tracker task ID. `null` means the task has no mapping yet. |
| `state` | `string` | One of: `unmapped`, `claimed`, `in_progress`, `completed`, `blocked` |
| `lastSyncedAt` | `string` | ISO 8601 timestamp of the last successful sync |

### Staleness Detection

Check `lastSyncedAt` timestamps to detect stale mappings. Tasks with older timestamps may indicate sync interruptions. The `/mt-cli status` command reports the most recent sync time.

## Troubleshooting

### "mt-cli not installed or not on PATH"

Ensure `mt-cli` is built and on your `PATH`:

```bash
which mt-cli        # Unix
where mt-cli        # Windows
mt-cli --version    # Should print a version
```

### "No sync mapping found"

Run `/mt-cli bootstrap` to create the initial mapping. Ensure `.gsd/milestones/` exists and contains milestone directories.

### Tasks remain unmapped (`mtTaskId: null`)

Bootstrap only indexes existing GSD entities — it does **not** auto-create tasks in the Milestone Tracker. To map tasks:

1. Create the corresponding task in the Milestone Tracker UI
2. Edit `.gsd/mt-sync.json` and set the `mtTaskId` field for each task

### Sync failures are silent

By design. The extension never blocks auto-mode. To debug sync issues:

1. Set `MT_SYNC_DEBUG=1` environment variable to enable stderr logging
2. Check GSD debug logs for `"mt-sync"` channel messages with `debugLog("mt-sync", {...})`
3. Inspect `.gsd/mt-sync.json` for state and timestamp anomalies

### Connectivity errors

Run `mt-cli status` directly to verify server connectivity and API key validity before troubleshooting the extension.

## Architecture

The extension follows the **github-sync** pattern:

```
mt-cli/
├── extension-manifest.json   # Extension metadata, commands, hooks
├── index.js                  # Entry point — registers /mt-cli command
├── sync.js                   # Sync engine — routes events to mt-cli calls
├── cli.js                    # CLI wrapper — thin execFileSync layer
├── mapping.js                # Persistence — load/save .gsd/mt-sync.json
└── __tests__/
    ├── sync.test.js
    ├── cli.test.js
    └── mapping.test.js
```

- **cli.js** — Returns `Result<T>` (`{ ok, data }` or `{ ok: false, error }`). Never throws.
- **sync.js** — Main entry point `runMtSync(basePath, unitType, unitId)`. All errors caught internally.
- **mapping.js** — Atomic writes via temp-file-then-rename pattern. Self-contained (no external imports).
- **index.js** — Default export registers the `/mt-cli` slash command and wires debug logging.
