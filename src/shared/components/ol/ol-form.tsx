import React from 'react'
const OLForm: React.FC<React.PropsWithChildren<{ id?: string; onSubmit?: React.FormEventHandler<HTMLFormElement> }>> = ({ children, ...props }) => (
  <form {...props}>{children}</form>
)
export default OLForm
