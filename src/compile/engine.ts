// engine.ts — singleton wrapper around SwiftLaTeX PdfTeXEngine.
//
// PdfTeXEngine.js spawns its own Web Worker ("swiftlatexpdftex.js").
// All three engine files must be in the site root (served at /):
//   public/PdfTeXEngine.js
//   public/swiftlatexpdftex.js
//   public/swiftlatexpdftex.wasm
//
// First compile of a new document fetches TeX packages from
//   texlive.swiftlatex.com (cached in IndexedDB afterwards).

import { parseLatexLog } from './parse-log'
import {
  setEnginePhase,
  updateEngineProgress,
  updatePackageProgress,
  setEngineError,
  setEngineDone,
} from './engine-status'

// Known uncompressed size of swiftlatexpdftex.wasm (bytes).
// Used as a fallback total when the server omits Content-Length, so we always
// show a real percent rather than a MB counter.
const ENGINE_WASM_APPROX_BYTES = 1_782_913

// ─── Engine types (mirrors PdfTeXEngine.js exports) ──────────────────────────

declare global {
  interface Window {
    PdfTeXEngine: new () => PdfTeXEngineInstance
  }
}

interface CompileResult {
  status: number   // 0 = success (TeX exit code)
  log: string
  pdf?: Uint8Array // present only on success
}

interface PdfTeXEngineInstance {
  loadEngine(): Promise<void>
  isReady(): boolean
  compileFormat(): Promise<void>
  compileLaTeX(): Promise<CompileResult>
  setEngineMainFile(filename: string): void
  writeMemFSFile(filename: string, content: string | Uint8Array): void
  makeMemFSFolder(folder: string): void
  flushCache(): void
  setTexliveEndpoint(url: string): void
  closeWorker(): void
}

// ─── Compile worker result (internal shape sent to api.ts) ───────────────────

export interface EngineResult {
  status: 'success' | 'error'
  pdfBytes?: Uint8Array
  log: string
  errors: Array<{ line?: number; message: string }>
  warnings: Array<{ line?: number; message: string }>
  timeMs: number
}

export interface CompileFile {
  path: string
  content: string | Uint8Array
}

// ─── Singleton state ──────────────────────────────────────────────────────────

let _engineInstance: PdfTeXEngineInstance | null = null
let _engineLoading: Promise<PdfTeXEngineInstance> | null = null
let _preloadStarted = false
let _firstCompileDone = false
let _compileInFlight = false

// Maximum ms a single pdfTeX compile pass may run before we declare it hung.
const COMPILE_TIMEOUT_MS = 120_000

/**
 * Load PdfTeXEngine.js script once into the page, then create and
 * initialise the engine. Returns the same singleton on every call.
 */
async function getEngine(): Promise<PdfTeXEngineInstance> {
  if (_engineInstance?.isReady()) return _engineInstance

  if (_engineLoading) return _engineLoading

  _engineLoading = (async () => {
    try {
      if (!window.PdfTeXEngine) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script')
          s.src = '/PdfTeXEngine.js'
          s.onload = () => resolve()
          s.onerror = () => reject(new Error('Failed to load /PdfTeXEngine.js'))
          document.head.appendChild(s)
        })
      }

      const engine = new window.PdfTeXEngine()
      await engine.loadEngine()

      // Listen for per-file package-fetch events emitted by the worker.
      // addEventListener coexists safely with PdfTeXEngine's own .onmessage assignments.
      const worker = (engine as any).latexWorker as Worker | undefined
      worker?.addEventListener('message', (ev: MessageEvent) => {
        if (ev.data?.cmd === 'pkgprogress') updatePackageProgress(ev.data.bytes ?? 0)
      })

      // Point the worker at TeXlyre's hosted TeXLive mirror.
      // texlive.swiftlatex.com (the original SwiftLaTeX CDN) no longer resolves
      // (NXDOMAIN as of 2026); texlive.texlyre.org is the maintained drop-in fork
      // with the same /pdftex/{format}/{file} path format, same fileid response
      // headers, and open CORS. The SW CacheFirst rule caches every fetched package
      // so subsequent compiles work fully offline.
      engine.setTexliveEndpoint('https://texlive.texlyre.org/')

      // Compile (or load from cache) the LaTeX format file.
      // Without this, pdfTeX can't find swiftlatexpdftex.fmt and fails immediately.
      await engine.compileFormat()
      _engineInstance = engine
      return engine
    } catch (err) {
      _engineLoading = null
      throw err
    }
  })()

  return _engineLoading
}

// ─── Preload / warm-up ────────────────────────────────────────────────────────

/**
 * Prefetch the engine WASM (for real download %) then initialise the engine
 * singleton. Idempotent — safe to call multiple times. Meant to be called on
 * app mount so the engine is ready before the first compile.
 */
const ENGINE_DOWNLOADED_KEY = 'll-engine-downloaded'

export async function preloadEngine(): Promise<void> {
  if (_preloadStarted) return
  _preloadStarted = true

  try {
    const alreadyDownloaded = !!localStorage.getItem(ENGINE_DOWNLOADED_KEY)

    if (alreadyDownloaded) {
      // ── Returning visitor: engine is in HTTP/SW cache — skip streaming ───────
      // Show a brief "Ready" state; the banner component will auto-dismiss it.
      setEnginePhase('ready')
      await getEngine()
      setEngineDone()
    } else {
      // ── First visit: stream the WASM to show real download progress ──────────
      // This also warms the browser HTTP cache so the engine worker's XHR hits
      // the cache instead of re-downloading the 1.8 MB binary.
      setEnginePhase('downloading-engine')
      try {
        const res = await fetch('/swiftlatexpdftex.wasm')
        if (res.ok && res.body) {
          // Use the known file size as a fallback so we always show a real
          // percent even when the server omits Content-Length.
          const total = Number(res.headers.get('Content-Length') ?? 0) || ENGINE_WASM_APPROX_BYTES
          const reader = res.body.getReader()
          let loaded = 0
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            loaded += (value?.byteLength ?? 0)
            updateEngineProgress(loaded, total)
          }
        }
      } catch {
        // Prefetch failed (e.g. offline first visit) — loadEngine() may still
        // succeed via service worker cache.
      }

      // ── Initialise the engine (loads script + worker + compileFormat) ────────
      setEnginePhase('preparing-engine')
      await getEngine()

      // Mark as downloaded so future visits use the fast path.
      localStorage.setItem(ENGINE_DOWNLOADED_KEY, '1')
      setEngineDone()
    }
  } catch (err) {
    // Do NOT set the localStorage flag — let the next visit retry with progress.
    setEngineError(err instanceof Error ? err.message : String(err))
  }
}

// ─── Public compile function ──────────────────────────────────────────────────

const MAX_PASSES = 3
// Signals that indicate another LaTeX pass is needed to resolve references/citations.
// Each string is checked as a substring of the compile log.
const RERUN_SIGNALS = [
  'Rerun to get cross-references right', // LaTeX kernel: unresolved labels/refs
  'Rerun to get',                        // hyperref outlines, etc.
  'Please rerun LaTeX',                  // biblatex: .bbl was written, needs another pass
  'Citation(s) may have changed',        // citation churn between passes
]

export async function compile(files: CompileFile[], preferredMain?: string): Promise<EngineResult> {
  // Guard: two overlapping compiles would corrupt the engine's shared MemFS state.
  // (The UI disables the button, but the auto-compile on mount can still race.)
  if (_compileInFlight) {
    return {
      status: 'error',
      log: 'A compile is already in progress — please wait.',
      errors: [{ message: 'Compile already in progress' }],
      warnings: [],
      timeMs: 0,
    }
  }
  _compileInFlight = true

  const start = performance.now()

  let engine: PdfTeXEngineInstance
  try {
    engine = await getEngine()
  } catch (err) {
    _compileInFlight = false
    const msg = err instanceof Error ? err.message : String(err)
    return {
      status: 'error',
      log: 'Failed to load SwiftLaTeX engine: ' + msg + '\n\nMake sure public/PdfTeXEngine.js, public/swiftlatexpdftex.js and public/swiftlatexpdftex.wasm are present.',
      errors: [{ message: 'Engine failed to load: ' + msg }],
      warnings: [],
      timeMs: performance.now() - start,
    }
  }

  // Show download-packages banner on first compile (packages fetched by worker).
  const isFirstCompile = !_firstCompileDone
  if (isFirstCompile) {
    _firstCompileDone = true
    setEnginePhase('downloading-packages')
  }

  try {
    return await _runCompile(engine, files, preferredMain, start)
  } finally {
    _compileInFlight = false
    if (isFirstCompile) {
      setEngineDone()
    }
  }
}

// SwiftLaTeX ships bibtex but not biber. Rewrite the in-memory copy of any .tex/.sty/.cls
// so that biblatex always uses backend=bibtex. The user's stored files are never touched.
function forceBibtexBackend(text: string): string {
  if (!text.includes('biblatex')) return text
  // a) explicit biber backend → bibtex (covers \usepackage options and
  //    \ExecuteBibliographyOptions{backend=biber})
  let out = text.replace(/backend\s*=\s*biber\b/gi, 'backend=bibtex')
  // b) biblatex loaded with NO backend option → inject backend=bibtex
  out = out.replace(
    /(\\(?:usepackage|RequirePackage))(\[[^\]]*\])?(\{biblatex\})/g,
    (_m, cmd: string, opts: string | undefined, pkg: string) => {
      if (opts && /backend\s*=/.test(opts)) return _m // already set
      return opts
        ? `${cmd}[backend=bibtex,${opts.slice(1, -1)}]${pkg}` // prepend to existing opts
        : `${cmd}[backend=bibtex]${pkg}`                       // no opts at all
    },
  )
  return out
}

async function _runCompile(
  engine: PdfTeXEngineInstance,
  files: CompileFile[],
  preferredMain: string | undefined,
  start: number,
): Promise<EngineResult> {
  // Determine the main .tex file.
  // Priority: caller-supplied root doc (from project.rootDocId) > main.tex > first .tex
  const mainFile =
    (preferredMain && files.find(f => f.path === preferredMain)?.path) ??
    files.find(f => f.path === 'main.tex')?.path ??
    files.find(f => f.path.endsWith('.tex'))?.path

  if (!mainFile) {
    return {
      status: 'error',
      log: 'No .tex file found in project.',
      errors: [{ message: 'No .tex file found in project.' }],
      warnings: [],
      timeMs: performance.now() - start,
    }
  }

  // ── Load all project files into the engine's virtual FS ────────────────────
  // First pass: flush everything from the previous compile
  engine.flushCache()

  // Create all necessary parent folders (deduplicated)
  const folders = new Set<string>()
  for (const { path } of files) {
    const parts = path.split('/')
    for (let i = 1; i < parts.length; i++) {
      folders.add(parts.slice(0, i).join('/'))
    }
  }
  for (const folder of folders) {
    engine.makeMemFSFolder(folder)
  }

  // Write files, forcing bibtex backend for any biblatex LaTeX source (in-memory only).
  let didForceBibtex = false
  for (const { path, content } of files) {
    let toWrite: string | Uint8Array = content
    if (typeof content === 'string' && /\.(tex|sty|cls|ltx)$/i.test(path)) {
      toWrite = forceBibtexBackend(content)
      if (toWrite !== content) didForceBibtex = true
    }
    engine.writeMemFSFile(path, toWrite)
  }

  engine.setEngineMainFile(mainFile)

  // ── Multi-pass compile ────────────────────────────────────────────────────
  // We do NOT flush between passes so .aux / .toc survive.
  // We DO re-write the source files each pass (they are user-modified content).
  let lastResult: CompileResult | null = null

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    try {
      // Race the compile against a hard timeout. The pdfTeX worker uses synchronous
      // XHR to fetch CTAN packages — a slow/offline network can stall it forever.
      // On timeout we reset the engine so the next compile starts clean.
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(
          `Compile timed out after ${COMPILE_TIMEOUT_MS / 1000}s. ` +
          'The engine may be waiting for a network package — check your connection and try again.'
        )), COMPILE_TIMEOUT_MS)
      )
      lastResult = await Promise.race([engine.compileLaTeX(), timeoutPromise])
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      // Discard the broken/hung engine singleton — next compile will build a fresh one.
      try { _engineInstance?.closeWorker() } catch { /* ignore */ }
      _engineInstance = null
      _engineLoading = null
      return {
        status: 'error',
        log: `Engine error on pass ${pass + 1}: ${msg}`,
        errors: [{ message: `Engine error: ${msg}` }],
        warnings: [],
        timeMs: performance.now() - start,
      }
    }

    // Stop early if no more passes are needed
    if (!RERUN_SIGNALS.some(s => lastResult!.log.includes(s))) break
  }

  const result = lastResult!
  const success = result.pdf !== undefined

  // Re-write user files before next compile without re-flushing
  // (engine.flushCache() would also wipe .aux — we skip it between passes above)

  const { errors, warnings } = parseLatexLog(result.log)

  // If we rewrote the backend, tell the user so the behaviour is transparent.
  if (didForceBibtex) {
    warnings.unshift({
      message:
        'biber is unavailable in the browser — your bibliography was compiled with ' +
        'bibtex instead. Most references render correctly; some advanced biblatex ' +
        'features (sorting, certain styles) may differ from a full biber build.',
    })
  }
  // Safety net: if biber is still requested after rewriting (e.g. set inside a .bib or
  // via \ExecuteBibliographyOptions in a .sty we missed), surface a clear warning.
  if (/run Biber on the file|Please \(re\)run Biber/i.test(result.log)) {
    warnings.unshift({
      message:
        'Bibliography empty — the biber backend is unavailable in the browser. ' +
        'Add backend=bibtex to your \\usepackage[...]{biblatex} options and recompile.',
    })
  }

  return {
    status: success ? 'success' : 'error',
    pdfBytes: result.pdf,
    log: result.log,
    errors: success ? errors : (errors.length ? errors : [{ message: 'Compilation failed. See log for details.' }]),
    warnings,
    timeMs: performance.now() - start,
  }
}
