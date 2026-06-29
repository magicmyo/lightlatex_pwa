import { EditorView, ViewUpdate } from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import { HunspellManager } from '@/hunspell/HunspellManager'
import { setMisspelledWords, Word } from './misspelled-words'

// LaTeX node types to exclude from spell checking
const EXCLUDED_NODE_TYPES = new Set([
  'CtrlSeq',
  'CtrlSym',
  'Comment',
  'Math',
  'MathDelimiter',
  'EnvName',
  'BeginEnv',
  'EndEnv',
])

// Match Unicode letters + apostrophes/right-single-quotes
const WORD_REGEX = /\p{L}[\p{L}’']*/gu

function shouldSkipWord(text: string): boolean {
  if (text.length < 3) return true
  if (/\d/.test(text)) return true
  if (text === text.toUpperCase()) return true
  return false
}

function getExcludedRanges(view: EditorView): Array<[number, number]> {
  const ranges: Array<[number, number]> = []
  const tree = syntaxTree(view.state)

  tree.iterate({
    enter(node) {
      const name = node.name
      // EXCLUDED_NODE_TYPES covers Comment/Math/MathDelimiter.
      // Also skip all named *CtrlSeq/*CtrlSym/*EnvName leaf tokens (grammar specializations)
      // and Begin/End (specialized from CtrlSeq) — their text is LaTeX, not English prose.
      if (
        EXCLUDED_NODE_TYPES.has(name) ||
        name.endsWith('CtrlSeq') ||
        name.endsWith('CtrlSym') ||
        name.endsWith('EnvName') ||
        name === 'Begin' ||
        name === 'End'
      ) {
        ranges.push([node.from, node.to])
        return false // skip children
      }
    },
  })

  return ranges
}

function isInExcludedRange(
  from: number,
  to: number,
  excludedRanges: Array<[number, number]>
): boolean {
  for (const [exFrom, exTo] of excludedRanges) {
    if (from < exTo && to > exFrom) return true
  }
  return false
}

export class SpellChecker {
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private destroyed = false

  constructor(private readonly hunspellManager: HunspellManager) {}

  scheduleSpellCheck(view: EditorView) {
    if (this.destroyed) return
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer)
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null
      if (!this.destroyed) {
        this.runSpellCheck(view)
      }
    }, 800)
  }

  handleUpdate(update: ViewUpdate) {
    if (this.destroyed) return
    if (update.docChanged || update.viewportChanged) {
      this.scheduleSpellCheck(update.view)
    }
  }

  private runSpellCheck(view: EditorView) {
    if (this.destroyed) return

    const docText = view.state.doc.toString()
    const docVersion = view.state.doc

    const excludedRanges = getExcludedRanges(view)

    // Tokenize words
    const wordMap = new Map<string, Word[]>() // text -> occurrences

    let match: RegExpExecArray | null
    WORD_REGEX.lastIndex = 0
    while ((match = WORD_REGEX.exec(docText)) !== null) {
      const text = match[0]
      const from = match.index
      const to = from + text.length

      if (shouldSkipWord(text)) continue
      if (isInExcludedRange(from, to, excludedRanges)) continue

      const word: Word = { text, from, to }

      if (!wordMap.has(text)) {
        wordMap.set(text, [])
      }
      wordMap.get(text)!.push(word)
    }

    // Deduplicate for spell checking
    const uniqueWords = Array.from(wordMap.keys())

    if (uniqueWords.length === 0) {
      view.dispatch({ effects: setMisspelledWords.of([]) })
      return
    }

    console.info('[spellcheck] sending %d words to worker', uniqueWords.length)
    this.hunspellManager.send(
      { type: 'spell', words: uniqueWords },
      result => {
        if (this.destroyed) return
        // Guard against stale dispatch
        if (view.state.doc !== docVersion) return
        // Guard against error
        if ('error' in result && result.error) return

        const spellResult = result as { misspellings: { index: number }[] }
        console.info('[spellcheck] received %d misspellings', spellResult.misspellings.length)
        const misspelledWords: Word[] = []

        for (const { index } of spellResult.misspellings) {
          const misspelledText = uniqueWords[index]
          const occurrences = wordMap.get(misspelledText)
          if (occurrences) {
            misspelledWords.push(...occurrences)
          }
        }

        // Sort by position for the RangeSetBuilder
        misspelledWords.sort((a, b) => a.from - b.from)

        view.dispatch({ effects: setMisspelledWords.of(misspelledWords) })
      }
    )
  }

  destroy() {
    this.destroyed = true
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
  }
}
