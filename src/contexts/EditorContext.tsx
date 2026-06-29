import React, { createContext, useContext, useState, useCallback, useRef, useEffect, MutableRefObject } from 'react'
import { EditorView } from '@codemirror/view'
import { api } from '../api'
import { previewByPath as previewByPathUtil, TreeNode } from '../utils/preview-path'
import { PreviewPath } from '@/types/preview-path'
import { getProject } from '../storage/db'

interface DocMeta {
  id: number
  name: string
  type: 'doc'
}

interface FileMeta {
  id: number
  name: string
}

interface EditorContextValue {
  projectId: number
  projectName: string
  rootDocId: number | null
  currentDoc: { id: number; name: string; content: string; rev: number } | null
  openDoc: (doc: DocMeta) => void
  saveDoc: (content: string) => void
  /** Non-null while a binary file (image/PDF) is being previewed in the center pane. */
  viewedFile: FileMeta | null
  openFile: (file: FileMeta) => void
  compileResult: any
  compile: () => void
  isCompiling: boolean
  /** Non-null when the last autosave attempt failed. Cleared on next successful save. */
  saveError: string | null
  viewRef: MutableRefObject<EditorView | null>
  liveText: string
  wordCount: number
  setLiveText: (text: string) => void
  cursorLine: number
  setCursorLine: (line: number) => void
  jumpToLine: (docId: number, line: number) => void
  tree: TreeNode | null
  refreshTree: () => Promise<void>
  previewByPath: (path: string) => PreviewPath | null
}

const EditorContext = createContext<EditorContextValue | null>(null)

function countWords(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length
}

export function EditorProvider({ projectId, children }: { projectId: number; children: React.ReactNode }) {
  const [currentDoc, setCurrentDoc] = useState<EditorContextValue['currentDoc']>(null)
  const [viewedFile, setViewedFile] = useState<FileMeta | null>(null)
  const [compileResult, setCompileResult] = useState<any>(null)
  const [isCompiling, setIsCompiling] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [liveText, setLiveTextState] = useState('')
  const [cursorLine, setCursorLine] = useState(1)
  const [tree, setTree] = useState<TreeNode | null>(null)
  const [projectName, setProjectName] = useState('Project')
  const [rootDocId, setRootDocId] = useState<number | null>(null)
  const treeRef = useRef<TreeNode | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const liveTextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingContentRef = useRef<{ docId: number; content: string } | null>(null)
  const viewRef = useRef<EditorView | null>(null)

  // Load project name and root doc id from storage
  useEffect(() => {
    getProject(projectId).then(p => {
      if (p) {
        setProjectName(p.name)
        setRootDocId(p.rootDocId ?? null)
      }
    }).catch(() => {})
  }, [projectId])

  const refreshTree = useCallback(async () => {
    const data = await api.getTree(projectId)
    treeRef.current = data
    setTree(data)
  }, [projectId])

  useEffect(() => { refreshTree() }, [refreshTree])

  const previewByPath = useCallback(
    (path: string) => previewByPathUtil(treeRef.current, projectId, path),
    [projectId]
  )

  const wordCount = countWords(liveText)

  const setLiveText = useCallback((text: string) => {
    if (liveTextTimerRef.current) clearTimeout(liveTextTimerRef.current)
    liveTextTimerRef.current = setTimeout(() => setLiveTextState(text), 250)
  }, [])

  // Immediately flush any pending debounced save.  Call this before switching docs,
  // on page hide, and on beforeunload so edits are never silently dropped.
  const flushPendingSave = useCallback(async () => {
    if (!pendingContentRef.current) return
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null }
    const { docId, content: c } = pendingContentRef.current
    pendingContentRef.current = null
    try {
      const result = await api.saveDoc(projectId, docId, c)
      setCurrentDoc(prev => prev && prev.id === docId ? { ...prev, rev: result.rev } : prev)
      setSaveError(null)
    } catch (err: any) {
      console.error('[autosave] flush failed:', err)
      // Don't set saveError here — we're mid-navigation; let the next save retry.
    }
  }, [projectId])

  // Flush on visibility-hidden and beforeunload so the last keystroke before closing
  // the tab is not lost (the 1 s debounce would otherwise drop it).
  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === 'hidden') flushPendingSave() }
    const onBeforeUnload = () => { flushPendingSave() }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [flushPendingSave])

  const openDoc = useCallback(async (doc: DocMeta) => {
    // Flush the previous doc's pending save BEFORE discarding pendingContentRef,
    // otherwise switching files within the 1 s debounce window drops the edit.
    await flushPendingSave()
    setViewedFile(null)   // return center pane to the editor
    const data = await api.getDoc(projectId, doc.id)
    setCurrentDoc(data)
    setLiveTextState(data.content)
  }, [projectId, flushPendingSave])

  const openFile = useCallback((file: FileMeta) => {
    setViewedFile(file)
  }, [])

  const saveDoc = useCallback((content: string) => {
    if (!currentDoc) return
    pendingContentRef.current = { docId: currentDoc.id, content }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      if (!pendingContentRef.current) return
      const { docId, content: c } = pendingContentRef.current
      pendingContentRef.current = null
      try {
        const result = await api.saveDoc(projectId, docId, c)
        setCurrentDoc(prev => prev ? { ...prev, rev: result.rev } : null)
        setSaveError(null)
      } catch (err: any) {
        console.error('[autosave] save failed:', err)
        const isQuota = err?.name === 'QuotaExceededError' || err?.message?.includes('storage is full')
        setSaveError(isQuota
          ? 'Storage full — export and delete projects to free up space.'
          : 'Couldn\'t save — changes are safe in the editor but weren\'t persisted.')
      }
    }, 1000)
  }, [projectId, currentDoc])

  const compile = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    if (pendingContentRef.current) {
      const { docId, content } = pendingContentRef.current
      pendingContentRef.current = null
      const result = await api.saveDoc(projectId, docId, content)
      setCurrentDoc(prev => prev ? { ...prev, rev: result.rev } : null)
    }
    setIsCompiling(true)
    try {
      const result = await api.compile(projectId, currentDoc?.id)
      setCompileResult(result)
    } finally {
      setIsCompiling(false)
    }
  }, [projectId, currentDoc])

  const jumpToLine = useCallback(async (docId: number, line: number) => {
    if (currentDoc?.id === docId) {
      const view = viewRef.current
      if (view) {
        const doc = view.state.doc
        if (line >= 1 && line <= doc.lines) {
          const lineObj = doc.line(line)
          view.dispatch({
            selection: { anchor: lineObj.from },
            effects: EditorView.scrollIntoView(lineObj.from, { y: 'center' }),
          })
          view.focus()
        }
      }
    } else {
      await openDoc({ id: docId, name: '', type: 'doc' as const })
    }
  }, [currentDoc, viewRef, openDoc])

  return (
    <EditorContext.Provider value={{
      projectId, projectName, rootDocId, currentDoc, openDoc, saveDoc,
      viewedFile, openFile,
      compileResult, compile, isCompiling, saveError,
      viewRef, liveText, wordCount, setLiveText,
      cursorLine, setCursorLine, jumpToLine,
      tree, refreshTree, previewByPath,
    }}>
      {children}
    </EditorContext.Provider>
  )
}

export const useEditorContext = () => {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error('useEditorContext must be used within EditorProvider')
  return ctx
}
