import React from 'react'
const OLRow: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className }) => (
  <div className={`row ${className || ''}`}>{children}</div>
)
export default OLRow
