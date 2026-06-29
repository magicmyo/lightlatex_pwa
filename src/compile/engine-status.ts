// engine-status.ts — lightweight framework-free store for engine download/prepare status.
// Consumed by DownloadBanner via React.useSyncExternalStore.
// Must NOT import from engine.ts to avoid circular dependency.

export type EnginePhase =
  | 'idle'
  | 'downloading-engine'
  | 'preparing-engine'
  | 'downloading-packages'
  | 'ready'      // engine already cached — skip full download, show brief "Ready ✓"
  | 'done'
  | 'error'

export interface EngineStatus {
  phase: EnginePhase
  /** 0–100 during downloading-engine when Content-Length is known; null otherwise */
  percent: number | null
  bytesLoaded: number
  bytesTotal: number
  /** Date.now() when the current phase started */
  startedAt: number | null
  error: string | null
  /** Number of TeX package files fetched over the network (accumulates within a phase) */
  filesFetched: number
  /** Total bytes of TeX package files fetched over the network */
  packageBytes: number
}

const _initial: EngineStatus = {
  phase: 'idle',
  percent: null,
  bytesLoaded: 0,
  bytesTotal: 0,
  startedAt: null,
  error: null,
  filesFetched: 0,
  packageBytes: 0,
}

let _status: EngineStatus = { ..._initial }
const _listeners = new Set<() => void>()

function _notify() {
  for (const l of _listeners) l()
}

// ─── useSyncExternalStore-compatible store ────────────────────────────────────

export const engineStatusStore = {
  subscribe(listener: () => void): () => void {
    _listeners.add(listener)
    return () => { _listeners.delete(listener) }
  },
  getSnapshot(): EngineStatus {
    return _status
  },
}

// ─── Setters (called from engine.ts) ─────────────────────────────────────────

export function setEnginePhase(phase: EnginePhase) {
  _status = { ..._initial, phase, startedAt: Date.now() }
  _notify()
}

export function updateEngineProgress(bytesLoaded: number, bytesTotal: number) {
  const percent = bytesTotal > 0 ? Math.min(100, Math.round((bytesLoaded / bytesTotal) * 100)) : null
  _status = { ..._status, bytesLoaded, bytesTotal, percent }
  _notify()
}

/** Accumulate one fetched TeX package file (called from the engine worker message handler). */
export function updatePackageProgress(deltaBytes: number) {
  _status = {
    ..._status,
    filesFetched: _status.filesFetched + 1,
    packageBytes: _status.packageBytes + deltaBytes,
  }
  _notify()
}

export function setEngineError(error: string) {
  _status = { ..._status, phase: 'error', error }
  _notify()
}

export function setEngineDone() {
  _status = { ..._status, phase: 'done' }
  _notify()
}
