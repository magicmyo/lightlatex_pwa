import React from 'react'

// Task 6 stub for Overleaf's split-test context. LightLaTeX has no A/B testing,
// so this is a pass-through provider.
export const SplitTestProvider: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  return <>{children}</>
}
