// Adapted from Overleaf source-editor/hunspell/wordlists/dictionary-additions.ts
// Changed: replaced variable dynamic import (`./${lang}.txt`) — Vite cannot resolve
// variable directory imports at build time, which caused a runtime throw inside
// createSpellChecker → worker posts loadingFailed → spell-check silently dies.
// Fix: use Vite's `?raw` static import (inlined at build time, no runtime fetch).

import enUsWords from './en_US.txt?raw'

const dictionaryAdditions: Record<string, string> = {
  en_US: enUsWords,
}

export const buildAdditionalDictionary = async (
  lang: string,
  learnedWords: string[]
) => {
  const words = [...learnedWords]

  const extra = dictionaryAdditions[lang]
  if (extra) {
    words.push(...extra.split('\n').filter(Boolean))
  }

  // the first line contains the approximate word count
  words.unshift(String(words.length))

  return new TextEncoder().encode(words.join('\n'))
}
