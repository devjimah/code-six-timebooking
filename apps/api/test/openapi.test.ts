// Ticket #19: the API documentation matches the routes that really exist, and comes from the DTOs.
import { readFileSync } from "node:fs"
import type { Server } from "node:http"
import type { AddressInfo } from "node:net"
import { join } from "node:path"
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { buildOpenApiDocument } from "../src/api/openapi.js"
import { createApp } from "../src/app.js"
import * as schema from "../src/persistence/schema.js"

const src = join(import.meta.dirname, "..", "src")

/**
 * Every route the code registers, as "get /api/orders/{id}/budget". Read from the source files:
 * app.ts mounts each router (app.use("/api/orders", rememberMountPath, orderRoutes(db))), the router file adds its routes.
 */
function routesInCode(): string[] {
  const app = readFileSync(join(src, "app.ts"), "utf8")
  const found = [...app.matchAll(/app\.(get|post)\("(\/api\/[^"]+)"/g)]
    .map(([, method, path]) => `${method} ${path}`)
    .filter((route) => !route.endsWith("/api/openapi.json")) // the spec does not describe itself

  for (const [, prefix, routerName] of app.matchAll(/app\.use\("(\/api\/[^"]+)", (?:rememberMountPath, )?(\w+)Routes\(/g)) {
    const file = `${routerName!.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}-routes.ts`
    const router = readFileSync(join(src, "api", file), "utf8")
    for (const [, method, path] of router.matchAll(/router\.(get|post|put|patch|delete)\("([^"]+)"/g)) {
      const openApiPath = `${prefix}${path === "/" ? "" : path}`.replace(/:(\w+)/g, "{$1}")
      found.push(`${method} ${openApiPath}`)
    }
  }
  return found.sort()
}

const document = buildOpenApiDocument()
const routesInDocs = Object.entries(document.paths)
  .flatMap(([path, methods]) => Object.keys(methods).map((method) => `${method} ${path}`))
  .sort()

describe("OpenAPI document", () => {
  it("describes exactly the routes the API has – no more, no less", () => {
    expect(routesInCode().length).toBeGreaterThan(5) // guard: the source scan itself works
    expect(routesInDocs).toEqual(routesInCode())
  })

  it("takes request rules from the same zod DTO the route validates with", () => {
    const body = (document.paths["/api/time-entries"]!.post as any).requestBody.content["application/json"].schema

    expect(body.required).toEqual(["orderId", "workDate", "durationMinutes", "description"])
    expect(body.properties.description).toMatchObject({ minLength: 10, maxLength: 500 })
    expect(body.properties.workDate.format).toBe("date")
  })

  it("lists 401 and 403 for routes with a role check, and 422 for broken business rules", () => {
    const booking = (document.paths["/api/time-entries"]!.post as any).responses

    expect(Object.keys(booking).sort()).toEqual(["201", "400", "401", "403", "422"])
    expect(booking["422"].content["application/json"].schema.required).toEqual(["code", "message"])
  })

  it("documents path and query parameters", () => {
    const budget = (document.paths["/api/orders/{id}/budget"]!.get as any).parameters
    const audit = (document.paths["/api/audit-events"]!.get as any).parameters

    expect(budget).toEqual([expect.objectContaining({ name: "id", in: "path", required: true })])
    expect(audit.map((p: { name: string }) => p.name)).toEqual(["limit", "userId", "outcome", "action"])
  })
})

describe("documentation endpoints", () => {
  const client = createClient({ url: ":memory:" })
  let server: Server
  let baseUrl: string

  beforeAll(async () => {
    // The docs routes never touch the database, so an empty in-memory one is enough.
    server = createApp({ db: drizzle(client, { schema }), sessionSecret: "test", secureCookies: false }).listen(0)
    await new Promise((resolve) => server.once("listening", resolve))
    baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`
  })

  afterAll(() => {
    server.close()
    client.close()
  })

  it("serves the spec as JSON without signing in", async () => {
    const res = await fetch(`${baseUrl}/api/openapi.json`)

    expect(res.status).toBe(200)
    expect((await res.json()).openapi).toBe("3.0.3")
  })

  it("serves Swagger UI at /api/docs", async () => {
    const res = await fetch(`${baseUrl}/api/docs/`)

    expect(res.status).toBe(200)
    expect(await res.text()).toContain("swagger-ui")
  })
})
