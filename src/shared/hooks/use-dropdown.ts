import { useRef, useState, useCallback } from 'react'
export default function useDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLElement>(null)
  const onToggle = useCallback((value: boolean) => setOpen(value), [])
  return { open, onToggle, ref }
}
