# The challenge: every hour you buy, in view

A large German company buys a lot of project work from outside service providers. Every hour those consultants work is booked somewhere, invoiced at some point and finally paid. Today, nobody at the company can say with confidence how much budget is left and how long it will last.

> **Your task:** Build a time booking product that lets the client company record, check and plan the work its service providers deliver. You decide who you build for first, what your product does especially well, and what you leave out.

## Scenario: many suppliers, many orders, little overview

The client is a large company with its own IT and business departments. Much of its project work is done by external service providers: consulting firms, agencies and freelancers. For every piece of work there is a purchase order with a budget, usually counted in person-days. Hours are booked against the client's own accounting objects, such as a cost centre or a project element.

Today the client works with spreadsheets and an old tool. Several people suffer from this. The project lead often learns how much budget was used only when the monthly invoice arrives. Purchasing notices too late that a follow-up order is needed, and then needs weeks to place it. Finance checks invoices against timesheets by hand. And nobody knows whether a budget will last until the end of the project when half of the team is on vacation in December.

## Two sides of the same hour

| Service provider (delivers the work) | One booked hour | Client company (receives and pays) |
|---|---|---|
| records the working time of its consultants | Date: Tue 27 Oct 2026 | checks and approves the work |
| is the employer and must follow German working time law | Duration: 3.5 h | controls the budget of each order |
| manages vacation and sick leave | Person: Consultant, Supplier X | plans when to order more |
| sends invoices | Order: 4500012345 / item 10 · Project: P-2026-0815.03 · Activity: Legacy data reconciliation | checks invoices |

Both sides keep a record of the same hours, and the data is almost the same. What each side wants from it is different. This challenge looks at it from the client's side. You may connect both sides, for example with a portal where suppliers book directly, or with an interface to the supplier's own time tracking.

## What the product should do

**The core every team delivers.** One flow that works from start to finish: an external consultant books working time with a short description against one of the client's orders, and the client sees what that does to the order's budget. You can show it as working code, as a clickable mockup or as a documented concept. All three are allowed, but they are not scored equally: working code scores higher than a mockup, and a mockup scores higher than a concept on paper.

Beyond the core, these are guardrails, not a specification. How deep you go into each one is your product decision. If you want to know more about any of them, ask in the Product Owner rounds.

- **Record the work.** Working time of external consultants lands on the right order and accounting object, with a description of what was done.
- **Track budgets.** For every order it is clear how much was ordered, how much is used and how much is still free.
- **Look ahead.** The product answers how long a budget lasts at the current pace. Planned absences such as vacation and public holidays are part of the answer.
- **Check and approve.** The client reviews and approves the work before an invoice is paid.
- **Follow the rules.** Bookings are plausible and respect legal and contractual limits. The most important law is the German Working Time Act (Arbeitszeitgesetz, ArbZG). Vacation and sick leave matter here too.

## Example: how long will the budget last?

Every project lead asks this, and the simple answer is often wrong. The example is invented, but it shows the effect. Two external consultants have worked on a migration project since early July. The order "Customer portal migration" covers **140 person-days**. **84 are used.** On average **6 person-days** are used per week.

| | Result |
|---|---|
| Forecast at the same pace | budget used up in **week 50** |
| Forecast with vacations and the Christmas shutdown | budget used up in **week 51**, about one week later |
| Missing until the project ends (week 5, 2027) | **≈ 31 person-days** |
| Order more by | **week 47** (purchasing needs 4 weeks) |

Two vacation blocks in autumn push the end of the budget back by about a week. The Christmas shutdown uses no budget, but it adds calendar time. The exact date matters less than what follows from it. The budget will not last until February, and the follow-up order must start in week 47 at the latest. A good product says so in time, not when the last hour is booked.

## Idea space

Starting points, not requirements. Take what fits your vision and invent what is missing.

**For the project lead: steer instead of recalculating**
- A budget traffic light that shows the expected end date, not only what is used.
- An early warning when a budget will run out before the project ends, with a ready-made proposal for the follow-up order.
- Try out scenarios: what does it cost if a third consultant joins, or if the project runs four weeks longer?

**For purchasing and finance: money and contracts under control**
- Check invoices automatically against approved hours and highlight differences.
- Track framework agreements whose total budget is shared by several orders.
- See how much the company depends on single suppliers.
- Spot unusual patterns, such as very long days or bookings on public holidays.

**For service providers and their consultants: book once, not twice**
- Send hours from the supplier's own time tracking through an interface instead of typing them twice.
- Book in seconds, on the phone or straight from the calendar.
- See only the orders you are actually assigned to.
- Enter planned vacation once, so the client's forecast is right.

**With AI: ask, don't search**
- Ask in plain language: "How long will the budget for the portal migration last?"
- Type "yesterday 9 to 5 on the portal migration, 1 h lunch" and get correct bookings to confirm.
- Get a short weekly summary per order, including anything unusual.
- Explain in plain words why a booking looks wrong and how to fix it.

## Where good products make choices

There is no single right answer here, only deliberate decisions. Show us how you make them.

- **Control vs. not becoming the employer.** If the client tells external consultants exactly when and how to work, it starts to act like their employer, which German law does not allow without special rules. How much detail does the client really need: hours per person and day, or person-days per order and week?
- **Transparency vs. privacy.** Daily hours and vacation plans of individual consultants are personal data. Who needs to see what? Would anonymous availability be enough for planning?
- **Precision vs. effort.** Exact start and end times or half person-days? With thousands of bookings a month, every extra click counts.
- **One system vs. two.** Suppliers have their own time tracking. Do people book twice, does the client import, or do both sides share one system?
- **Clear forecast vs. honest uncertainty.** A forecast is only as good as its assumptions. How do you show uncertainty without making the message vague?

## Questions your vision should answer

- Who uses your product every day, who decides to buy it, and who pays for it? Where do their interests conflict?
- The client uses spreadsheets and an old tool today. Why is switching worth it, including migration, rollout and training?
- What does your product save, in hours, money or risk?
- Which side of the hour are you on: client, service provider, or in between?
- What do you leave out on purpose?

## Terms

| Term | German | Meaning |
|---|---|---|
| Purchase order | Bestellung | The client's formal order to a supplier, with a scope, a period and a budget. Every booked hour belongs to one order. |
| Person-day (PD) | Personentag (PT) | One person working one day, usually 8 hours. Budgets and prices of consulting work are often counted in person-days and day rates. |
| Framework agreement | Rahmenvertrag | A long-term contract with a supplier and a total budget. Individual orders draw from it. |
| Cost centre, project element | Kostenstelle, PSP-Element | Accounting objects inside the client company. They decide which department or project pays for an hour. |
| Proof of work | Leistungsnachweis | A list of the hours a supplier worked for one order in a period, usually a month. The client approves it before the invoice is paid. |
| Working Time Act | Arbeitszeitgesetz, ArbZG | The German law that limits daily working hours and requires breaks and rest periods. |
| Public holidays | Feiertage | They differ between the 16 German federal states. A consultant in Munich may have a day off when a colleague in Hamburg works. |
| Calendar week | Kalenderwoche (KW) | Germans often plan in numbered weeks, from week 1 to week 52 or 53. |
