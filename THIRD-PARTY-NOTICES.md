# Third-Party Notices

This project incorporates or is derived from the following open-source components.
Their licenses and copyright notices are reproduced below as required.

---

## 1. Overleaf Community Edition — source-editor & visual editor

**Files:** `src/` (all TypeScript/React source files, CodeMirror extensions,
toolbar, file tree, PDF preview, spell-check, and related utilities). These files
were copied and adapted from the Overleaf monorepo's `services/web/frontend/js/`
source-editor module.

**Copyright:** © Overleaf and contributors  
**Upstream:** <https://github.com/overleaf/overleaf>  
**License:** GNU Affero General Public License v3.0 (AGPL-3.0)  
Full license text: see `LICENSE` in this repository, or
<https://www.gnu.org/licenses/agpl-3.0.html>

> This program is free software: you can redistribute it and/or modify it under
> the terms of the GNU Affero General Public License as published by the Free
> Software Foundation, either version 3 of the License, or (at your option) any
> later version.

---

## 2. SwiftLaTeX — pdfTeX WebAssembly engine

**Files:**
- `public/PdfTeXEngine.js` — engine host (TypeScript → JS, compiled)
- `public/swiftlatexpdftex.js` — Emscripten-compiled pdfTeX worker
- `public/swiftlatexpdftex.wasm` — pdfTeX WebAssembly binary

**Copyright:** © 2019 Elliott Wen  
**Upstream:** <https://github.com/SwiftLaTeX/SwiftLaTeX>  
**License:** Eclipse Public License v2.0 OR GNU General Public License v2.0
with Classpath Exception  
`SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0`

The full EPL-2.0 text is available at:
<https://www.eclipse.org/legal/epl-2.0/>

The full GPL-2.0-with-Classpath-exception text is available at:
<https://www.gnu.org/software/classpath/license.html>

> Note: `public/swiftlatexpdftex.js` was further modified in this project to add
> per-file package-fetch progress messages (`postMessage({cmd:"pkgprogress",…})`).
> Those modifications are licensed under AGPL-3.0 consistent with the rest of
> this project.

---

## 3. Hunspell en_US Dictionary

**Files:** `public/hunspell/en_US.aff`, `public/hunspell/en_US.dic`

**Source:** SCOWL (Spell Checker Oriented Word Lists) compiled for Hunspell  
**Upstream:** <http://wordlist.aspell.net/>  
**License:** The en_US dictionary is released under a permissive tri-license:
BSD-3-Clause, MIT, and LGPL-2.1 (your choice). See
<http://wordlist.aspell.net/scowl-readme/> for the authoritative list.

---

## 4. npm dependencies

Runtime and build-time npm packages (React, CodeMirror, lezer, jszip, Vite,
vite-plugin-pwa, etc.) each carry their own licenses in `node_modules/`. The
overwhelming majority are MIT-licensed. Run `npx license-checker --summary` in
this directory for a full breakdown.

---

*This notice file was prepared in good faith. If you believe a notice is
inaccurate or missing, please open an issue in the repository.*
