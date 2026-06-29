import * as PDFJS from 'pdfjs-dist'
import type { DocumentInitParameters } from 'pdfjs-dist/types/src/display/api'

// Task 6: minimal port of Overleaf's pdf-js helper, used by the visual
// editor's graphics widget to render PDF figure previews. Worker is wired up
// the Vite way (URL import) and the various Overleaf asset paths are dropped
// for now (defaults are fine for basic rendering).
export { PDFJS }

PDFJS.GlobalWorkerOptions.workerPort = new Worker(
  new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url),
  { type: 'module' }
)

export const imageResourcesPath = '/images/pdfjs-dist/'

export const loadPdfDocumentFromUrl = (
  url: string,
  options: Partial<DocumentInitParameters> = {}
) =>
  PDFJS.getDocument({
    url,
    disableAutoFetch: true, // only fetch the data needed for the displayed pages
    isEvalSupported: false,
    enableXfa: false,
    ...options,
  })
