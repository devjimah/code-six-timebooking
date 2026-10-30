# Build Guide: from idea to a running product in four days

This guide walks your team through the hackathon from the first setup to the final demo. Use it as a map, not a recipe: there is no required technology stack and no required design. Every team should end up with its own product, its own look and its own architecture.

The guide has four phases. Each step has the same shape:

- **Why:** what the technical jury looks for in this step, with a link to the matching criterion in [scoring.md](scoring.md)
- **Do:** what to do, written so a person can do it alone, with or without AI
- **Prompt:** a ready-to-copy text for any AI chat (ChatGPT, Copilot, Claude, Gemini …)
- **Done when:** a short checklist to know when you are done

> **About the scoring.** The jury scores three dimensions with 10 points each: **business** (product vision and pitch), **agile** (how you work as a team) and **technical**. This guide covers the technical dimension. Its criteria in [scoring.md](scoring.md) count only for the technical score; the business and agile jurors use their own criteria.

> **You do not need AI to use this guide.** Every step can be done by hand. If you use an AI assistant, the prompts save time. If you use a coding agent such as GitHub Copilot in VS Code or Claude Code, this repository already contains *skills* that run the steps for you (see [Working with AI](#14-working-with-ai-and-without)).

| Phase | Steps | When |
|---|---|---|
| **I · Get ready** | [1.1 Read this first](#11-read-this-first) · [1.2 Set up](#12-set-up) · [1.3 Choose your track](#13-choose-your-track) · [1.4 Working with AI](#14-working-with-ai-and-without) | before Friday and Friday morning |
| **II · Decide** | [2.1 Product vision](#21-write-down-your-product-vision) · [2.2 Stack](#22-pick-a-simple-stack) · [2.3 Domain](#23-model-the-domain) · [2.4 Roles & privacy](#24-roles-and-privacy) · [2.5 ADRs](#25-record-decisions-adrs) | Friday and Saturday |
| **III · Build** | [3.1 Walking skeleton](#31-build-a-walking-skeleton) · [3.2 Business rules & tests](#32-business-rules-and-tests) · [3.3 UI & mockup](#33-make-it-yours-ui-and-mockup) · [3.4 Git](#34-git-like-a-team) | Saturday to Monday |
| **IV · Ship** | [4.1 README & run check](#41-readme-and-run-check) · [4.2 Final review](#42-final-review) | Monday and Tuesday morning |

---

## Phase I · Get ready

### 1.1 Read this first

Seven things to know before you start:

1. **Read the challenge** in [challenge.md](challenge.md). The core every team delivers: *an external consultant books working time against one of the client's orders, and the client sees what that does to the order's budget.*
2. **You choose the technology.** There is no required language, framework or database. The `blueprint` branch of this repository is one example, not the default.
3. **In the technical score, working code counts more than a mockup, and a mockup more than a concept on paper.** All three are allowed, and the business and agile scores do not depend on it. See [1.3 Choose your track](#13-choose-your-track).
4. **We strongly recommend GitHub** for your repository. At least one person in your team needs a GitHub account. Better: everybody has one, which also gives everybody free access to GitHub Copilot.
5. **Commit throughout the hackathon.** The technical jury reads your Git history to see how your work grew from Friday to Tuesday. One big commit at the end caps your technical score.
6. **AI is allowed, not required.** Whatever you hand in, your team must be able to explain.
7. **The technical jury starts your product from your README alone**, within 5 minutes. Plan for this from day one, not on Tuesday morning.

### 1.2 Set up

**Why:** the technical jury reads your code, documents and Git history in your repository. A shared repository from day one keeps everything in one place ([preconditions](scoring.md#preconditions)).

**Before Friday** (at home, with good internet):

- [ ] Everybody creates a GitHub account at [github.com/signup](https://github.com/signup).
- [ ] Everybody turns on two-factor authentication with an authenticator app (not SMS). GitHub asks for it when you push code, and setting it up on Friday morning costs time.
- [ ] Install [Git](https://git-scm.com/downloads) and an editor, for example [VS Code](https://code.visualstudio.com/).
- [ ] Optional: install [Docker Desktop](https://www.docker.com/products/docker-desktop/) if you think you will use a database server or containers.
- [ ] Optional: in VS Code, sign in with your GitHub account and turn on **GitHub Copilot**. Every GitHub account includes *Copilot Free* with a limited number of chat requests per month. Use your own account, so the team has more requests in total.
- [ ] Internet at the venue may be slow. Once your team has picked a stack, download what it needs (runtime, package manager, Docker images) while you have good internet.

**Friday from 09:00:**

- [ ] One person opens this template repository on GitHub and clicks **Use this template → Create a new repository**. Name it after your product. Choose **Public**, so the jury can read it. Create it on Friday morning, so the history shows the work of the hackathon.
- [ ] Invite your teammates: *Settings → Collaborators → Add people*.
- [ ] Everybody clones the repository: `git clone https://github.com/<your-team>/<your-repo>.git`
- [ ] Fill in [product-vision.md](product-vision.md) together (see [2.1](#21-write-down-your-product-vision)).

**Done when:** every team member can push a commit to the team repository.

### 1.3 Choose your track

**Why:** the track decides how many technical points you can reach ([code, mockup and concept](scoring.md#code-mockup-and-concept)). It does not limit your business or agile score.

| Track | What you deliver | Max. technical points |
|---|---|---|
| **Working code** | A product that runs from the README, with stored data, rules and tests | 10 |
| **Clickable mockup** | A prototype that shows the main screens and the flow between them | 6 |
| **Concept on paper** | Documents and diagrams | 5 |

Be honest about your team. If two people have built a web application before, go for code. If nobody has, a strong mockup plus good decisions is a respectable result, and your concept still earns points in the business and agile dimensions.

**A good path for most teams:** start with a quick mockup on Friday (it counts as a building block under [criterion 4 · Architecture and engineering practice](scoring.md#criterion-4--architecture-and-engineering-practice-02) anyway), then build the core flow in code. If the code does not work in the end, you still have the mockup.

**Done when:** your track is written into [product-vision.md](product-vision.md) by Friday noon.

### 1.4 Working with AI (and without)

There are three ways to work with this guide. Mix them as you like.

| You have … | How to use this guide |
|---|---|
| **No AI** | Follow the *Do* lists and the templates in `docs/`. Everything works by hand. |
| **An AI chat** in the browser (ChatGPT, Gemini, Claude, Copilot on github.com) | Start every new chat with the **context prompt** below, then copy the prompt of the step you are working on. |
| **A coding agent** in your editor (GitHub Copilot in VS Code, Claude Code, Cursor …) | The agent reads [AGENTS.md](../AGENTS.md) and the skills in `.claude/skills/` automatically. Just say what you want, for example *"help us pick a stack"* or *"review our repo against the scoring"*. In GitHub Copilot Chat (agent mode) or Claude Code, type `/` to see the skills, for example `/kickoff` or `/hackathon-review`. |

**The context prompt.** An AI knows nothing about your product. Paste this at the start of every new chat, together with the content of your [product-vision.md](product-vision.md):

```prompt
You are helping our hackathon team. We build a time booking product
for a large company that buys project work from external service providers.
The client wants to record, check and plan the work its suppliers deliver.

Here is our product vision:
{{paste docs/product-vision.md}}

Rules for your answers:
- We are junior developers. Explain briefly why, not only what.
- Prefer simple, boring technology that runs on a laptop.
- Make small steps. After each step, tell us how to check that it works.
- When there is a real choice, show 2-3 options with pros and cons
  and let us decide.
```

**Rules for working with AI:**

- **Small steps.** Never ask for "the whole app". Ask for one entity, one rule, one screen. Run it, then continue.
- **Read what you get.** The jury will ask you about your code. If nobody in the team can explain a file, do not commit it.
- **Let AI propose, decide yourselves.** Ask for options. Your decision and its reason go into an ADR (see [2.5](#25-record-decisions-adrs)).
- **No secrets in prompts.** Do not paste passwords, tokens or real personal data.
- **AI inside your product** (for example "ask in plain language") is welcome but optional. It must have a switch that replaces the AI with a fake answer, because the technical jury starts your product without paid API keys.
- **Free AI has limits.** Copilot Free allows a limited number of chat requests per month and person. Do not waste them on things a search engine can answer.

---

## Phase II · Decide

### 2.1 Write down your product vision

**Why:** everything else builds on it, and every AI prompt needs it as context.

**Do:** fill in [product-vision.md](product-vision.md). It takes 30 minutes and answers: who you build for first, what problem you solve, which roles exist, what you leave out, and which track you chose. Keep it short. Update it when your ideas change.

```prompt
Here is the challenge for our hackathon:
{{paste docs/challenge.md}}

Interview us to write our product vision. Ask one question at a time,
at most 8 questions in total, about: who uses the product first,
the problem we solve for them, the roles involved on the client side
and on the supplier side, what we leave out on purpose, and whether we
build working code, a clickable mockup or a concept.
At the end, fill in this template with our answers:
{{paste docs/product-vision.md}}
```

**Done when:** [product-vision.md](product-vision.md) has no `TODO` left.

### 2.2 Pick a simple stack

**Why:** the technical jury looks for a clear structure ([criterion 4 · Architecture and engineering practice](scoring.md#criterion-4--architecture-and-engineering-practice-02)) and starts your product from the README ([criterion 5 · Runs from the README](scoring.md#criterion-5--runs-from-the-readme-01)). Both are much easier with a stack you know than with one that is fashionable.

**Do:**

1. Ask: *what does at least one of us already know?* Start there.
2. Prefer **one language** for the whole product.
3. Prefer a framework that **does a lot for you**: database access, input validation, API documentation, test runner.
4. **SQLite is enough** for a hackathon. It is a file, needs no server and no Docker. Use PostgreSQL only if you know it.
5. Avoid anything that needs a paid cloud account to start.
6. Write the decision down as your first ADR (see [2.5](#25-record-decisions-adrs)).

**Examples** (none of them is required, all of them work):

| Language | Example stack | Strengths |
|---|---|---|
| TypeScript | Next.js + SQLite or PostgreSQL + Vitest | One language for UI and API. The `blueprint` branch of this repo uses Next.js, PostgreSQL and Swagger. |
| Python | FastAPI + SQLModel + SQLite + pytest, UI with plain HTML templates or a small React app | Very little code; API documentation (Swagger) is generated automatically. |
| Java / Kotlin | Spring Boot + Spring Data JPA + H2 or PostgreSQL + JUnit + springdoc-openapi | Clear layers, strong for business rules; heavier to set up. |
| C# | ASP.NET Core Minimal API + Entity Framework Core + SQLite + xUnit | Fast start, built-in OpenAPI. |
| No code | Figma, Penpot, or plain HTML/CSS/JS files opened in the browser | For the mockup track. AI can generate clickable HTML prototypes quickly. |

```prompt
Based on our product vision (above), suggest 3 different technology stacks
for a web application we can build in 4 days on our laptops.

What we know: {{e.g. "two of us did a Python course, one knows a bit of React"}}
Our track: {{working code / mockup}}

For each stack give: languages and frameworks, database, how to run the
tests, how API documentation is produced, how hard the setup is for
beginners, and what could go wrong. Prefer SQLite unless there is a
reason not to. Nothing may require a paid account.
Do not pick one for us. End with 3 questions that help us decide.
```

**Done when:** you agreed on one stack, everybody has its runtime installed, and the decision is recorded in `docs/adr/0001-…md`.

### 2.3 Model the domain

**Why:** the technical jury checks that your data is stored on the server, survives a restart and follows a documented model. A small implementation plus a diagram of the next stage is enough for full points ([criterion 1 · Persistence and data model](scoring.md#criterion-1--persistence-and-data-model-02)).

**Do:**

1. Collect the **words** your users use: order, booking, budget, consultant, supplier, approval … Write each with a one-line meaning into [domain.md](domain.md). The glossary in [challenge.md](challenge.md#terms) helps.
2. Turn the words into **entities** with their most important fields and **relations** (an order has many bookings; a booking belongs to one consultant …).
3. Draw an **entity relationship (ER) diagram** in [domain.md](domain.md). Mermaid diagrams are text and render directly on GitHub.
4. Mark which entities you **build now** and which belong to the **next expansion stage**. A smaller implementation plus a diagram of the next stage still earns full points.

```prompt
Based on our product vision (above), help us model the domain.
1. List the 8-12 most important business terms with a one-line meaning.
2. Propose entities with their key fields and relations.
3. Draw an ER diagram in Mermaid syntax (erDiagram).
4. Mark which entities we need for our core flow
   ("consultant books time on an order, client sees budget impact")
   and which can wait for a later stage.
Keep it as small as possible. Ask us before adding anything that is
not in our vision.
```

**Done when:** [domain.md](domain.md) contains a glossary and an ER diagram, and the core entities are marked.

### 2.4 Roles and privacy

**Why:** the technical jury checks that you decided who may see and do what, with clearly different roles and the personal data involved. A written concept is enough for full points; implementation is optional ([criterion 3 · Roles, permissions and data privacy](scoring.md#criterion-3--roles-permissions-and-data-privacy-02)).

**Do:**

1. List the roles on **both sides**: for example the supplier's consultant, the client's project lead, the client's purchasing, finance.
2. Fill in the **role matrix** in [roles-and-privacy.md](roles-and-privacy.md): who may *see* what, who may *do* what.
3. Name the **personal data** in your product (names, daily hours, vacation …) and who really needs it. Example: purchasing needs hours *per order*, not *per person and day*.
4. If you build code: **check permissions on the server**, not only by hiding buttons. A request from the wrong role must fail.
5. If you build a mockup: show the **different screens per role**, for example the consultant's booking screen next to purchasing's summary. That counts as part of the concept.

**Best practice:** for the demo you do not need a real login. Seed one demo user per role and offer a simple sign-in or role switch. How real sign-in should work (single sign-on with the client's identity provider) goes into an ADR.

```prompt
Based on our product vision (above), help us write a permission concept.
1. List the roles on the client side and on the supplier side.
2. Create a role matrix as a Markdown table: rows are actions and data
   (e.g. "book time", "see single bookings of a project",
   "see hours per order", "approve proof of work"), columns are roles.
3. List the personal data we store and, for each item, which roles
   really need it and why. Apply data minimisation.
4. Point out where two interests conflict (e.g. transparency vs. privacy).
Keep the roles clearly different from each other, not just "admin" and "user".
```

**Done when:** [roles-and-privacy.md](roles-and-privacy.md) has at least two clearly different roles from different sides, a filled matrix and a list of personal data.

### 2.5 Record decisions (ADRs)

**Why:** three ADRs are one of the building blocks the technical jury counts under [criterion 4 · Architecture and engineering practice](scoring.md#criterion-4--architecture-and-engineering-practice-02). They also help in your pitch, because you can explain why you built it this way.

An **Architecture Decision Record** is half a page: the context, the decision, the alternatives you considered and the consequences. Copy [adr/0000-template.md](adr/0000-template.md) to a new file with the next number.

**Write at least three ADRs. Two topics are required:**

| Required topic | Questions to answer |
|---|---|
| **Identity** | How do users sign in? The client is a large company: it wants single sign-on with its own identity provider, and every customer of your product may use a different one. What do you do in the demo, what in production? |
| **Operation** | Does your product run in the cloud, at the client's site, or both? How does it scale to thousands of bookings per month? |

**Good further topics:** your stack and database (from [2.2](#22-pick-a-simple-stack)), the architecture pattern, how you store and delete personal data, the use of AI and which data leaves the system.

**Best practice:** write an ADR *when* you decide, not on Tuesday. If you notice that you just chose a library, a database or a hosting option, that is an ADR. Alternatives must be real: "we considered PostgreSQL but chose SQLite because …" is good; a list of options nobody looked at is not.

```prompt
Help us write an Architecture Decision Record (ADR) using this template:
{{paste docs/adr/0000-template.md}}

The decision: {{e.g. "how users sign in" / "we use SQLite"}}
What we know so far: {{our thoughts, constraints, what we tried}}

Ask us up to 3 questions first if something important is unclear.
Then write the ADR: at least 2 real alternatives with pros and cons,
and honest consequences, including the negative ones.
Maximum half a page. Do not invent facts about our product.
```

**Done when:** `docs/adr/` contains at least three ADRs, including identity and operation.

---

## Phase III · Build

### 3.1 Build a walking skeleton

**Why:** a thin version that runs end to end already covers much of what the technical jury looks for: stored data ([criterion 1 · Persistence and data model](scoring.md#criterion-1--persistence-and-data-model-02)), a clear structure, API documentation and containers ([criterion 4 · Architecture and engineering practice](scoring.md#criterion-4--architecture-and-engineering-practice-02)), and a start from the README ([criterion 5 · Runs from the README](scoring.md#criterion-5--runs-from-the-readme-01)). In the demo it also beats many half-finished features.

A **walking skeleton** is the smallest version of your product that goes through every layer: one screen, one API call, one table, one test, started with documented commands. Build it first, then make it thicker.

**Do:**

1. Create the project with the official starter of your framework.
2. Use a **clear structure** (criterion 4, block A). Keep apart:
   - **API objects (DTOs):** what goes over the wire
   - **Domain objects:** your business terms and rules
   - **Persistence entities:** what is stored in the database

   Folder names should show it, for example `api/`, `domain/`, `persistence/`.
3. Add **seed data** and **one demo user per role**, created automatically on first start.
4. Put every configuration value into **`.env.example`** with a safe default. Never commit real secrets.
5. Optional building blocks for criterion 4 (architecture and engineering practice):
   - **API documentation** (criterion 4, block D): OpenAPI / Swagger UI. Many frameworks generate it.
   - **Containers** (criterion 4, block E): a `compose.yaml` that starts database, backend and frontend.
6. Write the commands to install, run and test into the [README](../README.md) **right away**. Add each new step the moment you need it.

```prompt
We use {{our stack}}. Help us create a walking skeleton for our core flow:
a consultant books working time on an order, and the client sees the
remaining budget of that order.

Requirements:
- Separate API DTOs, domain objects and persistence entities,
  each in its own folder.
- Store data in {{SQLite / PostgreSQL}}; data must survive a restart.
- Seed data on first start: 2 orders, 3 consultants, a few bookings,
  and one demo user per role: {{our roles}}.
- All configuration in .env.example with safe defaults.
- One example unit test and one command to run all tests.
- {{optional: OpenAPI/Swagger UI}} {{optional: compose.yaml}}

Go step by step. After each step, give us the exact command to check it
works, and wait for our OK. At the end, list the exact commands for the
README sections Setup, Run and Test.
```

**Done when:** a fresh clone starts with the commands in the README, shows seed data, and one test passes.

### 3.2 Business rules and tests

**Why:** the technical jury checks that your rules live in one place in the domain, are enforced on the server and are covered by tests that also prove a rejection. This criterion carries the most technical points ([criterion 2 · Business rules and unit tests](scoring.md#criterion-2--business-rules-and-unit-tests-03)).

**Do:**

1. Pick your rules. Typical ones for this case:
   - a booking may not exceed the free budget of its order
   - one person cannot have two bookings at the same time
   - a rule of the German Working Time Act, for example at most 10 hours per day, or 11 hours of rest between two working days
   - no bookings on approved vacation days or public holidays
2. Put each rule in **one place in the domain**, for example `Order.book(hours)`, not in the screen and not spread over controllers.
3. **Enforce it on the server.** A disabled button is not enough: the API must reject the request too.
4. Return an **understandable error**: *"Booking rejected: only 2.5 PD left on order 4500012345."*
5. Write **unit tests for every rule**, at least one where the rule *accepts* and one where it *rejects*. Name tests like sentences: `rejects booking beyond free budget`.
6. All tests run with **one command**, written in the README.

```prompt
We use {{our stack}}. Here is our domain code for {{entity}}:
{{paste the code}}

Implement this business rule: {{rule, e.g. "a booking may not exceed
the free budget of its order"}}

Requirements:
- The rule lives in the domain object, not in the controller or UI.
- The API rejects violating requests with HTTP 4xx and a clear message
  that a user understands.
- Write unit tests: at least one accepted case, one rejected case,
  and one edge case (e.g. exactly the remaining budget).
  Name tests as sentences.
Explain the code briefly so we can explain it to the jury.
```

**Done when:** every rule you implemented has an accept test and a reject test, and the test command in the README runs green.

### 3.3 Make it yours (UI and mockup)

**Why:** a clickable mockup counts as a building block under [criterion 4 · Architecture and engineering practice](scoring.md#criterion-4--architecture-and-engineering-practice-02), and views per role make your concept under [criterion 3 · Roles, permissions and data privacy](scoring.md#criterion-3--roles-permissions-and-data-privacy-02) more convincing. A good UI also strengthens your pitch, which the business jury scores.

Five teams, one challenge: if all five products look like the same template, nobody stands out. Design for *your* users.

**Do:**

1. Decide **who** looks at the screen and **what one thing** they must see in 3 seconds (for example: *"Will my budget last?"*).
2. Sketch the main screens on paper first: one per role.
3. Pick a **visual direction** that fits your product's character: calm and precise for finance, fast and mobile for consultants … Choose a colour palette and a font on purpose.
4. **Mockup** (criterion 4, block F): Figma, Penpot, or plain HTML pages that link to each other. Commit exports or the HTML files to `docs/mockup/` every day.
5. Build the real UI from the mockup. Re-use the mockup in your pitch.

```prompt
Based on our product vision (above), propose 3 clearly different visual
directions for our product. For each: a name, the feeling it should
create, a colour palette (hex codes), a font pairing, and how the main
screen for {{role}} would be laid out. Avoid generic dashboard templates.

Then, for the direction we choose, create a clickable prototype as plain
HTML/CSS files (no build tools, opens in the browser): one screen per
role, linked so we can click through the core flow. Use fake data
that fits our domain.
```

**Done when:** you have a sketch or mockup for every role, committed to the repository.

### 3.4 Git like a team

**Why:** the technical jury reads your Git history to see that you built the work yourself during the hackathon ([preconditions](scoring.md#preconditions)). A steady history also counts as a building block under [criterion 4 · Architecture and engineering practice](scoring.md#criterion-4--architecture-and-engineering-practice-02).

**Do:**

- **Commit small and often**: at least two meaningful commits per hackathon day as a team, ideally many more. Each commit adds one thing: a feature, a fix or a document.
- **Write clear messages**: `Add budget check to booking` beats `update`. Optional convention: `feat: …`, `fix: …`, `docs: …`, `test: …`.
- **Use feature branches** for larger work: `git switch -c feature/budget-forecast`, then merge via a pull request on GitHub.
- **Pull before you push**: `git pull --rebase`, then `git push`.
- **Pair programming:** add `Co-authored-by: Name <email>` at the end of the commit message so both people are visible.
- **Never commit** secrets, `.env` files with real values, or large generated folders (`node_modules`, `target`, `.venv`). The `.gitignore` already covers the common ones.
- **Mockup and concept teams commit too:** exports, screenshots and documents, every day.

```prompt
Here is the output of `git status` and `git diff --staged`:
{{paste}}
Suggest how to split this into small commits with clear messages
(format: "feat|fix|docs|test: what changed"). Give us the exact git commands.
```

**Done when:** `git log --oneline` shows a steady history across the days.

---

## Phase IV · Ship

### 4.1 README and run check

**Why:** the technical jury starts your product from the README alone ([criterion 5 · Runs from the README](scoring.md#criterion-5--runs-from-the-readme-01)) and uses your evidence map to find the proof for the other technical criteria quickly.

On Tuesday, the technical jury clones your repository, reads **only** your README and tries to start the product within **5 minutes**. First a coding agent tries, then a juror by hand. Nobody asks you questions. The full procedure is in [scoring.md](scoring.md#run-check-for-the-juror).

**Do:**

1. Keep the six sections of the [README](../README.md): *Prerequisites · Setup · Run · Test · Demo users · Evidence map.*
2. Write **exact commands, versions and ports**, not prose. "Install dependencies" is not a command; `npm ci` is.
3. **Demo users:** one per role, with how to sign in.
4. **Evidence map:** for each technical criterion (data model, rules and tests, roles and privacy, architecture), link the file or folder where the jury finds the proof.
5. **Run check, Monday evening and Tuesday 10:00 at the latest:** a team member who did *not* set up the project clones the repository into a new folder and follows the README word by word. Every place they get stuck is a bug in the README.

```prompt
Act as a person who has never seen our project. Here is our README:
{{paste README.md}}
And here is the list of files in our repository:
{{paste the output of "git ls-files"}}

Follow the README strictly. For every step, say whether it is
unambiguous and complete. List everything that is missing: versions,
commands, ports, environment variables, seed data, demo users, test
command. Also check that every evidence map link points to a file
that exists. Do not guess missing steps.
```

**Done when:** someone outside the setup ran your product from a fresh clone using only the README, in less than 5 minutes.

### 4.2 Final review

**Why:** find gaps in the technical criteria while there is still time to close them.

**Do:** go through the technical criteria in [scoring.md](scoring.md) one by one and check your repository against them. Do this at least on **Sunday evening** and **Monday evening**, not only on Tuesday.

**With a coding agent:** say *"review our repo against the hackathon scoring"*, or type `/hackathon-review` in the chat of GitHub Copilot or Claude Code. The `hackathon-review` skill checks every technical criterion and the preconditions, and lists what is missing, for example a technology without an ADR, a rule without a reject test, or a README section that is empty. It does not give points: that is the job of the jury.

**With an AI chat:**

```prompt
Act as the technical juror of our hackathon. Here are the scoring rules:
{{paste docs/scoring.md}}

Here is our README and the list of files in our repository:
{{paste README.md}}
{{paste the output of "git ls-files"}}

For each technical criterion and for the preconditions, tell us what
evidence you can find and what is missing. Be concrete: name files.
Do not give points. End with the 3 most valuable things we can still
do in the time left.
```

**Done when:** every criterion you aim for has evidence that is linked in the evidence map.

---

## A suggested schedule

| Day | Focus |
|---|---|
| **Friday** | Set up, product vision, track, stack ADR, domain model, first mockup sketches |
| **Saturday** | Walking skeleton runs, roles and privacy concept, identity ADR |
| **Sunday** | Business rules with tests, role views, operation ADR, first full review |
| **Monday** | Polish the core flow, README, run check by a teammate, second review |
| **Tuesday** | Until 11:00: final run check, last fixes, freeze. Then: present. |
