// Local storage implementation of the LightLaTeX API.
// Identical interface to lightlatex/frontend/src/api.ts; no HTTP calls.

import * as db from './storage/db'
import { cacheFileBlobUrl, revokeCachedBlobUrl, getCachedFileBlobUrl } from './utils/preview-path'
import { compile as engineCompile } from './compile/engine'

// ─── PDF blob URL ─────────────────────────────────────────────────────────────

let _currentPdfUrl: string | null = null

// ─── Bundled packages (not on the public TeX Live mirror) ────────────────────
// Fetched once from /bundled-packages/ and injected into every compile so
// pdfTeX finds them in the working directory. Project files take priority —
// if the project already has a file with the same name, we skip it.

const BUNDLED_PKGS = ['llncs.cls']
const _bundledCache = new Map<string, string>()

async function getBundledFiles(): Promise<Array<{ path: string; content: string }>> {
  const out: Array<{ path: string; content: string }> = []
  for (const name of BUNDLED_PKGS) {
    if (!_bundledCache.has(name)) {
      try {
        const text = await fetch(`/bundled-packages/${name}`).then(r => r.text())
        _bundledCache.set(name, text)
      } catch { /* skip if offline and not yet SW-cached */ }
    }
    const content = _bundledCache.get(name)
    if (content) out.push({ path: name, content })
  }
  return out
}

// ─── Blob URL cache for file preview ────────────────────────────────────────

function mimeForName(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf')  return 'application/pdf'
  if (ext === 'svg')  return 'image/svg+xml'
  if (ext === 'png')  return 'image/png'
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'gif')  return 'image/gif'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'bmp')  return 'image/bmp'
  return 'application/octet-stream'
}

async function refreshFileBlobUrls(projectId: number) {
  const tree = await db.buildTree(projectId)
  await _loadBlobUrlsFromNode(tree)
}

async function _loadBlobUrlsFromNode(node: db.TreeNode) {
  if (node.type === 'file') {
    try {
      const blob = await db.readOpfsBlob(node.id)
      const url = URL.createObjectURL(new Blob([blob.buffer as ArrayBuffer], { type: mimeForName(node.name) }))
      cacheFileBlobUrl(node.id, url)
    } catch { /* file may not exist in OPFS */ }
  }
  for (const child of node.children ?? []) await _loadBlobUrlsFromNode(child)
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const api = {
  async getTree(projectId: number) {
    const tree = await db.buildTree(projectId)
    // Pre-cache blob URLs for inline image preview in Visual Editor
    await refreshFileBlobUrls(projectId)
    return tree
  },

  async getDoc(projectId: number, docId: number) {
    const doc = await db.getDoc(docId)
    if (!doc) throw new Error(`Doc ${docId} not found`)
    return { id: doc.id, name: doc.name, content: doc.content, rev: doc.rev }
  },

  /** Return a blob URL for a binary file (cache-first; falls back to OPFS read). */
  async getFileUrl(fileId: number, name: string): Promise<string> {
    const cached = getCachedFileBlobUrl(fileId)
    if (cached) return cached
    const bytes = await db.readOpfsBlob(fileId)
    const url = URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: mimeForName(name) }))
    cacheFileBlobUrl(fileId, url)
    return url
  },

  async saveDoc(projectId: number, docId: number, content: string) {
    const rev = await db.updateDocContent(docId, content)
    return { rev }
  },

  async compile(projectId: number, mainDocId?: number) {
    const { files, mainPath } = await db.getAllProjectContents(projectId, mainDocId)
    // Inject bundled packages that aren't already in the project
    const projectPaths = new Set(files.map(f => f.path))
    for (const pkg of await getBundledFiles()) {
      if (!projectPaths.has(pkg.path)) files.push(pkg)
    }
    const result = await engineCompile(files, mainPath ?? undefined)

    // Revoke old PDF blob URL
    if (_currentPdfUrl) { URL.revokeObjectURL(_currentPdfUrl); _currentPdfUrl = null }

    if (result.status === 'success' && result.pdfBytes?.length) {
      _currentPdfUrl = URL.createObjectURL(
        new Blob([result.pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
      )
    }

    return {
      status:          result.status,
      pdf_url:         _currentPdfUrl,
      errors:          result.errors,
      warnings:        result.warnings,
      raw_log:         result.log,
      compile_time_ms: result.timeMs,
    }
  },

  async createFolder(projectId: number, name: string, parentId?: number) {
    if (!parentId) throw new Error('parentId required for createFolder')
    const f = await db.createFolder(projectId, name, parentId)
    return { id: f.id, name: f.name, type: 'folder', parentId: f.parentId }
  },

  async createDoc(projectId: number, name: string, parentId?: number) {
    if (!parentId) throw new Error('parentId required for createDoc')
    const d = await db.createDoc(projectId, name, parentId)
    return { id: d.id, name: d.name, type: 'doc', parentId: d.parentId }
  },

  async uploadFile(projectId: number, file: File, parentId?: number) {
    if (!parentId) throw new Error('parentId required for uploadFile')
    const data = new Uint8Array(await file.arrayBuffer())
    const fi   = await db.createFile(projectId, file.name, parentId, data)
    // Cache blob URL immediately for Visual Editor preview
    const url  = URL.createObjectURL(new Blob([data.buffer as ArrayBuffer], { type: file.type }))
    cacheFileBlobUrl(fi.id, url)
    return { id: fi.id, name: fi.name, type: 'file', parentId: fi.parentId }
  },

  async renameEntity(projectId: number, type: string, id: number, name: string) {
    if (type === 'folder') await db.renameFolder(id, name)
    else if (type === 'doc')  await db.renameDoc(id, name)
    else if (type === 'file') await db.renameFile(id, name)
    return { success: true }
  },

  async moveEntity(projectId: number, type: string, id: number, parentId: number) {
    if (type === 'folder') await db.moveFolder(id, parentId)
    else if (type === 'doc')  await db.moveDoc(id, parentId)
    else if (type === 'file') await db.moveFile(id, parentId)
    return { success: true }
  },

  async deleteEntity(projectId: number, type: string, id: number) {
    if (type === 'folder') await db.deleteFolder(id)
    else if (type === 'doc')  await db.deleteDoc(id)
    else if (type === 'file') { revokeCachedBlobUrl(id); await db.deleteFile(id) }
    return { success: true }
  },

  async duplicateEntity(projectId: number, type: string, id: number) {
    if (type === 'doc') {
      const d = await db.duplicateDoc(id)
      return { id: d.id, name: d.name, type: 'doc' }
    }
    if (type === 'file') {
      const f = await db.duplicateFile(id)
      try {
        const blob = await db.readOpfsBlob(f.id)
        const url  = URL.createObjectURL(new Blob([blob.buffer as ArrayBuffer]))
        cacheFileBlobUrl(f.id, url)
      } catch { /* ignore */ }
      return { id: f.id, name: f.name, type: 'file' }
    }
    throw new Error('Cannot duplicate folder')
  },

  async setRootDoc(projectId: number, docId: number) {
    await db.setRootDoc(projectId, docId)
    return { success: true }
  },

  learnWord: async (word: string) => {
    const words: string[] = JSON.parse(localStorage.getItem('ll-learned-words') ?? '[]')
    if (!words.includes(word)) {
      words.push(word)
      localStorage.setItem('ll-learned-words', JSON.stringify(words))
    }
  },

  unlearnWord: async (word: string) => {
    const words: string[] = JSON.parse(localStorage.getItem('ll-learned-words') ?? '[]')
    localStorage.setItem('ll-learned-words', JSON.stringify(words.filter((w: string) => w !== word)))
  },

  getLearnedWords: async (): Promise<string[]> => {
    return JSON.parse(localStorage.getItem('ll-learned-words') ?? '[]')
  },
}
