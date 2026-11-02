// Use case "a consultant types a sentence and gets a proposal for the form" (ticket #79, ADR 0022). Saves nothing: the
// consultant confirms in the form, and the booking rules run as usual. Only knows the orders this consultant may book on.
import { type SentenceProposal, parseBookingSentence } from "../domain/booking-sentence.js"
import type { User } from "../domain/models.js"
import { DomainError } from "../domain/errors.js"
import type { Db } from "../persistence/db.js"
import { todayInCompanyTimeZone } from "./clock.js"
import { listBookableOrders } from "./list-orders.js"

export type AiMode = "mock" | "off"

export async function proposeBooking(
  db: Db,
  consultant: User,
  sentence: string,
  aiMode: AiMode,
  today = todayInCompanyTimeZone(),
): Promise<SentenceProposal> {
  if (aiMode === "off") {
    throw new DomainError("AI_OFF", "Booking from a sentence is switched off. Fill in the form instead.")
  }
  const bookable = await listBookableOrders(db, consultant)
  return parseBookingSentence(sentence, { today, orders: bookable.map(({ order }) => order) })
}
