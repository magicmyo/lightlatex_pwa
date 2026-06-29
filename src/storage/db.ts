// IndexedDB storage layer for LightLaTeX Offline.
// Stores projects, folders, docs, and file metadata (blobs live in OPFS).

export interface Project { id: number; name: string; rootDocId: number | null; createdAt: number }
export interface Folder  { id: number; projectId: number; parentId: number | null; name: string }
export interface Doc     { id: number; projectId: number; parentId: number; name: string; content: string; rev: number }
export interface FileItem{ id: number; projectId: number; parentId: number; name: string }

export interface TreeNode {
  id: number
  name: string
  type: 'folder' | 'doc' | 'file'
  children?: TreeNode[]
}

const DB_NAME = 'lightlatex-offline'
const DB_VERSION = 1

const DEFAULT_LATEX = `\\documentclass{article}
\\usepackage[utf8]{inputenc}

\\begin{document}

Hello, world! Start editing here.

\\end{document}
`

// Wrap an IDB request in a Promise
function r<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror  = () => reject(req.error)
  })
}

let _db: IDBDatabase | null = null
let _persistRequested = false
function openDb(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db)

  // Request persistent storage once so the browser is less likely to evict user data.
  // This is the user's only copy — eviction without warning = total data loss.
  if (!_persistRequested && navigator.storage?.persist) {
    _persistRequested = true
    navigator.storage.persist().catch(() => { /* best-effort; failure is silent */ })
  }

  return new Promise((resolve, reject) => {
    let req: IDBOpenDBRequest
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION)
    } catch {
      // indexedDB.open() can throw synchronously in some private-browsing modes.
      reject(new Error(
        'IndexedDB is unavailable in this browser or mode. ' +
        'LightLaTeX requires IndexedDB to store your projects. ' +
        'Try a non-private/incognito window.'
      ))
      return
    }

    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains('folders')) {
        db.createObjectStore('folders', { keyPath: 'id', autoIncrement: true })
          .createIndex('projectId', 'projectId')
      }
      if (!db.objectStoreNames.contains('docs')) {
        db.createObjectStore('docs', { keyPath: 'id', autoIncrement: true })
          .createIndex('projectId', 'projectId')
      }
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files', { keyPath: 'id', autoIncrement: true })
          .createIndex('projectId', 'projectId')
      }
    }
    req.onsuccess = () => {
      _db = req.result
      // If another tab upgrades the DB version, close our stale connection gracefully
      // so the upgrade can proceed without hanging on the `onblocked` event.
      _db.onversionchange = () => {
        _db?.close()
        _db = null
        console.warn('[db] Another tab triggered a DB schema upgrade — reloading.')
        window.location.reload()
      }
      resolve(req.result)
    }
    req.onerror  = () => reject(req.error)
    // Fired when this open() is blocked by another tab holding the DB at an older version.
    req.onblocked = () => {
      console.warn('[db] DB upgrade blocked — please close other LightLaTeX tabs and reload.')
    }
  })
}

// ─── OPFS helpers ────────────────────────────────────────────────────────────

function assertOpfsAvailable(): void {
  if (typeof navigator === 'undefined' || !navigator.storage?.getDirectory) {
    throw new Error(
      'Origin Private File System (OPFS) is not available in this browser. ' +
      'Binary file storage (images, uploads) requires a modern Chromium-based ' +
      'browser or Firefox 111+. Text documents and projects still work.'
    )
  }
}

async function opfsDir(): Promise<FileSystemDirectoryHandle> {
  assertOpfsAvailable()
  const root = await navigator.storage.getDirectory()
  return root.getDirectoryHandle('project_files', { create: true })
}

export async function writeOpfsBlob(fileId: number, data: Uint8Array): Promise<void> {
  const dir = await opfsDir()
  const fh  = await dir.getFileHandle(`${fileId}.bin`, { create: true })
  let w: FileSystemWritableFileStream
  try {
    w = await fh.createWritable()
  } catch (err: any) {
    if (err?.name === 'QuotaExceededError') {
      throw new Error('Browser storage is full. Export and delete projects to free up space.')
    }
    throw err
  }
  try {
    await w.write(data as unknown as FileSystemWriteChunkType)
    await w.close()
  } catch (err: any) {
    try { await w.close() } catch { /* ignore close error */ }
    if (err?.name === 'QuotaExceededError') {
      throw new Error('Browser storage is full. Export and delete projects to free up space.')
    }
    throw err
  }
}

export async function readOpfsBlob(fileId: number): Promise<Uint8Array> {
  const dir = await opfsDir()
  const fh  = await dir.getFileHandle(`${fileId}.bin`)
  const f   = await fh.getFile()
  return new Uint8Array(await f.arrayBuffer())
}

async function deleteOpfsBlob(fileId: number): Promise<void> {
  try {
    const dir = await opfsDir()
    await dir.removeEntry(`${fileId}.bin`)
  } catch { /* ignore if not found */ }
}

// ─── Project operations ──────────────────────────────────────────────────────

export async function listProjects(): Promise<Project[]> {
  const db = await openDb()
  const projects: Project[] = await r(db.transaction('projects', 'readonly').objectStore('projects').getAll())
  return projects.sort((a, b) => b.createdAt - a.createdAt)
}

export async function getProject(id: number): Promise<Project | undefined> {
  const db = await openDb()
  return r(db.transaction('projects', 'readonly').objectStore('projects').get(id))
}

export async function createProject(name: string): Promise<{ projectId: number; rootDocId: number }> {
  const db  = await openDb()
  const now = Date.now()
  const tx  = db.transaction(['projects', 'folders', 'docs'], 'readwrite')

  const ps = tx.objectStore('projects')
  const fs = tx.objectStore('folders')
  const ds = tx.objectStore('docs')

  const projectId = await r(ps.add({ name, rootDocId: null, createdAt: now })) as number
  const folderId  = await r(fs.add({ projectId, parentId: null, name })) as number
  const docId     = await r(ds.add({ projectId, parentId: folderId, name: 'main.tex', content: DEFAULT_LATEX, rev: 1 })) as number

  await r(ps.put({ id: projectId, name, rootDocId: docId, createdAt: now }))

  await new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error) })

  return { projectId, rootDocId: docId }
}

/** Like createProject but creates no default doc — used for ZIP imports where
 *  the real files are supplied by the caller. */
export async function createEmptyProject(name: string): Promise<{ projectId: number; rootFolderId: number }> {
  const db  = await openDb()
  const now = Date.now()
  const tx  = db.transaction(['projects', 'folders'], 'readwrite')

  const projectId   = await r(tx.objectStore('projects').add({ name, rootDocId: null, createdAt: now })) as number
  const rootFolderId = await r(tx.objectStore('folders').add({ projectId, parentId: null, name })) as number

  await new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error) })

  return { projectId, rootFolderId }
}

export async function renameProject(id: number, name: string): Promise<void> {
  const db  = await openDb()
  const p   = await r<Project>(db.transaction('projects', 'readonly').objectStore('projects').get(id))
  if (!p) return
  await r(db.transaction('projects', 'readwrite').objectStore('projects').put({ ...p, name }))
}

export async function deleteProject(id: number): Promise<void> {
  const db  = await openDb()
  const tx  = db.transaction(['projects', 'folders', 'docs', 'files'], 'readwrite')

  const fileItems: FileItem[] = await r(tx.objectStore('files').index('projectId').getAll(id))
  const folders:   Folder[]   = await r(tx.objectStore('folders').index('projectId').getAll(id))
  const docs:      Doc[]      = await r(tx.objectStore('docs').index('projectId').getAll(id))

  await r(tx.objectStore('projects').delete(id))
  for (const f of folders)   await r(tx.objectStore('folders').delete(f.id))
  for (const d of docs)      await r(tx.objectStore('docs').delete(d.id))
  for (const f of fileItems) await r(tx.objectStore('files').delete(f.id))

  await new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error) })

  for (const f of fileItems) await deleteOpfsBlob(f.id)
}

// ─── Folder operations ───────────────────────────────────────────────────────

export async function createFolder(projectId: number, name: string, parentId: number): Promise<Folder> {
  const db = await openDb()
  const id = await r(db.transaction('folders', 'readwrite').objectStore('folders').add({ projectId, parentId, name })) as number
  return { id, projectId, parentId, name }
}

export async function renameFolder(id: number, name: string): Promise<void> {
  const db = await openDb()
  const f  = await r<Folder>(db.transaction('folders', 'readonly').objectStore('folders').get(id))
  if (!f) return
  await r(db.transaction('folders', 'readwrite').objectStore('folders').put({ ...f, name }))
}

export async function moveFolder(id: number, parentId: number): Promise<void> {
  const db = await openDb()
  const f  = await r<Folder>(db.transaction('folders', 'readonly').objectStore('folders').get(id))
  if (!f) return
  await r(db.transaction('folders', 'readwrite').objectStore('folders').put({ ...f, parentId }))
}

export async function deleteFolder(id: number): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(['folders', 'docs', 'files'], 'readwrite')

  // Recursively collect descendants
  const allFolders: Folder[] = await r(tx.objectStore('folders').getAll())
  const allDocs:    Doc[]    = await r(tx.objectStore('docs').getAll())
  const allFiles:   FileItem[]= await r(tx.objectStore('files').getAll())

  const foldersToDelete = new Set<number>()
  const queue = [id]
  while (queue.length) {
    const fid = queue.pop()!
    foldersToDelete.add(fid)
    for (const f of allFolders) if (f.parentId === fid) queue.push(f.id)
  }

  const filesToDelete: FileItem[] = []
  for (const fid of foldersToDelete) await r(tx.objectStore('folders').delete(fid))
  for (const d of allDocs)   if (foldersToDelete.has(d.parentId)) await r(tx.objectStore('docs').delete(d.id))
  for (const f of allFiles)  if (foldersToDelete.has(f.parentId)) { filesToDelete.push(f); await r(tx.objectStore('files').delete(f.id)) }

  await new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error) })
  for (const f of filesToDelete) await deleteOpfsBlob(f.id)
}

// ─── Doc operations ──────────────────────────────────────────────────────────

export async function createDoc(projectId: number, name: string, parentId: number): Promise<Doc> {
  const db  = await openDb()
  const doc = { projectId, parentId, name, content: '', rev: 1 }
  const id = await r(db.transaction('docs', 'readwrite').objectStore('docs').add(doc)) as number
  return { id, ...doc }
}

export async function getDoc(id: number): Promise<Doc | undefined> {
  const db = await openDb()
  return r(db.transaction('docs', 'readonly').objectStore('docs').get(id))
}

export async function updateDocContent(id: number, content: string): Promise<number> {
  const db  = await openDb()
  const doc = await r<Doc>(db.transaction('docs', 'readonly').objectStore('docs').get(id))
  if (!doc) throw new Error(`Doc ${id} not found`)
  const rev = doc.rev + 1
  await r(db.transaction('docs', 'readwrite').objectStore('docs').put({ ...doc, content, rev }))
  return rev
}

export async function renameDoc(id: number, name: string): Promise<void> {
  const db  = await openDb()
  const doc = await r<Doc>(db.transaction('docs', 'readonly').objectStore('docs').get(id))
  if (!doc) return
  await r(db.transaction('docs', 'readwrite').objectStore('docs').put({ ...doc, name }))
}

export async function moveDoc(id: number, parentId: number): Promise<void> {
  const db  = await openDb()
  const doc = await r<Doc>(db.transaction('docs', 'readonly').objectStore('docs').get(id))
  if (!doc) return
  await r(db.transaction('docs', 'readwrite').objectStore('docs').put({ ...doc, parentId }))
}

export async function duplicateDoc(id: number): Promise<Doc> {
  const db  = await openDb()
  const doc = await r<Doc>(db.transaction('docs', 'readonly').objectStore('docs').get(id))
  if (!doc) throw new Error(`Doc ${id} not found`)
  const copy = { ...doc, name: 'Copy of ' + doc.name, rev: 1 }
  delete (copy as any).id
  const newId = await r(db.transaction('docs', 'readwrite').objectStore('docs').add(copy)) as number
  return { ...copy, id: newId }
}

export async function deleteDoc(id: number): Promise<void> {
  const db = await openDb()
  await r(db.transaction('docs', 'readwrite').objectStore('docs').delete(id))
}

export async function setRootDoc(projectId: number, docId: number): Promise<void> {
  const db = await openDb()
  const p  = await r<Project>(db.transaction('projects', 'readonly').objectStore('projects').get(projectId))
  if (!p) return
  await r(db.transaction('projects', 'readwrite').objectStore('projects').put({ ...p, rootDocId: docId }))
}

// ─── File operations ─────────────────────────────────────────────────────────

export async function createFile(projectId: number, name: string, parentId: number, data: Uint8Array): Promise<FileItem> {
  const db   = await openDb()
  const meta = { projectId, parentId, name }
  const id = await r(db.transaction('files', 'readwrite').objectStore('files').add(meta)) as number
  await writeOpfsBlob(id, data)
  return { id, ...meta }
}

export async function getFileItem(id: number): Promise<FileItem | undefined> {
  const db = await openDb()
  return r(db.transaction('files', 'readonly').objectStore('files').get(id))
}

export async function renameFile(id: number, name: string): Promise<void> {
  const db = await openDb()
  const f  = await r<FileItem>(db.transaction('files', 'readonly').objectStore('files').get(id))
  if (!f) return
  await r(db.transaction('files', 'readwrite').objectStore('files').put({ ...f, name }))
}

export async function moveFile(id: number, parentId: number): Promise<void> {
  const db = await openDb()
  const f  = await r<FileItem>(db.transaction('files', 'readonly').objectStore('files').get(id))
  if (!f) return
  await r(db.transaction('files', 'readwrite').objectStore('files').put({ ...f, parentId }))
}

export async function duplicateFile(id: number): Promise<FileItem> {
  const db   = await openDb()
  const f    = await r<FileItem>(db.transaction('files', 'readonly').objectStore('files').get(id))
  if (!f) throw new Error(`File ${id} not found`)
  const blob = await readOpfsBlob(id)
  return createFile(f.projectId, 'Copy of ' + f.name, f.parentId, blob)
}

export async function deleteFile(id: number): Promise<void> {
  const db = await openDb()
  await r(db.transaction('files', 'readwrite').objectStore('files').delete(id))
  await deleteOpfsBlob(id)
}

// ─── Tree builder ────────────────────────────────────────────────────────────

export async function buildTree(projectId: number): Promise<TreeNode> {
  const db      = await openDb()
  const tx      = db.transaction(['folders', 'docs', 'files'], 'readonly')
  const folders: Folder[]    = await r(tx.objectStore('folders').index('projectId').getAll(projectId))
  const docs:    Doc[]       = await r(tx.objectStore('docs').index('projectId').getAll(projectId))
  const files:   FileItem[]  = await r(tx.objectStore('files').index('projectId').getAll(projectId))

  const root = folders.find(f => f.parentId === null)
  if (!root) throw new Error('Root folder not found for project ' + projectId)

  function buildNode(folder: Folder): TreeNode {
    const children: TreeNode[] = []
    for (const f of folders) if (f.parentId === folder.id) children.push(buildNode(f))
    for (const d of docs)    if (d.parentId === folder.id)  children.push({ id: d.id, name: d.name, type: 'doc' })
    for (const f of files)   if (f.parentId === folder.id)  children.push({ id: f.id, name: f.name, type: 'file' })
    return { id: folder.id, name: folder.name, type: 'folder', children }
  }

  return buildNode(root)
}

// ─── Compile: gather all project source files ────────────────────────────────

export interface ProjectContents {
  files: Array<{ path: string; content: string | Uint8Array }>
  /** Path of the root document (e.g. "main.tex" or "paper/SelfAdaptiveLLM.tex").
   *  Null when no rootDocId is set or the doc is not found. */
  mainPath: string | null
}

export async function getAllProjectContents(projectId: number, preferredDocId?: number): Promise<ProjectContents> {
  const db      = await openDb()
  const project = await r<Project>(db.transaction('projects', 'readonly').objectStore('projects').get(projectId))
  const tx      = db.transaction(['folders', 'docs', 'files'], 'readonly')
  const folders: Folder[]   = await r(tx.objectStore('folders').index('projectId').getAll(projectId))
  const docs:    Doc[]      = await r(tx.objectStore('docs').index('projectId').getAll(projectId))
  const files:   FileItem[] = await r(tx.objectStore('files').index('projectId').getAll(projectId))

  // Build a map of folder id → path
  const root     = folders.find(f => f.parentId === null)!
  const idToPath = new Map<number, string>([[root.id, '']])
  let changed = true
  while (changed) {
    changed = false
    for (const f of folders) {
      if (!idToPath.has(f.id) && f.parentId !== null && idToPath.has(f.parentId)) {
        idToPath.set(f.id, idToPath.get(f.parentId)! + (idToPath.get(f.parentId) ? '/' : '') + f.name)
        changed = true
      }
    }
  }

  const result: Array<{ path: string; content: string | Uint8Array }> = []
  const docPathById = new Map<number, string>()

  for (const d of docs) {
    const dir  = idToPath.get(d.parentId) ?? ''
    const path = dir ? `${dir}/${d.name}` : d.name
    result.push({ path, content: d.content })
    docPathById.set(d.id, path)
  }
  for (const f of files) {
    const dir  = idToPath.get(f.parentId) ?? ''
    const path = dir ? `${dir}/${f.name}` : f.name
    result.push({ path, content: await readOpfsBlob(f.id) })
  }

  const mainPath =
    (preferredDocId && docPathById.get(preferredDocId)) ||
    (project?.rootDocId && docPathById.get(project.rootDocId)) ||
    null

  return { files: result, mainPath }
}
