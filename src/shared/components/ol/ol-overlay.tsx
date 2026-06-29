import React, { useEffect } from 'react'
type OLOverlayProps = {
  show?: boolean
  target?: HTMLElement | null
  placement?: string
  container?: HTMLElement | null
  transition?: boolean
  rootClose?: boolean
  containerPadding?: number
  onHide?: () => void
  children?: React.ReactNode
}
const OLOverlay: React.FC<OLOverlayProps> = ({ show, children, onHide, rootClose }) => {
  useEffect(() => {
    if (!show || !rootClose) return
    const handler = (_e: MouseEvent) => {
      onHide?.()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [show, rootClose, onHide])
  if (!show) return null
  return <div className="ol-overlay" style={{ position: 'absolute', zIndex: 1000 }}>{children}</div>
}
export default OLOverlay
