import React, { useState } from 'react'
import { useEditorContext } from '../contexts/EditorContext'
import { IconCopy, IconDownload, IconArchive, IconArrowLeft, IconHome } from './icons'
import { buildTree, getAllProjectContents, createProject, createDoc, updateDocContent, createFile, createFolder } from '../storage/db'
import { navigateTo } from '../pages/ProjectList'
import JSZip from 'jszip'

export function Toolbar() {
  const { projectId, projectName, compileResult } = useEditorContext()
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [copyName, setCopyName] = useState('')

  const openCopyModal = () => {
    setCopyName('Copy of ' + projectName)
    setShowCopyModal(true)
  }

  const submitCopy = async () => {
    const name = copyName.trim()
    if (!name) return
    setShowCopyModal(false)

    // Clone locally: create a new project and copy all files
    const { projectId: newId } = await createProject(name)
    const newTree = await buildTree(newId)
    const rootFolderId = newTree.id
    const { files: contents } = await getAllProjectContents(projectId)

    for (const { path, content } of contents) {
      const parts = path.split('/')
      const fileName = parts[parts.length - 1]
      if (!fileName) continue

      let parentId = rootFolderId
      if (parts.length > 1) {
        for (let i = 0; i < parts.length - 1; i++) {
          const folder = await createFolder(newId, parts[i], parentId)
          parentId = folder.id
        }
      }

      if (typeof content === 'string') {
        const d = await createDoc(newId, fileName, parentId)
        await updateDocContent(d.id, content)
      } else {
        await createFile(newId, fileName, parentId, content)
      }
    }

    navigateTo(`/project/${newId}`)
  }

  const handleDownloadZip = async () => {
    const zip = new JSZip()
    const { files: contents } = await getAllProjectContents(projectId)
    for (const { path, content } of contents) {
      if (typeof content === 'string') {
        zip.file(path, content)
      } else {
        zip.file(path, content)
      }
    }
    const blob = await zip.generateAsync({ type: 'blob' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `${projectName}.zip`; a.click()
    URL.revokeObjectURL(url)
  }

  const pdfUrl = compileResult?.pdf_url ?? null

  const iconBtn: React.CSSProperties = {
    padding: '4px', background: '#3c3c3c', color: '#ddd',
    border: '1px solid #555', borderRadius: '4px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
  }

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '6px 14px', background: '#2c2c2c', color: '#fff',
        fontSize: '13px', flexShrink: 0,
      }}>
        <span
          onClick={() => navigateTo('/project')}
          style={{ fontWeight: 700, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <img src="/logo.png" alt="" style={{ height: 18, width: 'auto', display: 'block' }} />
          <span><span style={{ color: '#1a73e8' }}>Light</span><span style={{ color: '#fff' }}>LaTeX</span></span>
        </span>
        <span style={{ color: '#888', margin: '0 2px' }}>/</span>
        <span style={{ color: '#ddd', fontWeight: 500 }}>{projectName}</span>

        <div style={{ flex: 1 }} />

        {/* Home / landing page */}
        <button onClick={() => navigateTo('/')} style={iconBtn} title="Home"><IconHome /></button>

        {/* Copy project */}
        <button onClick={openCopyModal} style={iconBtn} title="Copy project"><IconCopy /></button>

        {/* Download PDF (only when available) */}
        {pdfUrl ? (
          <a href={pdfUrl} download={`${projectName}.pdf`} style={iconBtn} title="Download PDF">
            <IconDownload />
          </a>
        ) : (
          <span style={{ ...iconBtn, opacity: 0.35, cursor: 'default' }} title="Compile first to download PDF">
            <IconDownload />
          </span>
        )}

        {/* Download ZIP */}
        <button onClick={handleDownloadZip} style={iconBtn} title="Download ZIP"><IconArchive /></button>

        {/* Back to projects */}
        <button onClick={() => navigateTo('/project')} style={iconBtn} title="Back to projects"><IconArrowLeft /></button>
      </div>

      {showCopyModal && (
        <div
          onClick={() => setShowCopyModal(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: '6px', padding: '24px', minWidth: '340px', boxShadow: '0 8px 32px rgba(0,0,0,0.22)' }}
          >
            <div style={{ fontWeight: 600, marginBottom: '14px', fontSize: '15px', color: '#222' }}>Copy project</div>
            <input
              autoFocus value={copyName}
              onChange={e => setCopyName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitCopy(); if (e.key === 'Escape') setShowCopyModal(false) }}
              style={{ width: '100%', padding: '7px 10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCopyModal(false)} style={{ padding: '6px 16px', background: '#fff', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button onClick={submitCopy} style={{ padding: '6px 16px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Copy</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
