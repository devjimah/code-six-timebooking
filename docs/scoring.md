# Technical scoring

The jury scores three dimensions with 10 points each: **business** (product vision and pitch), **agile** (how you work as a team) and **technical**. This page describes only the **technical dimension**: what you built and whether it holds up. Its criteria and preconditions count only for the technical score; the business and agile jurors use their own criteria.

Every criterion names where the technical juror looks. Impressions are not scored, evidence is.

## Overview

| # | Criterion | Points | Main evidence |
|---|---|---|---|
| 1 | Persistence and data model | 0–2 | Schema or migrations, entity relationship diagram |
| 2 | Business rules and unit tests | 0–3 | Domain code, server-side enforcement, unit tests |
| 3 | Roles, permissions and data privacy | 0–2 | Documented permission concept, implementation optional |
| 4 | Architecture and engineering practice | 0–2 | Any three of six building blocks |
| 5 | Runs from the README | 0–1 | Run check for the juror |
| | **Total** | **10** | |

There are no half points.

## Criteria and levels

### Criterion 1 · Persistence and data model (0–2)

| Level | Meaning | Example |
|---|---|---|
| 0 | Data lives only in the user interface and is lost after a restart. No data model is documented. | Bookings disappear when the page is reloaded. |
| 1 | Data is stored, but the model is flat and no further model is documented. Or a data model exists only as a diagram, without working persistence. | One table `bookings` with the order number as free text. |
| 2 | Data is stored on the server and survives a restart. Either the core entities are implemented with their relations, or a simpler implementation is complemented by an ER diagram that describes the next expansion stage. | Tables for orders, bookings and consultants with foreign keys. Or: one bookings table plus an ER diagram with order, budget, framework agreement and approval. |

### Criterion 2 · Business rules and unit tests (0–3)

| Level | Meaning | Example |
|---|---|---|
| 0 | No business rule is recognisable. | Any booking is accepted. |
| 1 | Rules exist only in the user interface or scattered across controllers. Or they are only described in a concept. | The save button is disabled when the budget is used up, but the API accepts the booking. |
| 2 | Rules live in one dedicated place in the domain, are enforced on the server and return an understandable error. Unit tests are missing or cover only trivial cases. | `Order.book(hours)` rejects a booking beyond the free budget with a clear message. |
| 3 | As level 2, and every implemented rule is covered by unit tests, including the case where the rule rejects a booking. The tests run with one command from the README and pass. | Tests such as "rejects booking beyond free budget" and "rejects overlapping booking" run green with one command. |

Typical rules for this case: free budget of an order, overlapping bookings of one person, one rule of the German Working Time Act (for example the 10-hour day or the 11-hour rest period).

### Criterion 3 · Roles, permissions and data privacy (0–2)

| Level | Meaning | Example |
|---|---|---|
| 0 | No roles, everyone sees everything, and nothing is documented. | A single user type. |
| 1 | Roles are implemented or named, but there is no documented reasoning about who should see what. Or the roles hardly differ, for example only "admin" and "user". | A role switch exists, but nobody wrote down why purchasing sees what it sees. |
| 2 | A documented permission concept covers at least two clearly different roles from different sides, for example the supplier's consultant and the client's purchaser. It states who may see and do what, and names the personal data involved. Implementation is not required. | A role matrix: the consultant sees own bookings, the project lead sees single bookings of the project, purchasing sees only aggregated hours per order. |

Full marks are possible with a concept alone. A clickable mockup that simulates the views per role counts as part of the concept and makes it more convincing. If roles are implemented, they should follow the documented concept.

### Criterion 4 · Architecture and engineering practice (0–2)

Choose which building blocks you deliver. Blocks A, D and E need working code. Blocks B, C and F can also be delivered without code.

| Building block | Counts when … |
|---|---|
| **A · Structure** | A layered or modular structure is recognisable, for example API DTOs, domain objects and persistence entities kept apart. The folder structure reflects it. |
| **B · Decisions (ADRs)** | At least three architecture decision records with context, decision, alternatives and consequences exist in `docs/adr`. Two of them cover **identity** (how users sign in, single sign-on adaptable to each customer) and **operation** (cloud, deployment at the customer or both; how the product scales). |
| **C · Git history** | The history shows how the work progressed: at least two commits per hackathon day, each recognisably adding a feature, a fix or a document. Feature branches are welcome. One final commit does not count. |
| **D · API documentation** | The implemented API is described in a machine-readable form, for example OpenAPI with a Swagger UI. |
| **E · Containerisation** | A Docker Compose file or similar starts the required components, such as database, backend and frontend. |
| **F · Mockup** | A clickable mockup shows the main screens and the flow between them. It counts even when the team also delivers code. |

| Level | Meaning |
|---|---|
| 0 | None of the building blocks is delivered. |
| 1 | At least one building block is delivered. |
| 2 | At least three building blocks are delivered. |

Further ADR topics you may choose: persistence technology, architecture pattern, role model, data privacy and retention, use of AI and which data leaves the system. ADRs are judged on whether alternatives were seriously weighed, not on length. Half a page per ADR is enough.

### Criterion 5 · Runs from the README (0–1)

| Level | Meaning |
|---|---|
| 1 | A person outside the team, or a coding agent, gets the application running from the README alone, following the run check below. |
| 0 | Otherwise. |

## Code, mockup and concept

Working code scores higher than a mockup, and a mockup scores higher than a concept on paper.

| Track | Crit. 1 | Crit. 2 | Crit. 3 | Crit. 4 | Crit. 5 | Maximum |
|---|---|---|---|---|---|---|
| Working code | 2 | 3 | 2 | 2 | 1 | **10** |
| Mockup | 1 | 1 | 2 | 2 | 0 | **6** |
| Concept on paper | 1 | 1 | 2 | 1 | 0 | **5** |

## Preconditions

- **Repository.** The jury can read your Git repository, including its history. We strongly recommend GitHub, with a repository created from the hackathon template and set to public (or the jurors invited). GitHub itself is not scored.
- **Commit history.** All commits lie inside the hackathon window (Friday 09:00 to Tuesday 11:00) and are spread over several days. Commits by several people are not required, so pair programming is fine. If the history is missing, lies outside the window or consists of one bulk commit at the end, the technical score is capped at 5 points.
- **Own work.** Public libraries and templates are allowed, pre-built solutions are not. AI tools are allowed; the team must be able to explain everything it submits.
- **Mockup and concept teams** commit exports, screenshots or documents each day, so their history is visible too.

## Run check for the juror

- **Clean start.** Fresh clone of the repository as of Tuesday 11:00. The prerequisites listed in the README (for example Docker, a runtime, a package manager) are installed beforehand.
- **README only.** The README is the only source. No questions to the team.
- **Success.** Within 5 minutes of starting the setup steps, the application runs with sample data, and the documented demo user of each role can sign in.
- **Rules.** Copying values from `.env.example` is allowed. Changing code or guessing missing steps is not. No paid cloud account or API key may be required. AI services can be replaced by a mock through a switch.
- **Order.** A coding agent tries first. If it fails, the juror follows the README once by hand. If either succeeds, the point is given.

## What your repository must contain

- **README** with the sections *Prerequisites · Setup · Run · Test · Demo users · Evidence map*. Exact commands, versions and ports, no prose instructions.
- **Evidence map:** a table in the README that links each of criteria 1 to 4 to the file, folder or document where the juror finds the evidence.
- **`.env.example`** with all configuration values the application needs, with safe defaults.
