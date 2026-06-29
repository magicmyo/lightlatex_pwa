import React from 'react'
export const OLModal: React.FC<React.PropsWithChildren<{ show?: boolean; onHide?: () => void; className?: string }>> = ({ show, children, onHide, className }) => {
  if (!show) return null
  return (
    <div className={`modal-overlay ${className || ''}`} onClick={(e) => { if (e.target === e.currentTarget) onHide?.() }}>
      <div className="modal-dialog">{children}</div>
    </div>
  )
}
export const OLModalHeader: React.FC<React.PropsWithChildren<{ closeButton?: boolean }>> = ({ children }) => <div className="modal-header">{children}</div>
export const OLModalTitle: React.FC<React.PropsWithChildren> = ({ children }) => <h4 className="modal-title">{children}</h4>
export const OLModalBody: React.FC<React.PropsWithChildren> = ({ children }) => <div className="modal-body">{children}</div>
export const OLModalFooter: React.FC<React.PropsWithChildren> = ({ children }) => <div className="modal-footer">{children}</div>
