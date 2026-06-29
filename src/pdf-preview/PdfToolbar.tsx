import React, { useState, useRef, useEffect } from 'react'
import { useEditorContext } from '../contexts/EditorContext'

interface PdfToolbarProps {
  scale: number
  currentPage: number
  numPages: number
  onZoomIn: () => void
  onZoomOut: () => void
  onGoToPage: (page: number) => void
}

export function PdfToolbar({ scale, currentPage, numPages, onZoomIn, onZoomOut, onGoToPage }: PdfToolbarProps) {
  const { compile, isCompiling, compileResult, projectName } = useEditorContext()
  const [logOpen, setLogOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const errors      = compileResult?.errors ?? []
  const warnings    = compileResult?.warnings ?? []
  const hasErrors   = errors.length > 0
  const hasWarnings = warnings.length > 0
  const pdfAvailable = compileResult?.status === 'success'
  const pdfUrl       = compileResult?.pdf_url ?? null
  const rawLog       = compileResult?.raw_log ?? ''

  useEffect(() => {
    if (!logOpen) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setLogOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [logOpen])

  const btnStyle: React.CSSProperties = {
    padding: '2px 7px', background: '#fff', border: '1px solid #d0d0d0',
    borderRadius: '3px', cursor: 'pointer', fontSize: '12px', color: '#333',
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      padding: '5px 10px', background: '#f5f5f5',
      borderBottom: '1px solid #d0d0d0', flexShrink: 0,
    }}>
      <button
        onClick={compile} disabled={isCompiling}
        style={{
          padding: '4px 14px',
          background: isCompiling ? '#888' : '#1a73e8',
          color: '#fff', border: 'none', borderRadius: '4px',
          cursor: isCompiling ? 'not-allowed' : 'pointer',
          fontSize: '13px', fontWeight: 600,
        }}
      >
        {isCompiling ? 'Compiling…' : 'Recompile'}
      </button>

      {compileResult && (errors.length > 0 || warnings.length > 0) && (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            onClick={() => setLogOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '3px 10px',
              background: hasErrors ? '#fdecea' : '#fff8e1',
              border: `1px solid ${hasErrors ? '#e57373' : '#ffc107'}`,
              borderRadius: '4px', cursor: 'pointer', fontSize: '12px',
              color: hasErrors ? '#c62828' : '#f57f17', fontWeight: 500,
            }}
          >
            {hasErrors ? `⚠ ${errors.length} error${errors.length !== 1 ? 's' : ''}` : ''}
            {hasErrors && hasWarnings ? ' · ' : ''}
            {hasWarnings ? `${warnings.length} warning${warnings.length !== 1 ? 's' : ''}` : ''}
          </button>
          {logOpen && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, zIndex: 300,
              background: '#fff', border: '1px solid #ccc', borderRadius: '4px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)', minWidth: '360px', maxWidth: '520px',
              maxHeight: '320px', overflow: 'auto', padding: '8px 0', marginTop: '2px',
            }}>
              {errors.map((e: any, i: number) => (
                <div key={i} style={{ padding: '4px 14px', fontSize: '12px', color: '#c00', borderBottom: '1px solid #fdd' }}>
                  <strong>{e.line ? `Line ${e.line}: ` : ''}</strong>{e.message}
                </div>
              ))}
              {warnings.map((w: any, i: number) => (
                <div key={i} style={{ padding: '4px 14px', fontSize: '12px', color: '#8a6200', borderBottom: '1px solid #fff3cc' }}>
                  <strong>{w.line ? `Line ${w.line}: ` : ''}</strong>{w.message}
                </div>
              ))}
              {rawLog && (
                <div style={{ padding: '8px 14px', fontSize: '11px', fontFamily: 'monospace', color: '#555', background: '#f8f8f8', borderTop: '1px solid #eee', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {rawLog}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ flex: 1 }} />

      {pdfAvailable && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <button onClick={onZoomOut} style={btnStyle} title="Zoom out">−</button>
          <span style={{ fontSize: '11px', color: '#555', minWidth: '36px', textAlign: 'center' }}>
            {Math.round(scale * 100)}%
          </span>
          <button onClick={onZoomIn} style={btnStyle} title="Zoom in">+</button>
        </div>
      )}

      {pdfAvailable && numPages > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginLeft: '6px' }}>
          <button onClick={() => onGoToPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1}
            style={{ ...btnStyle, opacity: currentPage <= 1 ? 0.4 : 1 }} title="Previous page">▲</button>
          <span style={{ fontSize: '11px', color: '#555', minWidth: '44px', textAlign: 'center' }}>
            {currentPage} / {numPages}
          </span>
          <button onClick={() => onGoToPage(Math.min(numPages, currentPage + 1))} disabled={currentPage >= numPages}
            style={{ ...btnStyle, opacity: currentPage >= numPages ? 0.4 : 1 }} title="Next page">▼</button>
        </div>
      )}

      {/* Download PDF — uses blob URL from compile result */}
      {pdfUrl ? (
        <a href={pdfUrl} download={`${projectName}.pdf`}
          style={{ padding: '3px 10px', fontSize: '12px', color: '#1a73e8', textDecoration: 'none',
            border: '1px solid #4a90e2', borderRadius: '4px', background: '#fff', marginLeft: '4px' }}
          title="Download PDF"
        >⭳ PDF</a>
      ) : (
        <span style={{ padding: '3px 10px', fontSize: '12px', color: '#bbb',
          border: '1px solid #ddd', borderRadius: '4px', background: '#fff', marginLeft: '4px' }}
          title="Compile first to download PDF"
        >⭳ PDF</span>
      )}
    </div>
  )
}
