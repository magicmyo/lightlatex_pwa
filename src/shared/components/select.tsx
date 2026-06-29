import React from 'react'
export function Select<T>({ label, items, itemToKey, itemToString, onSelectedItemChanged, defaultItem }: {
  label?: React.ReactNode
  items: T[]
  itemToKey: (item: T) => string
  itemToString: (item: T) => string
  onSelectedItemChanged: (item: T) => void
  defaultItem?: T | null
}) {
  return (
    <div>
      {label && <label>{label}</label>}
      <select
        className="form-control"
        value={defaultItem !== undefined && defaultItem !== null ? itemToKey(defaultItem) : ''}
        onChange={e => {
          const found = items.find(i => itemToKey(i) === e.target.value)
          if (found !== undefined) onSelectedItemChanged(found)
        }}
      >
        {items.map(item => (
          <option key={itemToKey(item)} value={itemToKey(item)}>{itemToString(item)}</option>
        ))}
      </select>
    </div>
  )
}
