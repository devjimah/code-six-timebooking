// Turns a sentence like "yesterday 9-5 on portal migration, 1 h lunch" into a proposal for the booking form (ticket #79,
// ADR 0022). This is the mock behind AI_MODE=mock: plain rules, no model, and nothing leaves the system. A real language
// model could later replace this one function. Nothing here saves or checks: the consultant confirms in the form, and the
// booking rules run as usual. Whatever it does not understand stays empty.
import { addDays } from "./public-holidays.js"

export type SentenceProposal = {
  orderId: number | null
  workDate: string | null // "YYYY-MM-DD"
  startTime: string | null // "HH:MM"
  endTime: string | null
  breakMinutes: number | null
}

const WEEKDAYS: [RegExp, number][] = [
  [/\b(sunday|sonntag)\b/, 0],
  [/\b(monday|montag)\b/, 1],
  [/\b(tuesday|dienstag)\b/, 2],
  [/\b(wednesday|mittwoch)\b/, 3],
  [/\b(thursday|donnerstag)\b/, 4],
  [/\b(friday|freitag)\b/, 5],
  [/\b(saturday|samstag)\b/, 6],
]

/** Time is booked afterwards, so a weekday means its most recent one, today included. */
function findDate(text: string, today: string): string | null {
  if (/\b(today|heute)\b/.test(text)) return today
  if (/\b(yesterday|gestern)\b/.test(text)) return addDays(today, -1)
  const iso = /\b(\d{4}-\d{2}-\d{2})\b/.exec(text)
  if (iso) return iso[1]!
  const german = /\b(\d{1,2})\.(\d{1,2})\.(\d{4})?/.exec(text)
  if (german) return `${german[3] ?? today.slice(0, 4)}-${german[2]!.padStart(2, "0")}-${german[1]!.padStart(2, "0")}`
  const todayNumber = new Date(`${today}T00:00:00Z`).getUTCDay()
  for (const [name, number] of WEEKDAYS) {
    if (name.test(text)) return addDays(today, -((todayNumber - number + 7) % 7))
  }
  return null
}

/** "1 h lunch", "30 min break", "pause 45 min". Returns the minutes and the text without them, so they are not read as a time. */
function findBreak(text: string): { minutes: number | null; rest: string } {
  const word = "(?:lunch|break|pause|mittag\\w*)"
  const amount = "(\\d+(?:[.,]\\d+)?)\\s*(h|hours?|std\\.?|stunden?|min\\w*)\\b"
  const match = new RegExp(`${amount}\\s*(?:of\\s+)?${word}`).exec(text) ?? new RegExp(`${word}\\s*(?:of\\s+|von\\s+)?${amount}`).exec(text)
  if (!match) return { minutes: null, rest: text }
  const value = Number(match[1]!.replace(",", "."))
  return { minutes: Math.round(match[2]!.startsWith("m") ? value : value * 60), rest: text.replace(match[0], " ") }
}

const asTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`

function findTimes(text: string): { startTime: string; endTime: string } | null {
  const match = /(?<![\d.])(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|to|until|till|bis)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?(?![\d.])/.exec(text)
  if (!match) return null
  const read = (hour: string, minute: string | undefined, half: string | undefined) => {
    let hours = Number(hour)
    if (half === "pm" && hours < 12) hours += 12
    if (half === "am" && hours === 12) hours = 0
    return hours * 60 + Number(minute ?? 0)
  }
  const start = read(match[1]!, match[2], match[3])
  let end = read(match[4]!, match[5], match[6])
  // "9-5" is nine to five: an end before the start, without am or pm, is in the afternoon.
  if (!match[6] && end <= start && end <= 12 * 60) end += 12 * 60
  if (start >= 24 * 60 || end >= 24 * 60 || Number(match[2] ?? 0) > 59 || Number(match[5] ?? 0) > 59) return null
  return { startTime: asTime(start), endTime: asTime(end) }
}

/** The order whose code is in the sentence, or the only one sharing the most title words with it. */
function findOrder(text: string, orders: { id: number; code: string; title: string }[]): number | null {
  const byCode = orders.find((o) => text.includes(o.code.toLowerCase()))
  if (byCode) return byCode.id
  const scored = orders
    .map((o) => ({
      id: o.id,
      score: o.title
        .toLowerCase()
        .split(/\W+/)
        // Whole words, so "sap" is not found inside another word; short words like "of" say nothing.
        .filter((word) => word.length > 2 && new RegExp(`\\b${word}\\b`).test(text)).length,
    }))
    .sort((a, b) => b.score - a.score)
  const [best, second] = scored
  return best && best.score > 0 && best.score !== second?.score ? best.id : null
}

export function parseBookingSentence(
  sentence: string,
  context: { today: string; orders: { id: number; code: string; title: string }[] },
): SentenceProposal {
  const text = sentence.toLowerCase().replace(/[–—]/g, "-")
  const { minutes, rest } = findBreak(text)
  const times = findTimes(rest)
  return {
    orderId: findOrder(rest, context.orders),
    workDate: findDate(rest, context.today),
    startTime: times?.startTime ?? null,
    endTime: times?.endTime ?? null,
    breakMinutes: minutes,
  }
}
