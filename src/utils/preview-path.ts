// preview-path.ts — resolve a LaTeX \includegraphics path to a blob URL.
// Offline version: uses a module-level blob URL cache instead of server URLs.
// Blob URLs are populated by api.ts when files are uploaded or the tree is loaded.

import { PreviewPath } from '@/types/preview-path'

export interface TreeNode {
  id: number
  name: string
  type: 'folder' | 'doc' | 'file'
  children?: TreeNode[]
}

// Module-level cache: fileId → object URL
const blobUrlCache = new Map<number, string>()

export function cacheFileBlobUrl(fileId: number, url: string) {
  // Revoke any existing URL for this file before replacing
  const existing = blobUrlCache.get(fileId)
  if (existing && existing !== url) URL.revokeObjectURL(existing)
  blobUrlCache.set(fileId, url)
}

/** Return the already-warmed blob URL for a file, or undefined if not yet cached. */
export function getCachedFileBlobUrl(fileId: number): string | undefined {
  return blobUrlCache.get(fileId)
}

export function revokeCachedBlobUrl(fileId: number) {
  const url = blobUrlCache.get(fileId)
  if (url) { URL.revokeObjectURL(url); blobUrlCache.delete(fileId) }
}

const SUFFIXES = ['', '.png', '.jpg', '.jpeg', '.pdf', '.svg', '.PNG', '.JPG', '.JPEG', '.PDF', '.SVG']

function findFileByPath(node: TreeNode, segments: string[]): TreeNode | null {
  if (!segments.length) return null
  const [head, ...rest] = segments
  if (head === '.' || head === '') return findFileByPath(node, rest)
  for (const child of node.children ?? []) {
    if (child.name !== head) continue
    if (!rest.length) return child.type === 'file' ? child : null
    if (child.type === 'folder') return findFileByPath(child, rest)
  }
  return null
}

export function previewByPath(tree: TreeNode | null, _projectId: number, path: string): PreviewPath | null {
  if (!tree) return null
  const segments = path.split('/')
  for (const suffix of SUFFIXES) {
    const segs = [...segments.slice(0, -1), segments[segments.length - 1] + suffix]
    const file = findFileByPath(tree, segs)
    if (file && file.type === 'file') {
      const url = blobUrlCache.get(file.id)
      if (!url) return null
      const extension = file.name.slice(file.name.lastIndexOf('.') + 1)
      return { url, extension }
    }
  }
  return null
}
