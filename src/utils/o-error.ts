// Task 6 stub for @overleaf/o-error. Provides the small subset (constructor +
// chainable withInfo/withCause) used by the ported tree-operations code.
export default class OError extends Error {
  info?: Record<string, any>
  cause?: unknown

  constructor(message?: string, info?: Record<string, any>, cause?: unknown) {
    super(message)
    this.name = 'OError'
    this.info = info
    this.cause = cause
  }

  withInfo(info: Record<string, any>): this {
    this.info = { ...this.info, ...info }
    return this
  }

  withCause(cause: unknown): this {
    this.cause = cause
    return this
  }
}
