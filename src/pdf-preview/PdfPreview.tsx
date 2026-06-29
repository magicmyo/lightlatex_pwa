import React, {
  useEffect,
  useRef,
  useCallback,
  useState,
  useImperativeHandle,
  forwardRef,
} from 'react'
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist/types/src/display/api' // PDFDocumentProxy used for docRef lifetime management
import { TextLayer } from 'pdfjs-dist'
import { loadPdfDocumentFromUrl } from '../features/pdf-preview/util/pdf-js'

// Import pdfjs-dist text layer CSS so spans position correctly
import 'pdfjs-dist/web/pdf_viewer.css'

export interface PdfViewerHandle {
  scrollToPage: (page: number) => void
}

interface PdfPreviewProps {
  pdfUrl: string | null
  scale: number
  onNumPages: (n: number) => void
  onVisiblePageChange: (page: number) => void
  /** Called when the user clicks a text region. phrase = nearby text, page = 1-based */
  onSyncToText?: (phrase: string, page: number) => void
}

// ─── single page renderer ─────────────────────────────────────────────────────

interface PageProps {
  page: PDFPageProxy
  pageNum: number
  scale: number
  onSyncToText?: (phrase: string, page: number) => void
}

function PdfPage({ page, pageNum, scale, onSyncToText }: PageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textLayerRef = useRef<HTMLDivElement>(null)
  const renderTaskRef = useRef<{ cancel(): void } | null>(null)
  const textLayerInstanceRef = useRef<{ cancel(): void } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const textLayerDiv = textLayerRef.current
    if (!canvas || !textLayerDiv) return

    const viewport = page.getViewport({ scale })
    canvas.width = viewport.width
    canvas.height = viewport.height

    const ctx = canvas.getContext('2d')!

    // Cancel any in-flight render
    renderTaskRef.current?.cancel()
    textLayerInstanceRef.current?.cancel()
    textLayerDiv.replaceChildren()

    const renderTask = page.render({ canvasContext: ctx, viewport })
    renderTaskRef.current = renderTask

    renderTask.promise.catch(() => {})

    // Text layer
    const textLayer = new TextLayer({
      textContentSource: page.streamTextContent(),
      container: textLayerDiv,
      viewport,
    })
    textLayerInstanceRef.current = textLayer
    textLayer.render().catch(() => {})

    return () => {
      renderTaskRef.current?.cancel()
      textLayerInstanceRef.current?.cancel()
    }
  }, [page, scale])

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onSyncToText) return
      const target = e.target as HTMLElement
      const textLayerDiv = textLayerRef.current
      if (!textLayerDiv) return

      // Collect all span text items in DOM order
      const spans = Array.from(textLayerDiv.querySelectorAll('span'))
      const idx = spans.indexOf(target as HTMLSpanElement)
      if (idx === -1) {
        // Clicked on text layer background — use nothing
        return
      }

      // Build a phrase from the clicked span + 2 neighbours on each side
      const start = Math.max(0, idx - 2)
      const end = Math.min(spans.length - 1, idx + 2)
      const phrase = spans
        .slice(start, end + 1)
        .map(s => s.textContent ?? '')
        .join(' ')
        .trim()

      if (phrase) {
        onSyncToText(phrase, pageNum)
      }
    },
    [onSyncToText, pageNum]
  )

  const viewport = page.getViewport({ scale })

  return (
    <div
      style={{
        position: 'relative',
        width: viewport.width,
        height: viewport.height,
        marginBottom: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        background: '#fff',
        flexShrink: 0,
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      {/* text layer spans are positioned absolutely inside this div */}
      <div
        ref={textLayerRef}
        className="textLayer"
        onClick={handleClick}
        style={{
          position: 'absolute',
          inset: 0,
          cursor: onSyncToText ? 'crosshair' : 'text',
        }}
      />
    </div>
  )
}

// ─── main viewer component ────────────────────────────────────────────────────

export const PdfViewer = forwardRef<PdfViewerHandle, PdfPreviewProps>(
  function PdfViewer(
    { pdfUrl, scale, onNumPages, onVisiblePageChange, onSyncToText },
    ref
  ) {
    const [pages, setPages] = useState<PDFPageProxy[]>([])
    const scrollerRef = useRef<HTMLDivElement>(null)
    const pageRefs = useRef<(HTMLDivElement | null)[]>([])

    // ── load PDF ──────────────────────────────────────────────────────────────
    useEffect(() => {
      if (!pdfUrl) {
        setPages([])
        onNumPages(0)
        return
      }

      let cancelled = false
      let loadingTask: ReturnType<typeof loadPdfDocumentFromUrl> | null = null
      let docRef: PDFDocumentProxy | null = null

      ;(async () => {
        try {
          loadingTask = loadPdfDocumentFromUrl(pdfUrl)
          const doc = await loadingTask.promise
          if (cancelled) { doc.destroy(); return }
          docRef = doc
          const n = doc.numPages
          onNumPages(n)

          const loaded: PDFPageProxy[] = []
          for (let i = 1; i <= n; i++) {
            if (cancelled) break
            loaded.push(await doc.getPage(i))
          }
          if (!cancelled) {
            setPages(loaded)
            pageRefs.current = new Array(n).fill(null)
          }
        } catch {
          if (!cancelled) setPages([])
        }
      })()

      return () => {
        cancelled = true
        loadingTask?.destroy()
        docRef?.destroy()
      }
    }, [pdfUrl, onNumPages])

    // ── visible page tracking ─────────────────────────────────────────────────
    useEffect(() => {
      if (!pages.length) return
      const scroller = scrollerRef.current
      if (!scroller) return

      const observer = new IntersectionObserver(
        entries => {
          // Pick the entry with the greatest intersection ratio
          let best: IntersectionObserverEntry | null = null
          for (const entry of entries) {
            if (!best || entry.intersectionRatio > best.intersectionRatio) best = entry
          }
          if (best && best.intersectionRatio > 0) {
            const idx = pageRefs.current.indexOf(best.target as HTMLDivElement)
            if (idx !== -1) onVisiblePageChange(idx + 1)
          }
        },
        { root: scroller, threshold: [0, 0.25, 0.5, 0.75, 1.0] }
      )

      pageRefs.current.forEach(el => { if (el) observer.observe(el) })
      return () => observer.disconnect()
    }, [pages, onVisiblePageChange])

    // ── scrollToPage ──────────────────────────────────────────────────────────
    useImperativeHandle(
      ref,
      () => ({
        scrollToPage(page: number) {
          const el = pageRefs.current[page - 1]
          el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        },
      }),
      []
    )

    // ── empty state ───────────────────────────────────────────────────────────
    if (!pdfUrl) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#888',
            fontSize: '13px',
          }}
        >
          Click Recompile to generate PDF
        </div>
      )
    }

    if (!pages.length) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#888',
            fontSize: '13px',
          }}
        >
          Loading PDF…
        </div>
      )
    }

    return (
      <div
        ref={scrollerRef}
        style={{
          flex: 1,
          overflow: 'auto',
          background: '#606060',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '12px 0',
        }}
      >
        {pages.map((page, i) => (
          <div
            key={i}
            ref={el => { pageRefs.current[i] = el }}
          >
            <PdfPage
              page={page}
              pageNum={i + 1}
              scale={scale}
              onSyncToText={onSyncToText}
            />
          </div>
        ))}
      </div>
    )
  }
)
