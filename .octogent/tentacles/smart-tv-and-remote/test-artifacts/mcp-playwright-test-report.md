# MCP Playwright Test — Master/Slave Mode

**Date:** 2026-06-10
**Tester:** smart-tv-and-remote-todo-1
**Dev server:** http://localhost:3002 (serving stale bundle)

## Setup

Two browser tabs driven by `mcp__playwright__*` tools against the same MCP browser
context (which shares localStorage / IndexedDB — see note below):

| Tab | URL | Role |
|---|---|---|
| 0   | `/?tv=1` | Smart TV (slave) |
| 1   | `/?testMode=stores` | Remote (master) |

Note: MCP tabs share a browser context, so IndexedDB is shared. This contaminates
the test (master tab loads TV's persisted `isSmartTV`/`slaveId`). For a clean
test, the e2e suite uses two `browser.newContext()`.

## Steps executed

1. TV tab → click "QR Code" tile → `TvPairingView` mounts.
2. `TvPairingView.useEffect` calls `remoteStore.enableSmartTVMode()`.
3. Backend replies `quix-slave-registered {slaveId: "player_…", shortCode: "IAS4W"}`.
4. UI shows: title "Connetti il tuo dispositivo", QR image, 5-char code **IAS4W**.
5. Master tab → `remoteStore.connectAsRemoteMaster("IAS4W")`.
6. Backend replies `quix-master-connected {slaveId: "player_…"}`.
7. Master observable: `isRemoteMaster=true`, `isRemoteMasterConnected=true`,
   `connectionHealth="good"`, `knownSlaves` length 1.
8. Master sends `request_status` → no `remoteSlaveState` update (slave never
   responded, see below).

## Results

### TV side (Tab 0)

- QR + short code **shown** (IAS4W). ✓
- WebSocket drops **after** `quix-slave-registered` is received. ✗
  Console: `WebSocket connection closed. Attempting to reconnect...` →
  `Reconnecting in 5000ms (attempt 1/10)`.
- After reconnect: `[RemoteStore] initRemoteSession: waiting for initial data
  to load before registering slave` → **slave is NOT re-registered**. ✗
- TV never receives `quix-master-connected`. ✗
- TV UI stays on the pairing view (never transitions to `SlaveConnectedView`).

### Master side (Tab 1)

- `isRemoteMaster = true`. ✓
- `isRemoteMasterConnected = true`. ✓ (but connected to a **ghost** session —
  the TV is not actually online, see TV side findings)
- `connectionHealth = "good"`. ✓
- `knownSlaves` length 1 (entry has `id` but no `shortCode` / `isOnline`). ⚠
- `request_status` command sent → no `remoteSlaveState` update. ✗
- Console shows `quix-master-connected` arrived twice (once for the actual
  registration, once because the master tab ALSO auto-registered as slave via
  persisted IndexedDB data — cross-tab contamination).

## Bugs found

### Bug 1 — TV slave is not re-registered after WS reconnect
- **Where:** `frontend/store/remoteStore.js` (initRemoteSession)
- **Symptom:** After the WebSocket reconnects, the TV waits for "initial data
  to load" and never calls `registerSlave` again. The backend has no record of
  the slave, so any master's `quix-master-connected` is meaningless.
- **Fix already in working tree:** commit `2faa1dd — fix(tv): wire up
  remoteStore to websocket so slave registration populates slaveId/shortCode`.
  The dev server is serving a **stale bundle** (`index-ilIHZrOe.js`) that
  predates this fix, so the bug is reproducible.

### Bug 2 — Test affordance missing in served TvApp bundle
- The new `TvApp.jsx` (working tree) exposes `window.__quixTest` when
  `?testMode=stores` is set, mirroring `App.jsx`. The served bundle does
  **not** have this exposure. Result: the e2e test
  `frontend/e2e/master-slave-full-flow.spec.js` hangs on
  `waitForFunction(() => !!window.__quixTest?.remoteStore)` when the TV tab
  is loaded.
- **Fix:** rebuild the bundle (restart `bun run dev`).

### Bug 3 — Cross-tab IndexedDB contamination
- Both tabs at the same origin share the same `quix` IndexedDB. The master
  tab (no `?tv=1`) loads persisted `isSmartTV=true, slaveId=…` and tries to
  re-register as a slave on the same backend, creating a ghost session that
  confuses the handshake.
- This is a **test-environment** artifact (MCP tabs share a context, e2e uses
  separate contexts). The production case is a TV on a TV browser and a phone
  on a phone browser — separate origins → separate DBs. Not a real product
  bug, but it makes the MCP test harder to interpret.

## Artifacts

- `tv-tab-state.png` — TV tab still on pairing view after master "connect"
- `master-tab-state.png` — master tab after `connectAsRemoteMaster`

## Verdict

The master/slave mode is **partially functional** with the served bundle:

- ✓ QR + short code generation (IAS4W format, 5 chars)
- ✓ Master can connect via short code
- ✗ TV drops the slave registration on WS reconnect
- ✗ TV never receives `quix-master-connected`
- ✗ Remote commands from master have no effect on TV

The end-to-end flow cannot complete until the dev server rebuilds with the
working-tree fix.
