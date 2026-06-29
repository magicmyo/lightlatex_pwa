import React from 'react'
const OLFormGroup: React.FC<React.PropsWithChildren<{ controlId?: string; className?: string }>> = ({ children, className }) => (
  <div className={`form-group ${className || ''}`}>{children}</div>
)
export default OLFormGroup
