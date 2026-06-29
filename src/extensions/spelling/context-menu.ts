import { EditorView, ViewPlugin } from '@codemirror/view'
import { HunspellManager } from '@/hunspell/HunspellManager'
import { getMisspelledWordAt, setMisspelledWords } from './misspelled-words'
import { api } from '../../api'

type ScheduleFn = (view: EditorView) => void

let currentMenu: HTMLElement | null = null

function dismissMenu() {
  if (currentMenu) {
    currentMenu.remove()
    currentMenu = null
  }
}

function showMenu(
  x: number,
  y: number,
  items: Array<{ label: string; action: () => void }>
) {
  dismissMenu()

  const menu = document.createElement('div')
  menu.style.cssText = [
    'position:fixed',
    `left:${x}px`,
    `top:${y}px`,
    'background:#fff',
    'border:1px solid #ccc',
    'border-radius:4px',
    'box-shadow:0 2px 8px rgba(0,0,0,0.2)',
    'font-size:13px',
    'font-family:system-ui,sans-serif',
    'z-index:9999',
    'min-width:160px',
    'padding:4px 0',
    'cursor:default',
  ].join(';')

  for (const item of items) {
    const el = document.createElement('div')
    el.textContent = item.label
    el.style.cssText = 'padding:6px 14px;white-space:nowrap;'

    el.addEventListener('mouseover', () => {
      el.style.background = '#e8eaf6'
    })
    el.addEventListener('mouseout', () => {
      el.style.background = ''
    })
    el.addEventListener('mousedown', e => {
      e.preventDefault()
      dismissMenu()
      item.action()
    })
    menu.appendChild(el)
  }

  document.body.appendChild(menu)
  currentMenu = menu

  const onMousedown = (e: MouseEvent) => {
    if (!menu.contains(e.target as Node)) {
      dismissMenu()
      document.removeEventListener('mousedown', onMousedown)
      document.removeEventListener('keydown', onKeydown)
    }
  }
  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      dismissMenu()
      document.removeEventListener('mousedown', onMousedown)
      document.removeEventListener('keydown', onKeydown)
    }
  }

  document.addEventListener('mousedown', onMousedown)
  document.addEventListener('keydown', onKeydown)
}

export function spellingContextMenu(
  hunspellManager: HunspellManager,
  scheduleSpellCheck: ScheduleFn
) {
  return [
    ViewPlugin.define(() => ({
      destroy() { dismissMenu() },
    })),
    EditorView.domEventHandlers({
    contextmenu(event, view) {
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
      if (pos === null) return false

      const word = getMisspelledWordAt(view.state, pos)
      if (!word) return false

      event.preventDefault()

      const { from, to, text } = word

      hunspellManager.send({ type: 'suggest', word: text }, result => {
        const suggestions: string[] =
          'suggestions' in result ? result.suggestions.slice(0, 8) : []

        const menuItems: Array<{ label: string; action: () => void }> = []

        if (suggestions.length > 0) {
          for (const suggestion of suggestions) {
            menuItems.push({
              label: suggestion,
              action: () => {
                view.dispatch({ changes: { from, to, insert: suggestion } })
              },
            })
          }
          menuItems.push({ label: '──────────────', action: () => {} })
        } else {
          menuItems.push({ label: '(no suggestions)', action: () => {} })
        }

        menuItems.push({
          label: 'Add to dictionary',
          action: () => {
            hunspellManager.send({ type: 'add_word', word: text }, () => {})
            api.learnWord(text) // fire-and-forget
            // Clear all underlines immediately and reschedule
            view.dispatch({ effects: setMisspelledWords.of([]) })
            scheduleSpellCheck(view)
          },
        })

        showMenu(event.clientX, event.clientY, menuItems)
      })

      return true
    },
  }),
  ]
}
