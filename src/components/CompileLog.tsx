import React, { useState } from 'react'
import { useEditorContext } from '../contexts/EditorContext'

export function CompileLog() {
  const { compileResult } = useEditorContext()
  const [collapsed, setCollapsed] = useState(false)

  if (!compileResult) return null

  const errors = compileResult.errors ?? []
  const warnings = compileResult.warnings ?? []
  if (errors.length === 0 && warnings.length === 0) return null

  return (
    <div
      style={{
        borderTop: '1px solid #ccc',
        background: '#fafafa',
        fontSize: '12px',
        maxHeight: collapsed ? '28px' : '160px',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{
          padding: '4px 12px',
          cursor: 'pointer',
          background: errors.length > 0 ? '#fdd' : '#ffe',
          fontWeight: 500,
          borderBottom: '1px solid #ddd',
          userSelect: 'none',
        }}
      >
        {collapsed ? '▶' : '▼'} {errors.length} error
        {errors.length !== 1 ? 's' : ''}, {warnings.length} warning
        {warnings.length !== 1 ? 's' : ''}
      </div>
      {!collapsed && (
        <div style={{ overflow: 'auto', maxHeight: '132px', padding: '4px 0' }}>
          {errors.map((e: any, i: number) => (
            <div key={i} style={{ padding: '2px 12px', color: '#c00' }}>
              {e.line ? `Line ${e.line}: ` : ''}
              {e.message}
            </div>
          ))}
          {warnings.map((w: any, i: number) => (
            <div key={i} style={{ padding: '2px 12px', color: '#960' }}>
              {w.line ? `Line ${w.line}: ` : ''}
              {w.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
