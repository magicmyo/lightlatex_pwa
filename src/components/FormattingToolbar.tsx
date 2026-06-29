import React, { useState } from 'react'
import { undo, redo } from '@codemirror/commands'
import { useEditorContext } from '../contexts/EditorContext'
import { IconUndo, IconRedo, IconBold, IconItalic, IconListBullet, IconListNumbered, IconLink, IconImage, IconTable } from './icons'

const BTN: React.CSSProperties = {
  background: 'none', border: '1px solid transparent', padding: '3px 7px',
  cursor: 'pointer', borderRadius: '3px', fontSize: '12px', color: '#333',
  lineHeight: 1.4, display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const BTN_HOVER = '#e8e8e8'
const SEP: React.CSSProperties = {
  width: '1px', background: '#d0d0d0', margin: '0 4px', height: '18px', alignSelf: 'center',
}

function ToolBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={BTN}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = BTN_HOVER; (e.currentTarget as HTMLButtonElement).style.borderColor = '#ccc' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent' }}
    >
      {children}
    </button>
  )
}

export function FormattingToolbar() {
  const { viewRef } = useEditorContext()
  const [sectionOpen, setSectionOpen] = useState(false)

  const view = () => viewRef.current

  const wrapSelection = (before: string, after: string) => {
    const v = view(); if (!v) return
    const { from, to } = v.state.selection.main
    const selected = v.state.sliceDoc(from, to)
    const insert = selected ? before + selected + after : before + after
    v.dispatch({
      changes: { from, to, insert },
      selection: { anchor: selected ? from + insert.length : from + before.length },
    })
    v.focus()
  }

  const wrapLines = (envName: string) => {
    const v = view(); if (!v) return
    const { from, to } = v.state.selection.main
    const lines = v.state.sliceDoc(from, to).split('\n').map(l => '  \\item ' + (l || '')).join('\n')
    const insert = `\\begin{${envName}}\n${lines || '  \\item '}\n\\end{${envName}}`
    v.dispatch({ changes: { from, to, insert }, selection: { anchor: from + insert.length } })
    v.focus()
  }

  const insertSnippet = (text: string) => {
    const v = view(); if (!v) return
    const { from, to } = v.state.selection.main
    v.dispatch({ changes: { from, to, insert: text }, selection: { anchor: from + text.length } })
    v.focus()
  }

  const insertSection = (cmd: string) => {
    const v = view(); if (!v) return
    const line = v.state.doc.lineAt(v.state.selection.main.from)
    const lineText = v.state.sliceDoc(line.from, line.to)
    const insert = `\\${cmd}{${lineText || 'Title'}}`
    v.dispatch({ changes: { from: line.from, to: line.to, insert }, selection: { anchor: line.from + insert.length } })
    setSectionOpen(false)
    v.focus()
  }

  const sections = [
    { label: 'Normal text', action: () => { setSectionOpen(false); view()?.focus() } },
    { label: 'Part', action: () => insertSection('part') },
    { label: 'Chapter', action: () => insertSection('chapter') },
    { label: 'Section', action: () => insertSection('section') },
    { label: 'Subsection', action: () => insertSection('subsection') },
    { label: 'Subsubsection', action: () => insertSection('subsubsection') },
  ]

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '2px',
      padding: '3px 8px', flexShrink: 0, flexWrap: 'wrap',
    }}>
      {/* Undo / Redo */}
      <ToolBtn title="Undo (Ctrl+Z)" onClick={() => { const v = view(); if (v) { undo(v); v.focus() } }}><IconUndo /></ToolBtn>
      <ToolBtn title="Redo (Ctrl+Y)" onClick={() => { const v = view(); if (v) { redo(v); v.focus() } }}><IconRedo /></ToolBtn>
      <div style={SEP} />

      {/* Section dropdown */}
      <div style={{ position: 'relative' }}>
        <button
          style={{ ...BTN, minWidth: '110px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}
          onClick={() => setSectionOpen(o => !o)}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = BTN_HOVER }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
        >
          <span>Section</span><span style={{ fontSize: '10px' }}>▾</span>
        </button>
        {sectionOpen && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, zIndex: 200,
            background: '#fff', border: '1px solid #ccc', borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)', minWidth: '140px', padding: '4px 0',
          }}>
            {sections.map(s => (
              <div key={s.label} onClick={s.action} style={{ padding: '6px 14px', cursor: 'pointer', fontSize: '12px' }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#f0f0f0'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
              >{s.label}</div>
            ))}
          </div>
        )}
      </div>
      <div style={SEP} />

      {/* Bold / Italic */}
      <ToolBtn title="Bold" onClick={() => wrapSelection('\\textbf{', '}')}><IconBold /></ToolBtn>
      <ToolBtn title="Italic" onClick={() => wrapSelection('\\textit{', '}')}><IconItalic /></ToolBtn>
      <div style={SEP} />

      {/* Lists */}
      <ToolBtn title="Bullet list" onClick={() => wrapLines('itemize')}><IconListBullet /></ToolBtn>
      <ToolBtn title="Numbered list" onClick={() => wrapLines('enumerate')}><IconListNumbered /></ToolBtn>
      <div style={SEP} />

      {/* Insert */}
      <ToolBtn title="Insert link" onClick={() => insertSnippet('\\href{https://example.com}{link text}')}><IconLink /></ToolBtn>
      <ToolBtn title="Insert figure" onClick={() => insertSnippet('\\begin{figure}[h]\n  \\centering\n  \\includegraphics[width=0.8\\linewidth]{image}\n  \\caption{Caption}\n  \\label{fig:label}\n\\end{figure}')}><IconImage /></ToolBtn>
      <ToolBtn title="Insert table" onClick={() => insertSnippet('\\begin{tabular}{|l|c|r|}\n  \\hline\n  A & B & C \\\\\n  \\hline\n  1 & 2 & 3 \\\\\n  \\hline\n\\end{tabular}')}><IconTable /></ToolBtn>
    </div>
  )
}
