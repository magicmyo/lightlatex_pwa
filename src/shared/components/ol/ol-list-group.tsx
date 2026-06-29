import React from 'react'
const OLListGroup: React.FC<React.PropsWithChildren<{ role?: string; onClick?: () => void; className?: string }>> = ({ children, ...props }) => (
  <ul className={`list-group ${props.className || ''}`} role={props.role} onClick={props.onClick}>{children}</ul>
)
export default OLListGroup
