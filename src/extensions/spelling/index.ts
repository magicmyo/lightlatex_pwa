import { EditorView, ViewPlugin } from '@codemirror/view'
import { StateField } from '@codemirror/state'
import { HunspellManager } from '@/hunspell/HunspellManager'
import { misspelledWordsField } from './misspelled-words'
import { SpellChecker } from './spellchecker'
import { spellingContextMenu } from './context-menu'

type Options = {
  hunspellManager: HunspellManager
}

const spellingTheme = EditorView.baseTheme({
  '.ol-cm-spelling-error': {
    textDecorationColor: 'red',
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
    textDecorationThickness: '2px',
    textDecorationSkipInk: 'none',
    textUnderlineOffset: '0.2em',
  },
})

const spellCheckerField = (hunspellManager: HunspellManager) =>
  StateField.define<SpellChecker | null>({
    create() {
      return new SpellChecker(hunspellManager)
    },
    update(value) {
      // SpellChecker is stateless w.r.t. transactions; no update logic needed
      return value
    },
    provide(field) {
      return [
        // Destroy checker when the view is destroyed
        ViewPlugin.define(view => ({
          destroy: () => {
            view.state.field(field)?.destroy()
          },
        })),
        // Initial spell check on view creation (catches text already in the doc)
        ViewPlugin.define(view => {
          view.state.field(field)?.scheduleSpellCheck(view)
          return {}
        }),
        // Reschedule on focus
        EditorView.domEventHandlers({
          focus: (_event, view) => {
            view.state.field(field)?.scheduleSpellCheck(view)
          },
        }),
        // Reschedule on doc/viewport changes
        EditorView.updateListener.of(update => {
          update.state.field(field)?.handleUpdate(update)
        }),
      ]
    },
  })

export function spelling({ hunspellManager }: Options) {
  const checkerField = spellCheckerField(hunspellManager)

  const contextMenu = spellingContextMenu(hunspellManager, (view) => {
    // Access checker via the field to reschedule
    view.state.field(checkerField)?.scheduleSpellCheck(view)
  })

  return [
    spellingTheme,
    misspelledWordsField,
    checkerField,
    contextMenu,
  ]
}
