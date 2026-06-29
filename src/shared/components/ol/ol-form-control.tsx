import React, { forwardRef } from 'react'
type OLFormControlProps = React.InputHTMLAttributes<HTMLInputElement> & { value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }
const OLFormControl = forwardRef<HTMLInputElement, OLFormControlProps>(function OLFormControl(props, ref) {
  return <input className="form-control" ref={ref} {...props} />
})
export default OLFormControl
