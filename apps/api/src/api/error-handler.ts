import type { ErrorRequestHandler } from "express"
import { DomainError } from "../domain/errors.js"

// The one place that turns thrown errors into HTTP responses.
// Express 5 forwards errors from async route handlers here automatically.
// Register it last, after all routes.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof DomainError) {
    // 422 Unprocessable Content: the request was well-formed, but a business rule rejected it.
    res.status(422).json({ code: err.code, message: err.message })
    return
  }
  // express.json() throws this when the request body is not valid JSON.
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ code: "INVALID_JSON", message: "The request body is not valid JSON." })
    return
  }
  // Anything else is a bug. Log it for us, but never send the stack trace to the client.
  console.error(err)
  res.status(500).json({ code: "INTERNAL_ERROR", message: "Something went wrong on the server. Please try again." })
}
