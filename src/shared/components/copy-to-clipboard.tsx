import React from 'react'
export const CopyToClipboard: React.FC<{ content: string; tooltipId?: string }> = ({ content }) => (
  <button type="button" className="btn btn-sm" onClick={() => navigator.clipboard.writeText(content)}>Copy</button>
)
