import React from 'react'

type EditorMode = 'cm6' | 'rich-text'

interface EditorSwitchProps {
  mode: EditorMode
  onChange: (mode: EditorMode) => void
}

export function EditorSwitch({ mode, onChange }: EditorSwitchProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '4px',
        padding: '4px',
        border: '1px solid #ccc',
        borderRadius: '4px',
      }}
    >
      <button
        onClick={() => onChange('cm6')}
        style={{
          padding: '4px 12px',
          background: mode === 'cm6' ? '#1a73e8' : 'transparent',
          color: mode === 'cm6' ? '#fff' : '#666',
          border: mode === 'cm6' ? '1px solid #1a73e8' : '1px solid transparent',
          borderRadius: '3px',
          cursor: 'pointer',
          fontSize: '12px',
        }}
      >
        Code Editor
      </button>
      <button
        onClick={() => onChange('rich-text')}
        style={{
          padding: '4px 12px',
          background: mode === 'rich-text' ? '#1a73e8' : 'transparent',
          color: mode === 'rich-text' ? '#fff' : '#666',
          border: mode === 'rich-text' ? '1px solid #1a73e8' : '1px solid transparent',
          borderRadius: '3px',
          cursor: 'pointer',
          fontSize: '12px',
        }}
      >
        Visual Editor
      </button>
    </div>
  )
}
