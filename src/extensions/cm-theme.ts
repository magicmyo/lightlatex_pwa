import { EditorView } from 'codemirror'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

/**
 * Editor chrome theme — Overleaf textmate palette.
 * Keeps the layout-critical `&{height:100%}` and `.cm-scroller{overflow:auto}`
 * that were previously inlined in CodeMirrorEditor.tsx.
 */
export const overleafEditorTheme = EditorView.theme({
  '&': {
    height: '100%',
    background: '#ffffff',
    color: '#000',
  },
  '.cm-scroller': { overflow: 'auto' },
  '.cm-content': {
    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, monospace',
    fontSize: '13px',
    lineHeight: '1.6',
  },
  '.cm-gutters': {
    background: '#f0f0f0',
    color: '#333',
    border: 'none',
  },
  '.cm-cursor': {
    borderLeftColor: 'black',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(0,0,0,0.07)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#dcdcdc',
  },
  '.cm-selectionBackground': {
    backgroundColor: 'rgb(181,213,255)',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: 'rgb(181,213,255)',
  },
})

/**
 * Syntax highlighting — keyed to the tags that LightLaTeX's lezer-latex grammar
 * actually emits (see frontend/src/lezer-latex/latex-language.ts).
 *
 * t.string (TextArgument/$ OtherArg/$) is intentionally left uncolored because it
 * maps to ordinary body text (e.g. the content inside \section{…}).
 */
export const overleafHighlightStyle = syntaxHighlighting(
  HighlightStyle.define([
    // % comment lines — muted green, non-italic (matches Overleaf textmate theme)
    { tag: t.comment, color: 'rgb(76,136,107)' },
    // all LaTeX command control sequences (\author, \section, \begin, \end, …) — blue
    { tag: t.tagName, color: 'blue' },
    // preamble/cross-ref commands (\documentclass, \usepackage, \cite, \ref, \label) — blue
    { tag: t.keyword, color: 'blue' },
    // environment names (EnvName / attributeValue) — teal
    { tag: t.attributeValue, color: 'rgb(49,132,149)' },
    // control symbols like \\ \% \$ etc. (CtrlSym) and math delimiters — purple
    { tag: t.literal, color: '#833FBA' },
    // math content (Math / monospace) — math green
    { tag: t.monospace, color: 'rgb(3,106,7)' },
    // BibTeX: field names (title, author, …) and citation keys — teal
    { tag: t.name, color: 'rgb(49,132,149)' },
    // BibTeX: @string abbreviation references — teal
    { tag: t.variableName, color: 'rgb(49,132,149)' },
    // BibTeX: numeric values (year, pages, …) — purple
    { tag: t.number, color: '#833FBA' },
    // BibTeX: '#' string concatenation operator — purple
    { tag: t.operator, color: '#833FBA' },
  ])
)
