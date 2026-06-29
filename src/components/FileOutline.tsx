import React, { useMemo } from 'react'
import { EditorView } from '@codemirror/view'
import { useEditorContext } from '../contexts/EditorContext'
import { nestOutline, Outline } from '../utils/tree-operations/outline'
import { extractFlatOutline } from '../utils/outline-sections'

function scrollToLine(view: EditorView, lineNumber: number) {
  const doc = view.state.doc
  if (lineNumber < 1 || lineNumber > doc.lines) return
  const line = doc.line(lineNumber)
  view.dispatch({
    selection: { anchor: line.from },
    effects: EditorView.scrollIntoView(line.from, { y: 'center' }),
  })
  view.focus()
}

function OutlineNode({ item, viewRef, activeLine }: { item: Outline; viewRef: React.MutableRefObject<EditorView | null>; activeLine: number }) {
  const indent = Math.max(0, item.level - 4) * 10
  const isActive = item.line === activeLine
  return (
    <div>
      <div
        onClick={() => { if (viewRef.current) scrollToLine(viewRef.current, item.line) }}
        style={{
          paddingLeft: `${8 + indent}px`, paddingRight: '8px', paddingTop: '3px', paddingBottom: '3px',
          fontSize: '12px', cursor: 'pointer', lineHeight: 1.3, borderRadius: '2px',
          background: isActive ? '#e8f0fe' : 'transparent',
          color: isActive ? '#1a73e8' : '#444',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.background = isActive ? '#d2e3fc' : '#e8e8e8'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.background = isActive ? '#e8f0fe' : 'transparent'
        }}
        title={`Line ${item.line}: ${item.title}`}
      >
        {item.title || '(untitled)'}
      </div>
      {item.children?.map((child, i) => (
        <OutlineNode key={i} item={child} viewRef={viewRef} activeLine={activeLine} />
      ))}
    </div>
  )
}

export function FileOutline() {
  const { liveText, viewRef, cursorLine } = useEditorContext()

  // Split memoization: flat outline recomputes only when text changes
  const flat = useMemo(() => extractFlatOutline(liveText), [liveText])

  // Nested outline recomputes only when flat changes
  const outline = useMemo(() => nestOutline(flat as any), [flat])

  // Active line is cheap: recomputes on flat or cursorLine change
  const activeLine = useMemo(() => {
    let active = 0
    for (const item of flat) {
      if (item.line <= cursorLine) active = item.line
    }
    return active
  }, [flat, cursorLine])

  if (outline.length === 0) {
    return (
      <div style={{ padding: '8px', fontSize: '11px', color: '#999', borderTop: '1px solid #e0e0e0', height: '100%' }}>
        <div style={{ fontWeight: 600, marginBottom: '4px', color: '#666', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Outline</div>
        <div>No sections found</div>
      </div>
    )
  }

  return (
    <div style={{ borderTop: '1px solid #e0e0e0', padding: '4px 0', overflow: 'auto', height: '100%' }}>
      <div style={{ padding: '4px 8px 2px', fontWeight: 600, fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Outline</div>
      {outline.map((item, i) => (
        <OutlineNode key={i} item={item} viewRef={viewRef} activeLine={activeLine} />
      ))}
    </div>
  )
}
