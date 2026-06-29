import React, { useMemo } from 'react'
import { useEditorContext } from '../contexts/EditorContext'
import { extractFlatOutline, FlatSection } from '../utils/outline-sections'

export function Breadcrumb() {
  const { currentDoc, liveText, cursorLine } = useEditorContext()

  const display = useMemo(() => {
    if (!currentDoc) return ''

    const flat = extractFlatOutline(liveText)
    const preceding = flat.filter((s: FlatSection) => s.line <= cursorLine)

    // For each level, keep the last (most recent) section at that level
    const byLevel: Record<number, FlatSection> = {}
    for (const s of preceding) {
      // Clear all deeper levels so stale subsections from a prior parent don't persist
      for (const lvl of Object.keys(byLevel).map(Number)) {
        if (lvl > s.level) {
          delete byLevel[lvl]
        }
      }
      byLevel[s.level] = s
    }

    // Sort levels ascending (top-level first) and collect titles
    const path = Object.keys(byLevel)
      .map(Number)
      .sort((a, b) => a - b)
      .map(lvl => byLevel[lvl].title)

    const parts = [currentDoc.name, ...path]
    return parts.join(' › ')
  }, [currentDoc, liveText, cursorLine])

  if (!currentDoc) return null

  return (
    <div
      style={{
        color: '#666',
        fontSize: '11px',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        padding: '4px 8px',
        flex: 1,
        minWidth: 0,
      }}
      title={display}
    >
      {display}
    </div>
  )
}
