import React, { forwardRef } from 'react'
const OLPopover = forwardRef<HTMLDivElement, React.PropsWithChildren<{ id: string; className?: string }>>(
  function OLPopover({ children, id, className }, ref) {
    return <div id={id} ref={ref} className={`popover ${className || ''}`}>{children}</div>
  }
)
export default OLPopover
