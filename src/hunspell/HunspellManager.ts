// Adapted from Overleaf source-editor/hunspell/HunspellManager.ts
// Removed Overleaf-specific imports: getMeta, debugConsole, captureException
// Worker is instantiated via Vite's ?worker syntax in the consumer component

/* eslint-disable no-dupe-class-members */

type SpellMessage = {
  type: 'spell'
  words: string[]
}

type SuggestMessage = {
  type: 'suggest'
  word: string
}

type AddWordMessage = {
  type: 'add_word'
  word: string
}

type RemoveWordMessage = {
  type: 'remove_word'
  word: string
}

type DestroyMessage = {
  type: 'destroy'
}

type Message = { id?: string } & (
  | SpellMessage
  | SuggestMessage
  | AddWordMessage
  | RemoveWordMessage
  | DestroyMessage
)

type EmptyResult = Record<string, never>

type ErrorResult = {
  error: true
}

type SpellResult = {
  misspellings: { index: number }[]
}

type SuggestResult = {
  suggestions: string[]
}

type ResultCallback =
  | ((value: SpellResult | ErrorResult) => void)
  | ((value: SuggestResult | ErrorResult) => void)
  | ((value: EmptyResult | ErrorResult) => void)

let idCounter = 0
const generateId = () => String(++idCounter)

export class HunspellManager {
  baseAssetPath: string
  dictionariesRoot: string
  hunspellWorker: Worker
  listening = false
  loaded = false
  loadingFailed = false
  pendingMessages: Message[] = []
  callbacks: Map<string, ResultCallback> = new Map()

  constructor(
    hunspellWorker: Worker,
    private readonly language: string,
    private readonly learnedWords: string[],
    baseAssetPath?: string,
    dictionariesRoot?: string
  ) {
    this.baseAssetPath = baseAssetPath ?? window.location.origin + '/'
    this.dictionariesRoot = dictionariesRoot ?? '/hunspell/'

    this.hunspellWorker = hunspellWorker
    this.hunspellWorker.addEventListener('message', this.receive.bind(this))
  }

  destroy() {
    this.send({ type: 'destroy' }, () => {
      this.hunspellWorker.terminate()
    })
  }

  send(
    message: AddWordMessage,
    callback: (value: EmptyResult | ErrorResult) => void
  ): void

  send(
    message: RemoveWordMessage,
    callback: (value: EmptyResult | ErrorResult) => void
  ): void

  send(
    message: DestroyMessage,
    callback: (value: EmptyResult | ErrorResult) => void
  ): void

  send(
    message: SuggestMessage,
    callback: (value: SuggestResult | ErrorResult) => void
  ): void

  send(
    message: SpellMessage,
    callback: (value: SpellResult | ErrorResult) => void
  ): void

  send(message: Message, callback: ResultCallback): void {
    if (this.loadingFailed) {
      return // ignore the message
    }

    if (callback) {
      message.id = generateId()
      this.callbacks.set(message.id, callback)
    }

    if (this.listening) {
      this.hunspellWorker.postMessage(message)
    } else {
      this.pendingMessages.push(message)
    }
  }

  receive(event: MessageEvent) {
    const { id, ...rest } = event.data
    if (id) {
      const callback = this.callbacks.get(id)
      if (callback) {
        this.callbacks.delete(id)
        callback(rest)
      }
    } else if (rest.listening) {
      this.listening = true
      if (import.meta.env.DEV) console.info('[spellcheck] worker listening → posting init (lang=%s)', this.language)
      this.hunspellWorker.postMessage({
        type: 'init',
        lang: this.language,
        learnedWords: this.learnedWords,
        baseAssetPath: this.baseAssetPath,
        dictionariesRoot: this.dictionariesRoot,
      })
      for (const message of this.pendingMessages) {
        this.hunspellWorker.postMessage(message)
      }
      this.pendingMessages.length = 0
    } else if (rest.loaded) {
      this.loaded = true
      if (import.meta.env.DEV) console.info('[spellcheck] dictionaries loaded — spell check active')
    } else if (rest.loadingFailed) {
      if (import.meta.env.DEV) console.error('Spell check loading failed', rest.loadingFailed)
      this.loadingFailed = true
      this.pendingMessages.length = 0
    }
  }
}
