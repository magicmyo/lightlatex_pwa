export interface FlatSection {
  title: string
  line: number
  level: number
}

const SECTION_RE = /^\\(part|chapter|section|subsection|subsubsection|paragraph|subparagraph)\*?\{([^}]*)\}/
const LEVEL_MAP: Record<string, number> = {
  part: 2, chapter: 3, section: 4, subsection: 5, subsubsection: 6, paragraph: 7, subparagraph: 8,
}

export function extractFlatOutline(text: string): FlatSection[] {
  const items: FlatSection[] = []
  const lines = text.split('\n')
  lines.forEach((lineText, idx) => {
    const m = lineText.trim().match(SECTION_RE)
    if (m) {
      items.push({ title: m[2] || `\\${m[1]}`, line: idx + 1, level: LEVEL_MAP[m[1]] ?? 4 })
    }
  })
  return items
}
