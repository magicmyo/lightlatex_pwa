import { WidgetType } from '@codemirror/view'

export class LaTeXWidget extends WidgetType {
  toDOM() {
    const element = document.createElement('span')
    element.classList.add('ol-cm-tex')
    const L = document.createTextNode('L')
    const a = document.createElement('sup'); a.textContent = 'a'
    const T = document.createTextNode('T')
    const e = document.createElement('sub'); e.textContent = 'e'
    const X = document.createTextNode('X')
    element.append(L, a, T, e, X)
    return element
  }

  eq() {
    return true
  }

  ignoreEvent(event: Event) {
    return event.type !== 'mousedown' && event.type !== 'mouseup'
  }

  coordsAt(element: HTMLElement) {
    return element.getBoundingClientRect()
  }
}
