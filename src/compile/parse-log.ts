// parse-log.ts — parse a pdfLaTeX log into structured errors and warnings.
// Mirrors the logic of the old Django latex_log.py service, keeping the same
// output shape that CompileLog.tsx and PdfToolbar.tsx already consume.

export interface LogEntry {
  line?: number
  message: string
}

export function parseLatexLog(log: string): { errors: LogEntry[]; warnings: LogEntry[] } {
  const errors: LogEntry[] = []
  const warnings: LogEntry[] = []

  const lines = log.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]

    // ── Errors: lines starting with "! " ─────────────────────────────────────
    if (l.startsWith('! ')) {
      const message = l.slice(2).trim()
      let lineNum: number | undefined
      // Look ahead for "l.<n>" to extract the line number
      for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
        const m = lines[j].match(/^l\.(\d+)/)
        if (m) { lineNum = parseInt(m[1], 10); break }
      }
      errors.push({ line: lineNum, message: message || 'Unknown error' })
      continue
    }

    // ── Warnings ──────────────────────────────────────────────────────────────
    // LaTeX Warning: / LaTeX Font Warning:
    if (/LaTeX(?: Font)? Warning:/i.test(l)) {
      const msg = l.replace(/.*LaTeX(?: Font)? Warning:\s*/i, '').trim()
      const lineM = l.match(/on input line (\d+)/)
      warnings.push({ line: lineM ? parseInt(lineM[1], 10) : undefined, message: msg })
      continue
    }

    // Package/class warnings
    if (/Package \w+ Warning:/i.test(l) || /Class \w+ Warning:/i.test(l)) {
      const msg = l.replace(/.*(?:Package|Class) \w+ Warning:\s*/i, '').trim()
      const lineM = l.match(/on input line (\d+)/)
      warnings.push({ line: lineM ? parseInt(lineM[1], 10) : undefined, message: msg })
      continue
    }

    // Overfull / Underfull hbox/vbox
    if (/^(?:Over|Under)full \\[hv]box/.test(l)) {
      const lineM = l.match(/at lines? (\d+)/)
      const lineM2 = l.match(/line (\d+)/)
      warnings.push({
        line: lineM ? parseInt(lineM[1], 10) : lineM2 ? parseInt(lineM2[1], 10) : undefined,
        message: l.trim(),
      })
      continue
    }
  }

  // Deduplicate identical messages (pdfLaTeX repeats some warnings per pass)
  const dedup = (arr: LogEntry[]) => arr.filter(
    (v, i, a) => a.findIndex(x => x.message === v.message && x.line === v.line) === i
  )
  return { errors: dedup(errors), warnings: dedup(warnings) }
}
