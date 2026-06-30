import React from 'react'
import { navigateTo } from './ProjectList'

// ⚠️  BEFORE PUBLISHING: replace this with your actual public GitHub repository URL.
// AGPL-3.0 §13 requires prominently offering the Corresponding Source to network users.
const SOURCE_REPO_URL = 'https://github.com/magicmyo/lightlatex_pwa'

const features: { icon: string; text: string }[] = [
  { icon: '⚙️', text: 'In-browser LaTeX compilation, a true offline LaTeX editor with no server, no install, nothing to set up' },
  { icon: '📄', text: 'Compile LaTeX to PDF live as you type, side-by-side with your source' },
  { icon: '✏️', text: 'Rich Code editor (CodeMirror) and Visual (WYSIWYG) editor for web-based TeX editing' },
  { icon: '🗂️', text: 'File tree, document outline, and multi-file project support' },
  { icon: '📦', text: 'ZIP import and export, so you can reuse projects from Overleaf or any LaTeX editor' },
  { icon: '🔒', text: 'Privacy-first: all projects stored locally in your browser, so nothing is ever uploaded' },
]

export function Landing() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0d1117',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#e6edf3',
        boxSizing: 'border-box',
      }}
    >
      {/* Logo mark */}
      <img
        src="/logo.png"
        alt="LightLaTeX"
        style={{ height: 96, width: 'auto', marginBottom: 20 }}
      />

      {/* Wordmark — rendered as <h1> for SEO; visual style unchanged */}
      <h1 style={{ marginBottom: '12px', fontSize: '42px', fontWeight: 700, letterSpacing: '-1px', lineHeight: 1.1 }}>
        <span style={{ color: '#1a73e8' }}>Light</span>
        <span style={{ color: '#e6edf3' }}>LaTeX</span>
      </h1>

      {/* Tagline — keyword-rich: free online LaTeX editor, offline, open-source Overleaf alternative */}
      <p style={{ margin: '0 0 40px', fontSize: '16px', color: '#8b949e', textAlign: 'center', maxWidth: '500px' }}>
        A free <strong style={{ color: '#c9d1d9', fontWeight: 600 }}>online LaTeX editor</strong> and open-source{' '}
        <strong style={{ color: '#c9d1d9', fontWeight: 600 }}>Overleaf alternative</strong>. It compiles LaTeX to PDF
        entirely in your browser and works fully{' '}
        <strong style={{ color: '#c9d1d9', fontWeight: 600 }}>offline</strong>, no install or sign-up required.
      </p>

      {/* Feature list */}
      <ul
        style={{
          listStyle: 'none',
          margin: '0 0 48px',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          width: '100%',
          maxWidth: '460px',
        }}
      >
        {features.map(({ icon, text }) => (
          <li key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '14px' }}>
            <span style={{ fontSize: '18px', lineHeight: '1.4', flexShrink: 0 }}>{icon}</span>
            <span style={{ color: '#c9d1d9', lineHeight: '1.6' }}>{text}</span>
          </li>
        ))}
      </ul>

      {/* Offline note */}
      <div
        style={{
          background: '#161b22',
          border: '1px solid #30363d',
          borderRadius: '8px',
          padding: '16px 20px',
          maxWidth: '460px',
          width: '100%',
          marginBottom: '40px',
          fontSize: '13px',
          lineHeight: '1.6',
          color: '#8b949e',
        }}
      >
        <span style={{ color: '#1a73e8', fontWeight: 600 }}>Works fully offline</span> after a one-time
        download of the LaTeX engine and packages (~3 minutes on first use). After that, editing and
        compiling work without any internet connection. Install it as a PWA and use it like a
        native no-install LaTeX editor, right from your browser.
      </div>

      {/* CTA */}
      <button
        onClick={() => navigateTo('/project')}
        style={{
          padding: '13px 40px',
          background: '#1a73e8',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          fontSize: '15px',
          fontWeight: 600,
          cursor: 'pointer',
          letterSpacing: '0.01em',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#1557b0' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#1a73e8' }}
      >
        Open LightLaTeX
      </button>

      {/* License footer — required by AGPL-3.0 §13 (network use source offer) */}
      <p style={{
        marginTop: '48px',
        fontSize: '12px',
        color: '#484f58',
        textAlign: 'center',
        lineHeight: '1.8',
      }}>
        © {new Date().getFullYear()} LightLaTeX · Open source under{' '}
        <a href={SOURCE_REPO_URL + '/blob/main/LICENSE'} target="_blank" rel="noreferrer"
          style={{ color: '#8b949e', textDecoration: 'underline' }}>AGPL-3.0</a>
        {' · '}
        <a href={SOURCE_REPO_URL} target="_blank" rel="noreferrer"
          style={{ color: '#8b949e', textDecoration: 'underline' }}>Source code</a>
        {' · Built on '}
        <a href="https://github.com/overleaf/overleaf" target="_blank" rel="noreferrer"
          style={{ color: '#8b949e', textDecoration: 'underline' }}>Overleaf CE</a>
        {' & '}
        <a href="https://github.com/SwiftLaTeX/SwiftLaTeX" target="_blank" rel="noreferrer"
          style={{ color: '#8b949e', textDecoration: 'underline' }}>SwiftLaTeX</a>
      </p>
    </div>
  )
}
