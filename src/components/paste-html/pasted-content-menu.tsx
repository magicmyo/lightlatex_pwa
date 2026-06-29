import React, { FC } from 'react'
import { EditorView } from '@codemirror/view'
import { PastedContent } from '@/extensions/visual/pasted-content'

// Task 6 stub for Overleaf's pasted-content menu. The full popover menu pulls
// in event-tracking, shared overlays and OS helpers. This minimal version
// offers a single button to insert the formatted pasted content, keeping the
// paste-html flow functional without the heavier UI.
export const PastedContentMenu: FC<{
  insertPastedContent: (
    view: EditorView,
    pastedContent: PastedContent,
    formatted: boolean
  ) => void
  pastedContent: PastedContent
  view: EditorView
  formatted: boolean
}> = ({ view, insertPastedContent, pastedContent, formatted }) => {
  return (
    <button
      type="button"
      className="ol-cm-pasted-content-menu-toggle"
      onClick={() => insertPastedContent(view, pastedContent, formatted)}
      aria-label="Insert pasted content"
    >
      ⋯
    </button>
  )
}
