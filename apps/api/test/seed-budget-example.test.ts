// Ticket #59: the demo data reproduces the challenge's worked example. Seeded with a fixed "today", so the result
// does not depend on the day the tests run.
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { migrate } from "drizzle-orm/libsql/migrator"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { getOrderBudget } from "../src/application/get-order-budget.js"
import { addDays, nationwideHoliday } from "../src/domain/public-holidays.js"
import type { Order, User } from "../src/domain/models.js"
import { orderRepository, timeEntryRepository, unavailableDayRepository, userRepository } from "../src/persistence/repositories.js"
import * as schema from "../src/persistence/schema.js"
import { seed } from "../src/persistence/seed.js"

const TODAY = "2026-11-03"
const dir = mkdtempSync(join(tmpdir(), "timebooking-example-"))
const client = createClient({ url: `file:${join(dir, "test.db").replace(/\\/g, "/")}` })
const db = drizzle(client, { schema })
let order: Order
let pm: User

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "./drizzle" })
  await seed(db, TODAY)
  order = (await orderRepository(db).findAll()).find((o) => o.code === "PO-2026-004")!
  pm = (await userRepository(db).findByEmail("pm@demo.local"))!
})

afterAll(() => {
  client.close()
  try {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  } catch {
    /* Windows may keep the file locked briefly; leftover temp files are harmless */
  }
})

const budgetToday = () => getOrderBudget(db, pm, order.id, 4, TODAY)

describe("the challenge's budget example in the demo data", () => {
  it("has 140 person-days ordered and 84 used", async () => {
    const { budget } = await budgetToday()

    expect(budget.budgetMinutes).toBe(140 * 8 * 60)
    expect(budget.bookedMinutes).toBe(84 * 8 * 60)
  })

  it("runs at 6 person-days per week", async () => {
    const { forecast } = await budgetToday()

    expect(forecast.paceMinutesPerWeek).toBe(6 * 8 * 60)
  })

  it("warns that the budget runs out before the project ends, and says by when to order more", async () => {
    const { forecast } = await budgetToday()

    expect(forecast.state).toBe("runs_out_early")
    expect(forecast.runsOutOn! < order.endDate).toBe(true)
    expect(forecast.orderMoreBy).toBe(addDays(forecast.runsOutOn!, -28))
    expect(forecast.orderMoreBy! > TODAY).toBe(true)
    expect(forecast.missingMinutes).toBeGreaterThan(0)
  })

  it("counts the vacations and the Christmas shutdown: the budget lasts longer than without them", async () => {
    // 56 person-days left at 1 per working day from Wed 4 Nov, without absences: Mon 11 Jan.
    // Half pace loses 6 days (Anna, 12 working days) and 3 days (Ben, 6 working days), so 65 days are needed.
    // Nobody works from 24 Dec to 1 Jan, which brings them to Wed 27 Jan.
    const { forecast } = await budgetToday()
    const days = await unavailableDayRepository(db).findForUsersFrom(
      [(await userRepository(db).findByEmail("anna@demo.local"))!.id, (await userRepository(db).findByEmail("ben@demo.local"))!.id],
      TODAY,
    )

    expect(days.map((d) => d.date)).toContain("2026-12-28")
    expect(forecast.runsOutOn).toBe("2027-01-27")
  })

  it("books only on valid working days, once per person and day", async () => {
    const entries = await timeEntryRepository(db).findByOrderWithConsultantName(order.id)
    const perPersonAndDay = new Set(entries.map((e) => `${e.consultantName} ${e.workDate}`))

    expect(perPersonAndDay.size).toBe(entries.length)
    for (const { workDate } of entries) {
      expect(new Date(`${workDate}T00:00:00Z`).getUTCDay()).not.toBe(0)
      expect(nationwideHoliday(workDate)).toBeNull()
      expect(workDate >= order.startDate && workDate <= TODAY).toBe(true)
    }
  })

  it("leaves the last two weeks open for the project manager, and older work approved", async () => {
    const entries = await timeEntryRepository(db).findByOrderWithConsultantName(order.id)

    expect(entries.filter((e) => e.workDate < addDays(TODAY, -14)).every((e) => e.status === "approved")).toBe(true)
    expect(entries.filter((e) => e.workDate >= addDays(TODAY, -14)).every((e) => e.status === "open")).toBe(true)
  })
})
