import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from 'react-error-boundary'
import { EditorProvider, useEditorContext } from './contexts/EditorContext'
import { CodeMirrorEditor } from './components/CodeMirrorEditor'
import { FileViewer } from './components/FileViewer'
import { Toolbar } from './components/Toolbar'
import { FileTree } from './components/FileTree'
import { FileOutline } from './components/FileOutline'
import { StatusBar } from './components/StatusBar'
import { DownloadBanner } from './components/DownloadBanner'
import { PdfPane } from './pdf-preview'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { ProjectList } from './pages/ProjectList'
import { Landing } from './pages/Landing'
import { preloadEngine } from './compile/engine'
import customLocalStorage from './utils/local-storage'
import type { TreeNode } from './utils/preview-path'
import './index.css'

// ── First-visit redirect (synchronous, before render) ────────────────────────
// If the user has previously reached /project, skip the landing and go straight
// to the project list. Using replaceState so the back button doesn't bounce.
if (window.location.pathname === '/' && customLocalStorage.getItem('ll-has-visited')) {
  history.replaceState({}, '', '/project')
}

// ── Helper: recursively search tree for a doc node by id ─────────────────────
function findDocNode(node: TreeNode | null, id: number): { id: number; name: string; type: 'doc' } | null {
  if (!node) return null
  for (const child of node.children ?? []) {
    if (child.type === 'doc' && child.id === id) return { id: child.id, name: child.name, type: 'doc' }
    if (child.type === 'folder') {
      const found = findDocNode(child, id)
      if (found) return found
    }
  }
  return null
}

function useRoute() {
  const [path, setPath] = useState(window.location.pathname)
  useEffect(() => {
    const handler = () => setPath(window.location.pathname)
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])
  return path
}

function Editor({ projectId }: { projectId: number }) {
  const { openDoc, compile, tree, refreshTree, rootDocId, viewedFile } = useEditorContext()
  const didAutoCompile = useRef(false)

  // Auto-open the root/main doc once the tree (and rootDocId) are loaded.
  // Priority: project.rootDocId → first top-level .tex → first doc of any type.
  useEffect(() => {
    if (!tree) return
    const docToOpen =
      (rootDocId != null ? findDocNode(tree, rootDocId) : null) ??
      tree.children?.find(c => c.type === 'doc' && c.name.endsWith('.tex')) ??
      tree.children?.find(c => c.type === 'doc')
    if (docToOpen) openDoc({ id: docToOpen.id, name: docToOpen.name, type: 'doc' })
  }, [tree, rootDocId, openDoc])

  useEffect(() => {
    if (didAutoCompile.current) return
    didAutoCompile.current = true
    compile()
  }, [compile])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Toolbar />
      <PanelGroup direction="horizontal" style={{ flex: 1, overflow: 'hidden' }}>
        <Panel defaultSize={18} minSize={10} maxSize={35}>
          <div style={{ height: '100%', borderRight: '1px solid #d0d0d0', background: '#f5f5f5' }}>
            <PanelGroup direction="vertical">
              <Panel defaultSize={62} minSize={15}>
                <div style={{ height: '100%', overflow: 'auto' }}>
                  <FileTree projectId={projectId} tree={tree} onRefresh={refreshTree} />
                </div>
              </Panel>
              <PanelResizeHandle style={{ height: '3px', background: '#e0e0e0', cursor: 'row-resize', flexShrink: 0 }} />
              <Panel defaultSize={38} minSize={10}>
                <div style={{ height: '100%', overflow: 'auto' }}>
                  <FileOutline />
                </div>
              </Panel>
            </PanelGroup>
          </div>
        </Panel>

        <PanelResizeHandle style={{ width: '3px', background: '#e0e0e0', cursor: 'col-resize' }} />

        <Panel defaultSize={40} minSize={20}>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {viewedFile ? <FileViewer /> : <CodeMirrorEditor />}
          </div>
        </Panel>

        <PanelResizeHandle style={{ width: '3px', background: '#e0e0e0', cursor: 'col-resize' }} />

        <Panel defaultSize={42} minSize={20}>
          <PdfPane />
        </Panel>
      </PanelGroup>
      <StatusBar />
    </div>
  )
}

function ProjectListPage() {
  // Set the visited flag whenever the project list is shown — first visit or
  // navigated-back. From this point on, '/' will redirect here automatically.
  useEffect(() => { customLocalStorage.setItem('ll-has-visited', true) }, [])
  return (
    <>
      <DownloadBanner />
      <ProjectList />
    </>
  )
}

function App() {
  const path = useRoute()

  // Start preloading the engine once the user is in the app (project list or editor),
  // but NOT on the landing page — first-time visitors shouldn't trigger the large
  // one-time engine download just by viewing the landing page.
  // navigateTo() fires popstate, which updates `path`, so this starts immediately
  // when the user opens the app. preloadEngine() is idempotent.
  useEffect(() => { if (path !== '/') preloadEngine() }, [path])

  // Route: /project/<id> → editor
  const match = path.match(/^\/project\/(\d+)$/)
  if (match) {
    const projectId = parseInt(match[1])
    return (
      <>
        <DownloadBanner />
        <EditorProvider projectId={projectId}>
          <Editor projectId={projectId} />
        </EditorProvider>
      </>
    )
  }

  // Route: /project → project list (and mark as visited)
  if (path === '/project') {
    return <ProjectListPage />
  }

  // Route: / → landing page (for first-time visitors)
  // No DownloadBanner here: the engine download doesn't start until the user
  // opens the app, so there's nothing to show on the landing page.
  if (path === '/') {
    return <Landing />
  }

  // Fallback: anything else → project list
  return <ProjectListPage />
}

function AppFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#0d1117', color: '#e6edf3', gap: '16px', padding: '40px',
      fontFamily: 'system-ui, -apple-system, sans-serif', textAlign: 'center',
    }}>
      <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Something went wrong</h1>
      <p style={{ color: '#8b949e', maxWidth: '520px', lineHeight: 1.6, fontSize: '14px' }}>
        {error.message || 'An unexpected error occurred in LightLaTeX.'}
      </p>
      <button
        onClick={resetErrorBoundary}
        style={{
          padding: '10px 28px', background: '#1a73e8', color: '#fff',
          border: 'none', borderRadius: '6px', fontSize: '14px',
          fontWeight: 600, cursor: 'pointer',
        }}
      >
        Reload app
      </button>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={AppFallback} onReset={() => window.location.reload()}>
    <App />
  </ErrorBoundary>
)
