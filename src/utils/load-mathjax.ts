// MathJax loader for LightLaTeX.
// Loads MathJax from a CDN URL (or a <meta name="mathjax-path"> override).
// The promise is cached so MathJax is only loaded once per page.

let mathJaxPromise: Promise<typeof window.MathJax> | null = null

export const loadMathJax = async (_options?: {
  enableMenu?: boolean
  numbering?: string
  singleDollar?: boolean
  useLabelIds?: boolean
}) => {
  if (!mathJaxPromise) {
    mathJaxPromise = new Promise((resolve, reject) => {
      window.MathJax = {
        tex: {
          inlineMath: [['\\(', '\\)'], ['$', '$']],
          displayMath: [['\\[', '\\]'], ['$$', '$$']],
          processEscapes: true,
          processEnvironments: true,
        },
        options: {
          enableMenu: false,
        },
        startup: {
          typeset: false,
        },
      } as any

      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js'
      script.integrity = 'sha384-KKWa9jJ1MZvssLeOoXG6FiOAZfAgmzsIIfw8BXwI9+kYm0lPCbC6yTQPBC00F1/L'
      script.crossOrigin = 'anonymous'
      script.async = true
      script.addEventListener('load', async () => {
        await window.MathJax.startup.promise
        resolve(window.MathJax)
      })
      script.addEventListener('error', reject)
      document.head.appendChild(script)
    })
  }
  return mathJaxPromise
}
