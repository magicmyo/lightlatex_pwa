import React from 'react'
const OLCol: React.FC<React.PropsWithChildren<{ lg?: number; className?: string }>> = ({ children, lg, className }) => (
  <div className={`col${lg ? '-' + lg : ''}${className ? ' ' + className : ''}`}>{children}</div>
)
export default OLCol
