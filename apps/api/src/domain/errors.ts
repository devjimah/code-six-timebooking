// A business rule was broken. The domain throws this; the API layer turns it into HTTP 422.
// No Express import here: the domain must not know it is called over HTTP.
// `code` is for programs (stable, e.g. "DAILY_LIMIT_EXCEEDED"), `message` is for people.
export class DomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = "DomainError"
  }
}
