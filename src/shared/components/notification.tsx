import React from 'react'
const Notification: React.FC<{ type?: string; content?: React.ReactNode; action?: React.ReactNode }> = ({ content, action }) => (
  <div className="notification">{content}{action}</div>
)
export default Notification
