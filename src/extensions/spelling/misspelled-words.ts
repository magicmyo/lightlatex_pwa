import { StateEffect, StateField, RangeSetBuilder, EditorState } from '@codemirror/state'
import { Decoration, DecorationSet, EditorView } from '@codemirror/view'

export type Word = {
  text: string
  from: number
  to: number
}

export const setMisspelledWords = StateEffect.define<Word[]>()

export const misspelledWordsField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none
  },
  update(decorations, tr) {
    // Map existing decorations through document changes
    decorations = decorations.map(tr.changes)

    // Rebuild if we received new misspelled words
    for (const effect of tr.effects) {
      if (effect.is(setMisspelledWords)) {
        const words = effect.value
        const builder = new RangeSetBuilder<Decoration>()

        // Words must be sorted by position for RangeSetBuilder
        const sorted = [...words].sort((a, b) => a.from - b.from)

        for (const word of sorted) {
          builder.add(
            word.from,
            word.to,
            Decoration.mark({
              class: 'ol-cm-spelling-error',
              word,
            })
          )
        }

        decorations = builder.finish()
      }
    }

    return decorations
  },
  provide(field) {
    return EditorView.decorations.from(field)
  },
})

/**
 * Returns the misspelled word at a given position, or null if none.
 */
export function getMisspelledWordAt(state: EditorState, pos: number): Word | null {
  const decorations = state.field(misspelledWordsField)
  let found: Word | null = null

  decorations.between(pos, pos, (_from, _to, deco) => {
    const word = (deco.spec as { word?: Word }).word
    if (word) {
      found = word
      return false // stop iteration
    }
  })

  return found
}
