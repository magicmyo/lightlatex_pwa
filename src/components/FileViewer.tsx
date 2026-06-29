import React, { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { useEditorContext } from '../contexts/EditorContext'
import { PdfViewer, PdfViewerHandle } from '../pdf-preview/PdfPreview'

const IMAGE_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico',
])

const MIN_SCALE = 0.5
const MAX_SCALE = 3.0
const SCALE_STEP = 0.25

function clamp(v: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(v * 100) / 100))
}

export function FileViewer() {
  const { viewedFile } = useEditorContext()
  const [url, setUrl] = useState<string | null>(null)
  const [scale, setScale] = useState(1.5)
  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const viewerRef = useRef<PdfViewerHandle>(null)

  // Resolve blob URL whenever the viewed file changes
  useEffect(() => {
    if (!viewedFile) { setUrl(null); return }
    let cancelled = false
    api.getFileUrl(viewedFile.id, viewedFile.name).then(u => {
      if (!cancelled) { setUrl(u); setCurrentPage(1) }
    }).catch(() => {
      if (!cancelled) setUrl(null)
    })
    return () => { cancelled = true }
  }, [viewedFile?.id, viewedFile?.name])

  const handleNumPages = useCallback((n: number) => { setNumPages(n); setCurrentPage(1) }, [])

  if (!viewedFile) return null

  const ext = viewedFile.name.split('.').pop()?.toLowerCase() ?? ''
  const isPdf   = ext === 'pdf'
  const isImage = IMAGE_EXTENSIONS.has(ext)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header bar — file name + zoom controls for PDFs */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '4px 12px', borderBottom: '1px solid #d0d0d0',
        background: '#f5f5f5', flexShrink: 0, minHeight: '36px',
      }}>
        <span style={{ fontSize: '13px', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {viewedFile.name}
        </span>
        {isPdf && url && (
          <>
            <span style={{ fontSize: '12px', color: '#555' }}>
              {currentPage}/{numPages || '…'}
            </span>
            <button
              onClick={() => setScale(s => clamp(s - SCALE_STEP))}
              title="Zoom out"
              style={btnStyle}
            >−</button>
            <span style={{ fontSize: '12px', color: '#555', minWidth: '38px', textAlign: 'center' }}>
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale(s => clamp(s + SCALE_STEP))}
              title="Zoom in"
              style={btnStyle}
            >+</button>
          </>
        )}
      </div>

      {/* Content area */}
      {!url ? (
        <div style={centeredStyle}>
          <span style={{ color: '#888', fontSize: '13px' }}>Loading…</span>
        </div>
      ) : isPdf ? (
        <PdfViewer
          ref={viewerRef}
          pdfUrl={url}
          scale={scale}
          onNumPages={handleNumPages}
          onVisiblePageChange={setCurrentPage}
        />
      ) : isImage ? (
        <div style={{ flex: 1, overflow: 'auto', background: '#606060', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <img
            src={url}
            alt={viewedFile.name}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
          />
        </div>
      ) : (
        <div style={centeredStyle}>
          <span style={{ color: '#888', fontSize: '13px' }}>No preview available for <strong>{viewedFile.name}</strong></span>
        </div>
      )}
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  padding: '2px 8px', fontSize: '14px', lineHeight: 1,
  background: '#fff', border: '1px solid #ccc', borderRadius: '3px',
  cursor: 'pointer', flexShrink: 0,
}

const centeredStyle: React.CSSProperties = {
  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
}
