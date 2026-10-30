Follow the instructions in `AGENTS.md` at the root of this repository. Short version:

- This is a hackathon team repository. Read `docs/product-vision.md`, `docs/challenge.md` and `docs/scoring.md` before proposing anything substantial. `docs/scoring.md` covers only the technical jury; business and agile are scored separately.
- The team are junior developers: small steps, explain why, offer 2–3 options for real choices and let them decide.
- Every technical decision becomes an ADR in `docs/adr/`. Business rules live in the domain with accept and reject unit tests. Permissions are checked on the server. Keep the README sections and the evidence map current.
- Free Copilot accounts have a limited number of chat requests: prefer one thorough answer over many small ones.

## At the start of a conversation

Check briefly, without extra requests where possible, and mention the most relevant point once if it fits the user's request:

- `docs/product-vision.md` still contains `TODO` → suggest `/kickoff`.
- `docs/adr/` has fewer than three ADRs besides the template → mention the `adr` skill (identity and operation are required topics).
- The user is about to finish a day or hand in → suggest `/hackathon-review`.
