import React, { useRef, useState, useCallback } from 'react'
import { PdfViewer, PdfViewerHandle } from './PdfPreview'
import { PdfToolbar } from './PdfToolbar'
import { useEditorContext } from '../contexts/EditorContext'

const MIN_SCALE = 0.5
const MAX_SCALE = 3.0
const SCALE_STEP = 0.25

// Normalise whitespace so PDF text-layer spans join cleanly with source lines
function normaliseWs(s: string) {
  return s.replace(/\s+/g, ' ').trim()
}

/**
 * Find the 1-based line number of the first occurrence of `phrase`
 * (after whitespace-normalisation) in `text`. Returns null if not found.
 */
function findLine(text: string, phrase: string): number | null {
  const normPhrase = normaliseWs(phrase)
  if (!normPhrase) return null

  const lines = text.split('\n')
  // Try successive window sizes: 1 line up to 4 lines joined
  for (let windowLen = 1; windowLen <= 4; windowLen++) {
    for (let i = 0; i <= lines.length - windowLen; i++) {
      const window = normaliseWs(lines.slice(i, i + windowLen).join(' '))
      if (window.includes(normPhrase) || (normPhrase.includes(window) && window.length > 15)) {
        return i + 1
      }
    }
  }

  // Fallback: search for the longest word in the phrase that is ≥ 8 chars
  const words = normPhrase.split(' ').filter(w => w.length >= 8)
  for (const word of words) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(word)) return i + 1
    }
  }

  return null
}

export function PdfPane() {
  const { compileResult, currentDoc, jumpToLine } = useEditorContext()
  const pdfUrl = compileResult?.pdf_url ?? null
  const [scale, setScale] = useState(1.5)
  const [currentPage, setCurrentPage] = useState(1)
  const [numPages, setNumPages] = useState(0)
  const viewerRef = useRef<PdfViewerHandle>(null)

  const zoomIn  = useCallback(() => { setScale(s => Math.min(MAX_SCALE, Math.round((s + SCALE_STEP) * 100) / 100)) }, [])
  const zoomOut = useCallback(() => { setScale(s => Math.max(MIN_SCALE, Math.round((s - SCALE_STEP) * 100) / 100)) }, [])
  const goToPage = useCallback((page: number) => {
    setCurrentPage(page)
    viewerRef.current?.scrollToPage(page)
  }, [])
  const handleNumPages = useCallback((n: number) => { setNumPages(n); setCurrentPage(1) }, [])

  // Reverse sync: PDF click → find phrase in source → jump to line
  const handleSyncToText = useCallback(
    (phrase: string, _page: number) => {
      if (!currentDoc) return
      const line = findLine(currentDoc.content, phrase)
      if (line !== null) {
        jumpToLine(currentDoc.id, line)
      }
    },
    [currentDoc, jumpToLine]
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <PdfToolbar
        scale={scale} currentPage={currentPage} numPages={numPages}
        onZoomIn={zoomIn} onZoomOut={zoomOut} onGoToPage={goToPage}
      />
      <PdfViewer
        ref={viewerRef}
        pdfUrl={pdfUrl} scale={scale}
        onNumPages={handleNumPages}
        onVisiblePageChange={setCurrentPage}
        onSyncToText={handleSyncToText}
      />
    </div>
  )
}
