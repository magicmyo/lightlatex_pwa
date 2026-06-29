import React, { useEffect, useState, useSyncExternalStore } from 'react'
import { engineStatusStore, type EngineStatus } from '../compile/engine-status'

const BLUE      = '#1a73e8'   // theme accent — matches the logo / toolbar
const BLUE_DARK = '#0d1117'   // near-black track background
const READY_HIDE_MS = 1500

// ── elapsed-seconds hook ──────────────────────────────────────────────────────
function useElapsed(startedAt: number | null): number {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (startedAt === null) { setElapsed(0); return }
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startedAt])
  return elapsed
}

// ── Per-file fill curve ───────────────────────────────────────────────────────
// Maps a real file count to a fill percentage that advances only when actual
// package files arrive (no timer). Approaches but never reaches 100 so the bar
// doesn't falsely show "done" — the "✓ LaTeX Engine Ready" state is the real end.
//   K=6: n=0→0%, n=6→50%, n=18→75%, n=42→87.5%, n=90→93.8%
const K = 6
function fillFromFiles(n: number): number {
  return 100 * (1 - K / (K + n))
}

// ── main component ────────────────────────────────────────────────────────────
export function DownloadBanner() {
  const status: EngineStatus = useSyncExternalStore(
    engineStatusStore.subscribe,
    engineStatusStore.getSnapshot,
  )

  // Auto-dismiss "Ready ✓" after READY_HIDE_MS
  const [dismissed, setDismissed] = useState(false)
  const [showReady, setShowReady] = useState(false)

  useEffect(() => {
    if (status.phase === 'ready' || status.phase === 'done') {
      setDismissed(false)
      setShowReady(true)
      const id = setTimeout(() => setDismissed(true), READY_HIDE_MS)
      return () => clearTimeout(id)
    } else {
      setShowReady(false)
      setDismissed(false)
    }
  }, [status.phase])

  const isActive = !dismissed && status.phase !== 'idle'
  const elapsed  = useElapsed(isActive && !showReady ? status.startedAt : null)

  if (!isActive) return null

  // ── "Ready ✓" — this IS the real 100% / done moment ──────────────────────
  if (showReady) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
        background: BLUE_DARK, color: BLUE,
        fontSize: '14px', fontWeight: 700, padding: '10px 20px',
        display: 'flex', alignItems: 'center', gap: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
      }}>
        ✓ LaTeX Engine Ready
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (status.phase === 'error') {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
        background: '#5a0000', color: '#ff8a80',
        fontSize: '13px', fontWeight: 600, padding: '10px 20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
      }}>
        LaTeX engine error: {status.error ?? 'unknown'}
      </div>
    )
  }

  // ── Derive fill — NO timers, only real data ───────────────────────────────
  // downloading-engine: real byte percent (always set with fallback total now)
  // preparing / downloading-packages: advances only when pkgprogress fires
  const fill: number =
    status.phase === 'downloading-engine'
      ? (status.percent ?? 0)
      : fillFromFiles(status.filesFetched)

  // ── Labels ────────────────────────────────────────────────────────────────
  let leftLabel: string
  let rightLabel: string

  if (status.phase === 'downloading-engine') {
    leftLabel  = 'Downloading LaTeX Engine ...'
    rightLabel = `${Math.round(fill)}%`
  } else if (status.phase === 'preparing-engine') {
    leftLabel  = 'Preparing LaTeX Engine ...'
    rightLabel = status.filesFetched > 0
      ? `${status.filesFetched} files · ${(status.packageBytes / (1024 * 1024)).toFixed(1)} MB`
      : `${elapsed}s`
  } else {
    // downloading-packages
    leftLabel  = 'Downloading LaTeX Packages ...'
    rightLabel = status.filesFetched > 0
      ? `${status.filesFetched} files · ${(status.packageBytes / (1024 * 1024)).toFixed(1)} MB`
      : `${elapsed}s`
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: BLUE_DARK, color: '#fff',
      padding: '10px 20px 14px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Label row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: '8px',
      }}>
        <span style={{ fontSize: '15px', fontWeight: 700 }}>{leftLabel}</span>
        {rightLabel && (
          <span style={{ fontSize: '15px', fontWeight: 700 }}>{rightLabel}</span>
        )}
      </div>

      {/* Solid progress bar — advances only when real downloads happen */}
      <div style={{
        width: '100%', height: '20px',
        border: `2px solid ${BLUE}`,
        borderRadius: '3px',
        background: BLUE_DARK,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${fill}%`,
          background: BLUE,
          borderRadius: '1px',
          transition: 'width 0.3s ease-out',
        }} />
      </div>
    </div>
  )
}
