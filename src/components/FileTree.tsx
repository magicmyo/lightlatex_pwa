import React, { useState, useCallback, useRef, useEffect } from 'react'
import { api } from '../api'
import { useEditorContext } from '../contexts/EditorContext'
import { IconFile, IconImage, IconFilePlus, IconFolderPlus, IconUpload } from './icons'

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'])

function iconForName(name: string) {
  const dot = name.lastIndexOf('.')
  const ext = dot >= 0 ? name.slice(dot + 1).toLowerCase() : ''
  return IMAGE_EXTENSIONS.has(ext) ? IconImage : IconFile
}

interface TreeNode {
  id: number
  name: string
  type: 'folder' | 'doc' | 'file'
  children?: TreeNode[]
}

interface ContextMenuState {
  x: number
  y: number
  node: TreeNode
}

interface FileTreeProps {
  projectId: number
  tree: TreeNode | null
  onRefresh: () => void
}

export function FileTree({ projectId, tree, onRefresh }: FileTreeProps) {
  const { openDoc, currentDoc, openFile, viewedFile } = useEditorContext()
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [renaming, setRenaming] = useState<{ id: number; type: string; name: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadTargetRef = useRef<number | null>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const [nameModal, setNameModal] = useState<{ kind: 'doc' | 'folder'; parentId: number } | null>(null)
  const [nameValue, setNameValue] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (renaming && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renaming])

  useEffect(() => {
    if (nameModal && nameInputRef.current) {
      nameInputRef.current.focus()
      // For doc: select just the basename ("name") before .tex
      if (nameModal.kind === 'doc') {
        const dotIdx = nameValue.lastIndexOf('.')
        nameInputRef.current.setSelectionRange(0, dotIdx > 0 ? dotIdx : nameValue.length)
      } else {
        nameInputRef.current.select()
      }
    }
  }, [nameModal])

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return
    const handler = () => setContextMenu(null)
    window.addEventListener('click', handler, { once: true })
    return () => window.removeEventListener('click', handler)
  }, [contextMenu])

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleContextMenu = (e: React.MouseEvent, node: TreeNode) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, node })
  }

  const createDoc = (parentId: number) => {
    setNameValue('name.tex')
    setNameModal({ kind: 'doc', parentId })
  }

  const createFolder = (parentId: number) => {
    setNameValue('newfolder')
    setNameModal({ kind: 'folder', parentId })
  }

  const submitNameModal = async () => {
    if (!nameModal) return
    const val = nameValue.trim()
    if (!val) return
    if (nameModal.kind === 'doc') {
      await api.createDoc(projectId, val, nameModal.parentId)
    } else {
      await api.createFolder(projectId, val, nameModal.parentId)
    }
    setNameModal(null)
    onRefresh()
  }

  const uploadFile = (parentId: number) => {
    uploadTargetRef.current = parentId
    fileInputRef.current?.click()
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await api.uploadFile(projectId, file, uploadTargetRef.current ?? undefined)
    onRefresh()
    e.target.value = ''
  }

  const handleRename = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!renaming) return
    if (e.key === 'Enter') {
      const newName = (e.target as HTMLInputElement).value.trim()
      if (newName && newName !== renaming.name) {
        await api.renameEntity(projectId, renaming.type, renaming.id, newName)
        onRefresh()
      }
      setRenaming(null)
    } else if (e.key === 'Escape') {
      setRenaming(null)
    }
  }

  const handleDelete = async (node: TreeNode) => {
    if (!confirm(`Delete "${node.name}"?`)) return
    await api.deleteEntity(projectId, node.type, node.id)
    onRefresh()
  }

  const handleSetRootDoc = async (docId: number) => {
    await api.setRootDoc(projectId, docId)
    onRefresh()
  }

  const handleDuplicate = async (node: TreeNode) => {
    await api.duplicateEntity(projectId, node.type, node.id)
    onRefresh()
  }

  const renderNode = (node: TreeNode, depth = 0): React.ReactNode => {
    const isExpanded = expanded.has(node.id)
    const indent = depth * 16

    if (node.type === 'folder') {
      return (
        <div key={`folder-${node.id}`}>
          <div
            onContextMenu={e => handleContextMenu(e, node)}
            onClick={() => toggleExpand(node.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '3px 8px',
              paddingLeft: `${8 + indent}px`,
              cursor: 'pointer',
              userSelect: 'none',
              fontSize: '13px',
              borderRadius: '3px',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#e8e8e8')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ marginRight: '4px', fontSize: '11px' }}>{isExpanded ? '▼' : '▶'}</span>
            {renaming?.id === node.id && renaming.type === 'folder' ? (
              <input
                ref={renameInputRef}
                defaultValue={renaming.name}
                onKeyDown={handleRename}
                onBlur={() => setRenaming(null)}
                onClick={e => e.stopPropagation()}
                style={{ fontSize: '13px', width: '100%', border: '1px solid #aaa', borderRadius: '2px', padding: '1px 4px' }}
              />
            ) : (
              <span>{node.name}</span>
            )}
          </div>
          {isExpanded && (
            <div>
              {node.children?.map(child => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      )
    }

    if (node.type === 'doc') {
      const isSelected = node.id === currentDoc?.id
      const DocIcon = iconForName(node.name)
      return (
        <div
          key={`doc-${node.id}`}
          onContextMenu={e => handleContextMenu(e, node)}
          onClick={() => openDoc(node as any)}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '3px 8px',
            paddingLeft: `${8 + indent}px`,
            cursor: 'pointer',
            userSelect: 'none',
            fontSize: '13px',
            borderRadius: '3px',
            background: isSelected ? '#e8f0fe' : 'transparent',
            color: isSelected ? '#1a73e8' : 'inherit',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = isSelected ? '#d2e3fc' : '#e8e8e8')}
          onMouseLeave={e => (e.currentTarget.style.background = isSelected ? '#e8f0fe' : 'transparent')}
        >
          <DocIcon width={14} height={14} style={{ marginRight: 6, flexShrink: 0 }} />
          {renaming?.id === node.id && renaming.type === 'doc' ? (
            <input
              ref={renameInputRef}
              defaultValue={renaming.name}
              onKeyDown={handleRename}
              onBlur={() => setRenaming(null)}
              onClick={e => e.stopPropagation()}
              style={{ fontSize: '13px', width: '100%', border: '1px solid #aaa', borderRadius: '2px', padding: '1px 4px' }}
            />
          ) : (
            <span>{node.name}</span>
          )}
        </div>
      )
    }

    // type === 'file'
    const FileIcon = iconForName(node.name)
    const isFileSelected = node.id === viewedFile?.id
    return (
      <div
        key={`file-${node.id}`}
        onContextMenu={e => handleContextMenu(e, node)}
        onClick={() => openFile({ id: node.id, name: node.name })}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '3px 8px',
          paddingLeft: `${8 + indent}px`,
          cursor: 'pointer',
          userSelect: 'none',
          fontSize: '13px',
          color: isFileSelected ? '#1a73e8' : '#555',
          borderRadius: '3px',
          background: isFileSelected ? '#e8f0fe' : 'transparent',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = isFileSelected ? '#d2e3fc' : '#e8e8e8')}
        onMouseLeave={e => (e.currentTarget.style.background = isFileSelected ? '#e8f0fe' : 'transparent')}
      >
        <FileIcon width={14} height={14} style={{ marginRight: 6, flexShrink: 0 }} />
        {renaming?.id === node.id && renaming.type === 'file' ? (
          <input
            ref={renameInputRef}
            defaultValue={renaming.name}
            onKeyDown={handleRename}
            onBlur={() => setRenaming(null)}
            onClick={e => e.stopPropagation()}
            style={{ fontSize: '13px', width: '100%', border: '1px solid #aaa', borderRadius: '2px', padding: '1px 4px' }}
          />
        ) : (
          <span>{node.name}</span>
        )}
      </div>
    )
  }

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '4px 0' }}>
      {/* Root-level add buttons */}
      <div style={{ display: 'flex', gap: '4px', padding: '4px 8px 8px', borderBottom: '1px solid #e0e0e0' }}>
        <button
          onClick={() => createDoc(tree?.id ?? 0)}
          title="New file"
          style={{ flex: 1, fontSize: '11px', padding: '3px', border: '1px solid #ccc', borderRadius: '3px', cursor: 'pointer', background: '#fafafa', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
        >
          <IconFilePlus />
        </button>
        <button
          onClick={() => createFolder(tree?.id ?? 0)}
          title="New folder"
          style={{ flex: 1, fontSize: '11px', padding: '3px', border: '1px solid #ccc', borderRadius: '3px', cursor: 'pointer', background: '#fafafa', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
        >
          <IconFolderPlus />
        </button>
        <button
          onClick={() => uploadFile(tree?.id ?? 0)}
          title="Upload file"
          style={{ flex: 1, fontSize: '11px', padding: '3px', border: '1px solid #ccc', borderRadius: '3px', cursor: 'pointer', background: '#fafafa', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
        >
          <IconUpload />
        </button>
      </div>

      {/* Tree */}
      <div style={{ marginTop: '4px' }}>
        {tree?.children?.map(child => renderNode(child, 0))}
      </div>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileUpload} />

      {/* Context menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 1000,
            minWidth: '160px',
            padding: '4px 0',
            fontSize: '13px',
          }}
          onClick={e => e.stopPropagation()}
        >
          {contextMenu.node.type === 'folder' && (
            <>
              <ContextItem onClick={() => { createDoc(contextMenu.node.id); setContextMenu(null) }}>New file here</ContextItem>
              <ContextItem onClick={() => { createFolder(contextMenu.node.id); setContextMenu(null) }}>New folder here</ContextItem>
              <ContextItem onClick={() => { uploadFile(contextMenu.node.id); setContextMenu(null) }}>Upload here</ContextItem>
              <ContextSeparator />
            </>
          )}
          {contextMenu.node.type === 'doc' && (
            <>
              <ContextItem onClick={() => { handleSetRootDoc(contextMenu.node.id); setContextMenu(null) }}>Set as main file</ContextItem>
              <ContextItem onClick={() => { handleDuplicate(contextMenu.node); setContextMenu(null) }}>Duplicate</ContextItem>
            </>
          )}
          {contextMenu.node.type === 'file' && (
            <ContextItem onClick={() => { handleDuplicate(contextMenu.node); setContextMenu(null) }}>Duplicate</ContextItem>
          )}
          <ContextItem onClick={() => { setRenaming({ id: contextMenu.node.id, type: contextMenu.node.type, name: contextMenu.node.name }); setContextMenu(null) }}>Rename</ContextItem>
          <ContextItem danger onClick={() => { handleDelete(contextMenu.node); setContextMenu(null) }}>Delete</ContextItem>
        </div>
      )}

      {/* Name modal */}
      {nameModal && (
        <div
          onClick={() => setNameModal(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: '6px', padding: '24px 28px 20px',
              width: '340px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            }}
          >
            <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '14px' }}>
              {nameModal.kind === 'doc' ? 'New file' : 'New folder'}
            </div>
            <input
              ref={nameInputRef}
              type="text"
              value={nameValue}
              onChange={e => setNameValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') submitNameModal()
                if (e.key === 'Escape') setNameModal(null)
              }}
              style={{
                width: '100%', padding: '7px 10px', border: '1px solid #d0d0d0',
                borderRadius: '4px', fontSize: '14px', marginBottom: '16px',
                outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={e => (e.target.style.borderColor = '#1a73e8')}
              onBlur={e => (e.target.style.borderColor = '#d0d0d0')}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setNameModal(null)}
                style={{
                  padding: '7px 14px', background: '#fff', color: '#555',
                  border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '13px',
                }}
              >Cancel</button>
              <button
                onClick={submitNameModal}
                style={{
                  padding: '7px 16px', background: '#1a73e8', color: '#fff',
                  border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                }}
              >Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ContextItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '6px 16px',
        cursor: 'pointer',
        color: danger ? '#c00' : '#333',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#f0f0f0')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </div>
  )
}

function ContextSeparator() {
  return <div style={{ borderTop: '1px solid #eee', margin: '4px 0' }} />
}
