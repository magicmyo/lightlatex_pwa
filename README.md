# LightLaTeX Offline

A fully offline, browser-only LaTeX editor — Overleaf-like UI, works entirely in
your browser with no server, no install, and no account required.

After a one-time download of the LaTeX engine and packages (~3 minutes on first
use), all editing and compilation work with **no network connection**. The app can
also be installed as a **PWA** for a native-app feel.

## Features

- In-browser LaTeX compilation (SwiftLaTeX pdfTeX WebAssembly)
- Live PDF preview side-by-side with the source editor
- Rich Code editor (CodeMirror 6) and Visual (WYSIWYG) editor
- File tree, document outline, multi-file projects
- ZIP import and export
- All projects stored locally in IndexedDB — nothing is ever uploaded
- Spell-check (Hunspell en_US, offline)
- Installable as a PWA

## Getting started

```bash
npm install
npm run dev        # Vite dev server with HMR at http://localhost:5173
npm run build      # Production build → dist/
npm run preview    # Serve the built static site locally
```

Deploy `dist/` to any static host (Cloudflare Pages, Netlify, GitHub Pages, etc.).

## License & Source Code

This project is licensed under the **GNU Affero General Public License v3.0
(AGPL-3.0)**. See [`LICENSE`](LICENSE) for the full license text.

Because this software is made available over a network (AGPL §13), the complete
**Corresponding Source** is publicly available at:

> **<https://github.com/magicmyo/lightlatex_pwa.git>** ← replace with your repo URL

### Upstream components

| Component | Role | License |
|---|---|---|
| [Overleaf Community Edition](https://github.com/overleaf/overleaf) | Frontend source editor & visual editor (`src/`) | AGPL-3.0 |
| [SwiftLaTeX](https://github.com/SwiftLaTeX/SwiftLaTeX) | pdfTeX WASM engine (`public/`) | EPL-2.0 / GPL-2.0+CE |
| Hunspell en_US | Spell-check dictionary (`public/hunspell/`) | BSD/MIT/LGPL |

Full attribution and license texts for all bundled components are in
[`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md).

This project's own additions (offline storage layer, compile bridge, landing page,
download-progress banner, PWA setup, etc.) are licensed under AGPL-3.0.

> **Not legal advice.** Consult a lawyer for real legal questions.
