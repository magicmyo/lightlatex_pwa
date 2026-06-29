import React from 'react'
type OLButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string; form?: string }
const OLButton: React.FC<OLButtonProps> = ({ variant, size, className, children, ...props }) => (
  <button className={`btn btn-${variant || 'secondary'}${size ? ' btn-' + size : ''}${className ? ' ' + className : ''}`} {...props}>{children}</button>
)
export default OLButton
