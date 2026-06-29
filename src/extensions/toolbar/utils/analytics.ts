import { EditorView } from '@codemirror/view'

// Task 6 stub: Overleaf's toolbar analytics emit DOM CustomEvents consumed by
// their event-tracking system. We keep the event dispatch (harmless, no deps)
// but drop the analytics plumbing.
export function emitCommandEvent(view: EditorView, command: string) {
  view.dom.dispatchEvent(
    new CustomEvent('editor:command', { bubbles: true, detail: command })
  )
}

export function emitToolbarEvent(view: EditorView, command: string) {
  view.dom.dispatchEvent(
    new CustomEvent('editor:toolbar', { bubbles: true, detail: command })
  )
}

export function emitShortcutEvent(view: EditorView, command: string) {
  view.dom.dispatchEvent(
    new CustomEvent('editor:shortcut', { bubbles: true, detail: command })
  )
}
