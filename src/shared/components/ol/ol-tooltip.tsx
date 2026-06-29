import React from 'react'
const OLTooltip: React.FC<React.PropsWithChildren<{ id: string; description?: React.ReactNode; overlayProps?: any; hidden?: boolean }>> = ({ children }) => <>{children}</>
export default OLTooltip
