import { Command } from '@codemirror/view'
import { EditorState, SelectionRange } from '@codemirror/state'
import { minimumListDepthForSelection } from '../../utils/tree-operations/ancestors'
import {
  ancestorListType,
  unwrapBulletList,
  unwrapNumberedList,
  unwrapDescriptionList,
  wrapInBulletList,
  wrapInNumberedList,
  wrapInDescriptionList,
} from './lists'

// Task 6: focused subset of Overleaf's toolbar/commands.ts. Only the list
// indent commands used by the visual editor keymap are ported here; the full
// command set (which pulls in event-tracking, snippets and ranges) is deferred.

export const ensureEmptyLine = (
  state: EditorState,
  range: SelectionRange,
  direction: 'above' | 'below' = 'below'
) => {
  let pos = range.anchor
  let suffix = ''
  let prefix = ''

  const line = state.doc.lineAt(pos)

  if (line.text.trim().length) {
    if (direction === 'below') {
      pos = Math.min(line.to + 1, state.doc.length)
    } else {
      pos = Math.max(line.from - 1, 0)
    }
    const neighbouringLine = state.doc.lineAt(pos)

    if (neighbouringLine.length && direction === 'below') {
      suffix = '\n'
    } else if (neighbouringLine.length && direction === 'above') {
      prefix = '\n'
    }
  }
  return { pos, suffix, prefix }
}

export const indentDecrease: Command = view => {
  if (minimumListDepthForSelection(view.state) < 2) {
    return false
  }
  switch (ancestorListType(view.state)) {
    case 'itemize':
      return unwrapBulletList(view)
    case 'enumerate':
      return unwrapNumberedList(view)
    case 'description':
      return unwrapDescriptionList(view)
    default:
      return false
  }
}

export const cursorIsAtStartOfListItem = (state: EditorState) => {
  return state.selection.ranges.every(range => {
    const line = state.doc.lineAt(range.from)
    const prefix = state.sliceDoc(line.from, range.from)
    return /\\item\s*$/.test(prefix)
  })
}

export const indentIncrease: Command = view => {
  if (minimumListDepthForSelection(view.state) < 1) {
    return false
  }
  switch (ancestorListType(view.state)) {
    case 'itemize':
      return wrapInBulletList(view)
    case 'enumerate':
      return wrapInNumberedList(view)
    case 'description':
      return wrapInDescriptionList(view)
    default:
      return false
  }
}
