// Ticket #13: a booking must last a positive, whole number of minutes.
import { describe, expect, it } from "vitest"
import { assertValidDuration } from "../../src/domain/rules/duration.js"

describe("booking duration", () => {
  it("accepts one minute", () => {
    expect(() => assertValidDuration(1)).not.toThrow()
  })

  it("accepts three and a half hours", () => {
    expect(() => assertValidDuration(210)).not.toThrow()
  })

  it("rejects zero minutes", () => {
    expect(() => assertValidDuration(0)).toThrow(expect.objectContaining({ code: "INVALID_DURATION" }))
  })

  it("rejects a negative duration, which would otherwise free up budget", () => {
    expect(() => assertValidDuration(-60)).toThrow("must be a positive number of whole minutes (got -60)")
  })

  it("rejects parts of a minute", () => {
    expect(() => assertValidDuration(30.5)).toThrow(expect.objectContaining({ code: "INVALID_DURATION" }))
  })
})
