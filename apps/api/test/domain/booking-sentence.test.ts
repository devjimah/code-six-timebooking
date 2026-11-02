// Ticket #79: a sentence becomes a proposal for the booking form. Today is Tue 3 Nov 2026.
import { describe, expect, it } from "vitest"
import { parseBookingSentence } from "../../src/domain/booking-sentence.js"

const orders = [
  { id: 1, code: "PO-2026-001", title: "Customer portal relaunch" },
  { id: 2, code: "PO-2026-002", title: "SAP data migration" },
  { id: 4, code: "PO-2026-004", title: "Customer portal migration" },
]
const parse = (sentence: string) => parseBookingSentence(sentence, { today: "2026-11-03", orders })

describe("the sentence from the ticket", () => {
  it("understands all of it", () => {
    expect(parse("yesterday 9–5 on portal migration, 1 h lunch")).toEqual({
      orderId: 4, workDate: "2026-11-02", startTime: "09:00", endTime: "17:00", breakMinutes: 60,
    })
  })

  it("understands it in German", () => {
    expect(parse("gestern von 9 bis 17 Uhr auf SAP Migration, 30 min Pause")).toEqual({
      orderId: 2, workDate: "2026-11-02", startTime: "09:00", endTime: "17:00", breakMinutes: 30,
    })
  })
})

describe("the date", () => {
  it.each([
    ["today", "2026-11-03"],
    ["heute", "2026-11-03"],
    ["yesterday", "2026-11-02"],
    ["2026-10-27", "2026-10-27"],
    ["27.10.2026", "2026-10-27"],
    ["am 5.10.", "2026-10-05"],
  ])("reads %s", (word, date) => {
    expect(parse(word).workDate).toBe(date)
  })

  it("takes a weekday as the most recent one, never in the future", () => {
    expect(parse("friday").workDate).toBe("2026-10-30")
    expect(parse("montag").workDate).toBe("2026-11-02")
    expect(parse("tuesday").workDate).toBe("2026-11-03")
  })

  it("stays empty when there is none", () => {
    expect(parse("9-5 on the portal").workDate).toBeNull()
  })
})

describe("the times", () => {
  it.each([
    ["9-5", "09:00", "17:00"],
    ["9 to 5", "09:00", "17:00"],
    ["08:30-17:15", "08:30", "17:15"],
    ["8 bis 16:30", "08:00", "16:30"],
    ["9am-5pm", "09:00", "17:00"],
    ["1pm to 3pm", "13:00", "15:00"],
    ["13-17", "13:00", "17:00"],
  ])("reads %s", (text, startTime, endTime) => {
    expect(parse(text)).toMatchObject({ startTime, endTime })
  })

  it("stays empty without a range", () => {
    expect(parse("worked at nine")).toMatchObject({ startTime: null, endTime: null })
  })

  it("does not take a date for a time", () => {
    expect(parse("27.10.2026")).toMatchObject({ startTime: null, endTime: null })
  })

  it("leaves an impossible time empty", () => {
    expect(parse("25-30")).toMatchObject({ startTime: null, endTime: null })
  })
})

describe("the break", () => {
  it.each([
    ["1 h lunch", 60],
    ["30 min break", 30],
    ["0,5 std pause", 30],
    ["pause 45 min", 45],
    ["lunch of 1 hour", 60],
  ])("reads %s", (text, minutes) => {
    expect(parse(text).breakMinutes).toBe(minutes)
  })

  it("is not read as a time", () => {
    expect(parse("9-5, 1 h lunch")).toMatchObject({ startTime: "09:00", endTime: "17:00", breakMinutes: 60 })
  })

  it("stays empty when there is none", () => {
    expect(parse("9-5").breakMinutes).toBeNull()
  })
})

describe("the order", () => {
  it("finds it by its code", () => {
    expect(parse("today on po-2026-002").orderId).toBe(2)
  })

  it("finds the order sharing the most words of its title", () => {
    expect(parse("sap migration").orderId).toBe(2)
  })

  it("stays empty when two orders match equally, rather than guess", () => {
    expect(parse("customer portal").orderId).toBeNull()
  })

  it("stays empty without a match", () => {
    expect(parse("reading documentation").orderId).toBeNull()
  })

  it("only knows the orders it is given", () => {
    expect(parseBookingSentence("sap migration", { today: "2026-11-03", orders: [] }).orderId).toBeNull()
  })
})
