const noop = () => {}

export const debugConsole = import.meta.env.DEV
  ? {
      log: console.log.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
    }
  : { log: noop, warn: noop, error: noop }
