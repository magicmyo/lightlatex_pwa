import React, { useCallback, useEffect, useRef, useState } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { latex } from '../lezer-latex'
import { bibtex } from '../lezer-bibtex'
import { getFileExtension } from '../utils/file'
import { useEditorContext } from '../contexts/EditorContext'
import { visual, setVisual } from '../extensions/visual/visual'
import { EditorSwitch } from './editor-switch'
import { FormattingToolbar } from './FormattingToolbar'
import { Breadcrumb } from './Breadcrumb'
import { overleafEditorTheme, overleafHighlightStyle } from '../extensions/cm-theme'
import { spelling } from '../extensions/spelling'
import { HunspellManager } from '../hunspell/HunspellManager'
import HunspellWorker from '../hunspell/hunspell.worker?worker'

type EditorMode = 'cm6' | 'rich-text'

let hunspellManagerSingleton: HunspellManager | null = null

function getHunspellManager(): HunspellManager {
  if (!hunspellManagerSingleton) {
    // Offline: learned words stored in localStorage (synchronous read)
    const learnedWords: string[] = JSON.parse(localStorage.getItem('ll-learned-words') ?? '[]')
    const baseAssetPath = window.location.origin + '/'
    const worker = new HunspellWorker()
    hunspellManagerSingleton = new HunspellManager(
      worker, 'en_US', learnedWords, baseAssetPath, 'hunspell/'
    )
  }
  return hunspellManagerSingleton
}

export function CodeMirrorEditor() {
  const { currentDoc, saveDoc, viewRef, setLiveText, setCursorLine, previewByPath } = useEditorContext()
  const containerRef = useRef<HTMLDivElement>(null)
  const [editorMode, setEditorMode] = useState<EditorMode>('cm6')

  useEffect(() => {
    if (!containerRef.current || !currentDoc) return

    const hunspellManager = getHunspellManager()

    const view = new EditorView({
      state: EditorState.create({
        doc: currentDoc.content,
        extensions: [
          basicSetup,
          getFileExtension(currentDoc.name ?? '') === 'bib' ? bibtex() : latex(),
          EditorView.lineWrapping,
          visual(currentDoc.name ?? 'main.tex', {
            visual: editorMode === 'rich-text',
            previewByPath,
          }),
          EditorView.updateListener.of(update => {
            if (update.docChanged) {
              const text = update.state.doc.toString()
              saveDoc(text)
              setLiveText(text)
            }
            if (update.selectionSet || update.docChanged) {
              const line = update.state.doc.lineAt(update.state.selection.main.head).number
              setCursorLine(line)
            }
          }),
          overleafEditorTheme,
          overleafHighlightStyle,
          spelling({ hunspellManager }),
        ],
      }),
      parent: containerRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
      if (viewRef.current === view) viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDoc?.id])

  const handleModeChange = useCallback((newMode: EditorMode) => {
    setEditorMode(newMode)
    viewRef.current?.dispatch(
      setVisual({ visual: newMode === 'rich-text', previewByPath })
    )
  }, [viewRef, previewByPath])

  if (!currentDoc) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', color: '#888',
      }}>
        Select a file from the file tree
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: '4px 8px', borderBottom: '1px solid #eee',
        display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
      }}>
        <EditorSwitch mode={editorMode} onChange={handleModeChange} />
        <FormattingToolbar />
      </div>
      <div style={{ padding: '2px 8px', borderBottom: '1px solid #eee' }}>
        <Breadcrumb />
      </div>
      <div ref={containerRef} style={{ flex: 1, minHeight: 0 }} />
    </div>
  )
}
