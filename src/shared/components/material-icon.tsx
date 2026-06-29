import React from 'react'
const MaterialIcon: React.FC<{ type: string; className?: string }> = ({ type, className }) => (
  <span className={`material-symbols${className ? ' ' + className : ''}`} aria-hidden="true">{type}</span>
)
export default MaterialIcon
