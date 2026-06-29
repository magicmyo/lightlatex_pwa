import React from 'react'
const OLFormLabel: React.FC<React.PropsWithChildren<{ htmlFor?: string }>> = ({ children, ...props }) => (
  <label {...props}>{children}</label>
)
export default OLFormLabel
