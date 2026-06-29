import React, { useEffect, useState, useCallback, useRef } from 'react'
import * as db from '../storage/db'
import { IconDownload, IconEdit, IconCopy, IconTrash } from '../components/icons'
import JSZip from 'jszip'

interface Project extends db.Project {}

export function navigateTo(path: string) {
  if (!path.startsWith('/')) return
  history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

const EXAMPLE_LATEX = `\\documentclass[11pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{amsmath,amssymb,amsthm}
\\usepackage{booktabs}
\\usepackage[margin=1in]{geometry}

\\newtheorem{theorem}{Theorem}
\\newtheorem{lemma}{Lemma}

\\title{An Invitation to the Fibonacci Sequence}
\\author{LightLaTeX Example Project}
\\date{\\today}

\\begin{document}
\\maketitle

\\begin{abstract}
This short note introduces the Fibonacci sequence, derives its closed form, and
collects a few of its most charming identities. It also serves as a quick tour of
common \\LaTeX{} features: sectioning, displayed mathematics, tables, theorems,
cross-references, and a bibliography.
\\end{abstract}

\\tableofcontents

\\section{Introduction}
The \\emph{Fibonacci sequence} $(F_n)_{n\\ge 0}$ is defined by the recurrence
\\begin{equation}\\label{eq:rec}
  F_0 = 0,\\qquad F_1 = 1,\\qquad F_n = F_{n-1} + F_{n-2}\\quad(n\\ge 2).
\\end{equation}
Despite the simplicity of~\\eqref{eq:rec}, the sequence appears throughout
mathematics and nature, from the spirals of a sunflower head to the analysis of
algorithms~\\cite{knuth1997,graham1994}.

\\section{A Closed Form}\\label{sec:closed}
Let $\\varphi=\\tfrac{1+\\sqrt{5}}{2}$ be the golden ratio and
$\\psi=\\tfrac{1-\\sqrt{5}}{2}$ its conjugate.
Binet's formula expresses each term without recursion:
\\begin{align}
  F_n &= \\frac{\\varphi^{\\,n}-\\psi^{\\,n}}{\\sqrt{5}}, &
  \\varphi &= 1+\\frac{1}{\\varphi}.
\\end{align}

\\begin{theorem}[Binet's Formula]
For every integer $n\\ge 0$,\\; $F_n = (\\varphi^{\\,n}-\\psi^{\\,n})/\\sqrt{5}$.
\\end{theorem}
\\begin{proof}
Both $\\varphi$ and $\\psi$ satisfy $x^2=x+1$, so $\\varphi^{\\,n}$ and $\\psi^{\\,n}$
each satisfy~\\eqref{eq:rec}; so does any linear combination. Choosing coefficients
to match $F_0=0$ and $F_1=1$ gives the formula.
\\end{proof}

\\section{Small Values}
Table~\\ref{tab:fib} lists the first eight terms of the sequence.
\\begin{table}[h]
  \\centering
  \\caption{The first eight Fibonacci numbers.}\\label{tab:fib}
  \\begin{tabular}{@{}lrrrrrrrr@{}}
    \\toprule
    $n$   & 0 & 1 & 2 & 3 & 4 & 5 & 6 & 7 \\\\
    \\midrule
    $F_n$ & 0 & 1 & 1 & 2 & 3 & 5 & 8 & 13 \\\\
    \\bottomrule
  \\end{tabular}
\\end{table}

\\section{A Few Identities}
The sequence satisfies many elegant identities:
\\begin{itemize}
  \\item \\textbf{Partial sums:}
        $\\displaystyle\\sum_{i=1}^{n}F_i = F_{n+2}-1$.
  \\item \\textbf{Sum of squares:}
        $\\displaystyle\\sum_{i=1}^{n}F_i^2 = F_n\\,F_{n+1}$.
  \\item \\textbf{GCD property:}
        $\\gcd(F_m,F_n) = F_{\\gcd(m,n)}$.
\\end{itemize}

\\begin{lemma}[Cassini's Identity]
For all $n\\ge 1$,\\; $F_{n-1}F_{n+1} - F_n^2 = (-1)^n$.
\\end{lemma}

\\section{Conclusion}
Starting from the single recurrence~\\eqref{eq:rec},
Section~\\ref{sec:closed} produced a closed form,
and the identities above hint at a much richer theory.
Feel free to edit this file and make it your own!

\\begin{thebibliography}{9}
\\bibitem{knuth1997}
D.~E.~Knuth.
\\emph{The Art of Computer Programming, Vol.~1: Fundamental Algorithms}.
Addison-Wesley, 3rd edition, 1997.

\\bibitem{graham1994}
R.~L.~Graham, D.~E.~Knuth, and O.~Patashnik.
\\emph{Concrete Mathematics}.
Addison-Wesley, 2nd edition, 1994.
\\end{thebibliography}

\\end{document}
`

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
  const hours = Math.floor(minutes / 60)
  const remMinutes = minutes % 60
  if (hours < 24) {
    if (remMinutes === 0) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
    return `${hours} hour${hours !== 1 ? 's' : ''}, ${remMinutes} minute${remMinutes !== 1 ? 's' : ''} ago`
  }
  const days = Math.floor(hours / 24)
  const remHours = hours % 24
  if (days < 30) {
    if (remHours === 0) return `${days} day${days !== 1 ? 's' : ''} ago`
    return `${days} day${days !== 1 ? 's' : ''}, ${remHours} hour${remHours !== 1 ? 's' : ''} ago`
  }
  return new Date(ts).toLocaleDateString()
}

export function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([])
  const [search, setSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setProjects(await db.listProjects())
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  const handleCreateBlank = async () => {
    setDropdownOpen(false)
    const { projectId } = await db.createProject('Untitled project')
    navigateTo(`/project/${projectId}`)
  }

  const handleCreateExample = async () => {
    setDropdownOpen(false)
    const { projectId } = await db.createProject('Example Project')
    const tree = await db.buildTree(projectId)
    const mainDoc = tree.children?.find(c => c.type === 'doc' && c.name === 'main.tex')
    if (mainDoc) await db.updateDocContent(mainDoc.id, EXAMPLE_LATEX)
    navigateTo(`/project/${projectId}`)
  }

  const handleDelete = async (e: React.MouseEvent, id: number, name: string) => {
    e.stopPropagation()
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    await db.deleteProject(id)
    load()
  }

  const handleRename = async (e: React.MouseEvent, id: number, currentName: string) => {
    e.stopPropagation()
    const name = prompt('New project name:', currentName)?.trim()
    if (!name || name === currentName) return
    await db.renameProject(id, name)
    load()
  }

  const handleCopy = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation()
    const newName = `Copy of ${project.name}`
    const { projectId: newId } = await db.createProject(newName)
    const newTree = await db.buildTree(newId)
    const rootFolderId = newTree.id
    const { files: contents } = await db.getAllProjectContents(project.id)

    for (const { path, content } of contents) {
      const parts = path.split('/')
      const fileName = parts[parts.length - 1]
      if (!fileName) continue

      let parentId = rootFolderId
      if (parts.length > 1) {
        for (let i = 0; i < parts.length - 1; i++) {
          const folder = await db.createFolder(newId, parts[i], parentId)
          parentId = folder.id
        }
      }
      if (typeof content === 'string') {
        const d = await db.createDoc(newId, fileName, parentId)
        await db.updateDocContent(d.id, content)
      } else {
        await db.createFile(newId, fileName, parentId, content)
      }
    }
    load()
  }

  const handleDownload = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation()
    const zip = new JSZip()
    const { files: contents } = await db.getAllProjectContents(project.id)
    for (const { path, content } of contents) {
      zip.file(path, content as any)
    }
    const blob = await zip.generateAsync({ type: 'blob' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `${project.name}.zip`; a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError(null)
    setDropdownOpen(false)

    // Safety bounds: reject obviously malicious / pathological archives
    const ZIP_MAX_ENTRIES    = 5_000          // max files in the archive
    const ZIP_MAX_BYTES      = 100 * 1024 * 1024 // 100 MB decompressed total

    try {
      const zip  = await JSZip.loadAsync(await file.arrayBuffer())
      const name = file.name.replace(/\.zip$/i, '') || 'Imported Project'

      // Guard: entry count
      const allEntries = Object.values(zip.files).filter(e => !e.dir)
      if (allEntries.length > ZIP_MAX_ENTRIES) {
        throw new Error(`Archive contains too many files (limit: ${ZIP_MAX_ENTRIES}).`)
      }

      // Use createEmptyProject so no default "Hello world" main.tex is created
      const { projectId, rootFolderId } = await db.createEmptyProject(name)

      // Cache folder-name → folder-id as we create them
      const folderIdByPath = new Map<string, number>([['', rootFolderId]])

      // Track imported docs so we can detect the main file afterwards
      const importedDocs: Array<{ id: number; name: string; path: string; content: string }> = []

      let totalBytes = 0

      for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
        if (zipEntry.dir) continue

        // Normalize path: drop empty segments and ".." to prevent crafted
        // archives from creating tree entries with misleading names.
        const rawParts = relativePath.split('/')
        const parts = rawParts.filter(seg => seg !== '' && seg !== '..')
        const fileName = parts[parts.length - 1]
        if (!fileName) continue

        // Ensure all ancestor folders exist
        let parentId = rootFolderId
        let folderPath = ''
        for (let i = 0; i < parts.length - 1; i++) {
          const seg = parts[i]
          if (!seg) continue
          folderPath = folderPath ? `${folderPath}/${seg}` : seg
          if (folderIdByPath.has(folderPath)) {
            parentId = folderIdByPath.get(folderPath)!
          } else {
            const folder = await db.createFolder(projectId, seg, parentId)
            folderIdByPath.set(folderPath, folder.id)
            parentId = folder.id
          }
        }

        const isText = /\.(tex|bib|txt|md|cls|sty|cfg|def)$/i.test(fileName)
        if (isText) {
          const content = await zipEntry.async('string')
          totalBytes += content.length
          if (totalBytes > ZIP_MAX_BYTES) {
            throw new Error(`Archive exceeds the ${ZIP_MAX_BYTES / 1024 / 1024} MB decompressed size limit.`)
          }
          const d = await db.createDoc(projectId, fileName, parentId)
          await db.updateDocContent(d.id, content)
          if (fileName.endsWith('.tex')) {
            importedDocs.push({ id: d.id, name: fileName, path: relativePath, content })
          }
        } else {
          const data = new Uint8Array(await zipEntry.async('arraybuffer'))
          totalBytes += data.byteLength
          if (totalBytes > ZIP_MAX_BYTES) {
            throw new Error(`Archive exceeds the ${ZIP_MAX_BYTES / 1024 / 1024} MB decompressed size limit.`)
          }
          await db.createFile(projectId, fileName, parentId, data)
        }
      }

      // Auto-detect the root document:
      // 1. A .tex file that contains \documentclass (the actual entry point)
      // 2. Prefer one named "main.tex" among those matches
      // 3. Fall back to the first .tex file
      const DOCCLASS_RE = /^[^%]*\\documentclass/m
      const entryPoints = importedDocs.filter(d => DOCCLASS_RE.test(d.content))
      const rootDoc =
        entryPoints.find(d => d.name === 'main.tex') ??
        entryPoints[0] ??
        importedDocs.find(d => d.name === 'main.tex') ??
        importedDocs[0]

      if (rootDoc) {
        await db.setRootDoc(projectId, rootDoc.id)
      }

      load()
      // Navigate straight into the project
      navigateTo(`/project/${projectId}`)
    } catch (err: any) {
      setImportError('Failed to import ZIP: ' + (err?.message ?? String(err)))
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const iconBtnStyle: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '4px 6px', borderRadius: '4px', color: '#888',
    display: 'inline-flex', alignItems: 'center',
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
      {/* Sidebar */}
      <aside style={{
        width: '200px', flexShrink: 0,
        background: '#2c2f33', color: '#fff',
        display: 'flex', flexDirection: 'column',
        padding: '16px 0',
      }}>
        {/* Logo */}
        <div style={{ padding: '0 20px 20px', fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/logo.png" alt="" style={{ height: 22, width: 'auto' }} />
          <span><span style={{ color: '#1a73e8' }}>Light</span><span>LaTeX</span></span>
        </div>

        {/* New Project dropdown */}
        <div style={{ padding: '0 12px', position: 'relative' }} ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(o => !o)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 14px', background: '#1a73e8', color: '#fff',
              border: 'none', borderRadius: '4px', cursor: 'pointer',
              fontSize: '14px', fontWeight: 600,
            }}
          >
            <span>+ New Project</span>
            <span style={{ fontSize: '10px', marginLeft: '6px' }}>▼</span>
          </button>

          {dropdownOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: '12px', right: '12px',
              background: '#fff', border: '1px solid #e0e0e0',
              borderRadius: '4px', boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
              zIndex: 200, overflow: 'hidden',
            }}>
              {[
                { label: 'Blank Project', action: handleCreateBlank },
                { label: 'Example Project', action: handleCreateExample },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={item.action}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '10px 16px', background: 'none', border: 'none',
                    cursor: 'pointer', fontSize: '14px', color: '#333',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  {item.label}
                </button>
              ))}
              <label
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '10px 16px', cursor: 'pointer', fontSize: '14px', color: '#333',
                  boxSizing: 'border-box',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                Import Project (ZIP)
                <input
                  ref={fileInputRef}
                  type="file" accept=".zip"
                  style={{ display: 'none' }}
                  onChange={handleImportZip}
                />
              </label>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, background: '#fff', padding: '32px 40px', overflowY: 'auto' }}>
        <h1 style={{ margin: '0 0 20px', fontSize: '22px', fontWeight: 600, color: '#222' }}>
          All projects
        </h1>

        {importError && (
          <div style={{
            background: '#fdecea', border: '1px solid #e57373', borderRadius: '4px',
            padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#c62828',
          }}>
            {importError}
          </div>
        )}

        {/* Search */}
        <div style={{ marginBottom: '24px' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects..."
            style={{
              width: '320px', padding: '8px 12px', fontSize: '14px',
              border: '1px solid #d0d0d0', borderRadius: '4px',
              outline: 'none', color: '#333',
            }}
          />
        </div>

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '36px' }} />
            <col />
            <col style={{ width: '100px' }} />
            <col style={{ width: '200px' }} />
            <col style={{ width: '140px' }} />
          </colgroup>
          <thead>
            <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
              <th style={{ padding: '8px 10px', textAlign: 'left' }}>
                <input type="checkbox" style={{ cursor: 'pointer' }} />
              </th>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#888', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Title
              </th>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#888', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Owner
              </th>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#888', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Last Modified
              </th>
              <th style={{ padding: '8px 10px' }} />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '48px 10px', textAlign: 'center', color: '#888', fontSize: '14px' }}>
                  {search ? 'No projects match your search.' : 'No projects yet — click + New Project to get started.'}
                </td>
              </tr>
            ) : (
              filtered.map(p => (
                <tr
                  key={p.id}
                  style={{ borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }}
                  onClick={() => navigateTo(`/project/${p.id}`)}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f9')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <td style={{ padding: '12px 10px' }} onClick={e => e.stopPropagation()}>
                    <input type="checkbox" style={{ cursor: 'pointer' }} />
                  </td>
                  <td style={{ padding: '12px 10px', fontWeight: 600, color: '#1a1a1a', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </td>
                  <td style={{ padding: '12px 10px', color: '#888', fontSize: '13px' }}>
                    You
                  </td>
                  <td style={{ padding: '12px 10px', color: '#888', fontSize: '13px' }}>
                    {timeAgo(p.createdAt)}
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'right', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={e => handleDownload(e, p)}
                      style={iconBtnStyle}
                      title="Download ZIP"
                      onMouseEnter={e => (e.currentTarget.style.color = '#333')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#888')}
                    >
                      <IconDownload />
                    </button>
                    <button
                      onClick={e => handleRename(e, p.id, p.name)}
                      style={iconBtnStyle}
                      title="Rename"
                      onMouseEnter={e => (e.currentTarget.style.color = '#333')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#888')}
                    >
                      <IconEdit />
                    </button>
                    <button
                      onClick={e => handleCopy(e, p)}
                      style={iconBtnStyle}
                      title="Copy project"
                      onMouseEnter={e => (e.currentTarget.style.color = '#333')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#888')}
                    >
                      <IconCopy />
                    </button>
                    <button
                      onClick={e => handleDelete(e, p.id, p.name)}
                      style={{ ...iconBtnStyle }}
                      title="Delete"
                      onMouseEnter={e => (e.currentTarget.style.color = '#c00')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#888')}
                    >
                      <IconTrash />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </main>
    </div>
  )
}
