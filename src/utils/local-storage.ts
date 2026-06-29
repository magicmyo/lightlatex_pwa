// Minimal JSON-backed localStorage wrapper (Task 6 stub of Overleaf's
// infrastructure/local-storage). Safe against unavailable storage and bad JSON.
const customLocalStorage = {
  getItem(key: string): any {
    try {
      const value = window.localStorage.getItem(key)
      return value === null ? null : JSON.parse(value)
    } catch {
      return null
    }
  },
  setItem(key: string, value: any): void {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // ignore quota / unavailable storage errors
    }
  },
  removeItem(key: string): void {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // ignore
    }
  },
  clear(): void {
    try {
      window.localStorage.clear()
    } catch {
      // ignore
    }
  },
}

export default customLocalStorage
