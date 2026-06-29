import React from 'react'
import { useEditorContext } from '../contexts/EditorContext'

export function StatusBar() {
  const { wordCount, compileResult, isCompiling } = useEditorContext()

  let statusText = ''
  let statusColor = '#888'
  if (isCompiling) {
    statusText = 'Compiling…'
    statusColor = '#888'
  } else if (compileResult) {
    if (compileResult.status === 'success') {
      statusText = `Compiled in ${(compileResult.compile_time_ms / 1000).toFixed(1)}s`
      statusColor = '#1558b0'
    } else {
      statusText = 'Compilation failed'
      statusColor = '#c00'
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '16px',
      padding: '3px 12px', background: '#f0f0f0',
      borderTop: '1px solid #d8d8d8', fontSize: '11px', color: '#666',
      flexShrink: 0,
    }}>
      <span>Words: {wordCount.toLocaleString()}</span>
      <span style={{ color: '#ccc' }}>|</span>
      <span>pdfLaTeX (SwiftLaTeX)</span>
      {statusText && (
        <>
          <span style={{ color: '#ccc' }}>|</span>
          <span style={{ color: statusColor }}>{statusText}</span>
        </>
      )}
    </div>
  )
}
