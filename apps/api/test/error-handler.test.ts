// Ticket #17: every rule violation reaches the client as 422 with a readable message,
// and unexpected errors never leak a stack trace.
// We start a tiny Express app on a random free port and call it with Node's built-in fetch.
import type { Server } from "node:http"
import type { AddressInfo } from "node:net"
import express from "express"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { errorHandler } from "../src/api/error-handler.js"
import { AccessDeniedError, NotFoundError } from "../src/application/errors.js"
import { DomainError } from "../src/domain/errors.js"

let server: Server
let baseUrl: string

beforeAll(async () => {
  const app = express()
  app.use(express.json())
  app.post("/rule-broken", async () => {
    throw new DomainError("DAILY_LIMIT_EXCEEDED", "Booking rejected: only 2.0 h left on Tue 27 Oct.")
  })
  app.get("/missing", async () => {
    throw new NotFoundError("ORDER_NOT_FOUND", "Order 9 does not exist.")
  })
  app.get("/not-yours", async () => {
    throw new AccessDeniedError("NOT_YOUR_ORDER", "Only the project manager of this order can see its budget.")
  })
  app.get("/bug", async () => {
    throw new Error("secret internal detail")
  })
  app.use(errorHandler)
  server = app.listen(0)
  await new Promise((resolve) => server.once("listening", resolve))
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`
})

afterAll(() => {
  server.close()
})

describe("error handler", () => {
  it("returns 422 with code and message when a business rule is broken", async () => {
    const res = await fetch(`${baseUrl}/rule-broken`, { method: "POST" })

    expect(res.status).toBe(422)
    expect(await res.json()).toEqual({
      code: "DAILY_LIMIT_EXCEEDED",
      message: "Booking rejected: only 2.0 h left on Tue 27 Oct.",
    })
  })

  it("returns 404 with code and message when something does not exist", async () => {
    const res = await fetch(`${baseUrl}/missing`)

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ code: "ORDER_NOT_FOUND", message: "Order 9 does not exist." })
  })

  it("returns 403 with code and message when a resource belongs to someone else", async () => {
    const res = await fetch(`${baseUrl}/not-yours`)

    expect(res.status).toBe(403)
    expect((await res.json()).code).toBe("NOT_YOUR_ORDER")
  })

  it("returns 400 when the request body is not valid JSON", async () => {
    const res = await fetch(`${baseUrl}/rule-broken`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ not json",
    })

    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe("INVALID_JSON")
  })

  it("returns 500 without internal details for unexpected errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {}) // keep test output clean

    const res = await fetch(`${baseUrl}/bug`)
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.code).toBe("INTERNAL_ERROR")
    expect(JSON.stringify(body)).not.toContain("secret internal detail")
  })
})
