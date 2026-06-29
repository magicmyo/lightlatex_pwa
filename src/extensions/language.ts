import { StateEffect, Transaction } from '@codemirror/state'

// Minimal stub of Overleaf's language extension.
// Task 6: only the language-loaded effect is needed by visual.ts.
export const languageLoadedEffect = StateEffect.define<null>()

export const hasLanguageLoadedEffect = (update: {
  transactions: readonly Transaction[]
}) =>
  update.transactions.some(tr =>
    tr.effects.some(effect => effect.is(languageLoadedEffect))
  )
