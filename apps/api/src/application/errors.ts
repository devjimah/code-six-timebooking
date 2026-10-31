// Errors about access to a resource, thrown by use cases. Unlike DomainError (a broken business rule, 422),
// these mean "it does not exist" (404) or "it is not yours" (403). The error handler maps them to HTTP.

export class NotFoundError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = "NotFoundError"
  }
}

export class AccessDeniedError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = "AccessDeniedError"
  }
}
