// Reading accounts from a CSV file: only the format; the rules of each account are tested with createUser.
import { describe, expect, it } from "vitest"
import { MAX_IMPORT_ROWS, parseUserCsv } from "../../src/domain/user-import.js"

const HEADER = "email;name;role;supplier;state"

describe("reading the file", () => {
  it("reads semicolons, the way German Excel saves CSV", () => {
    const { rows, problems } = parseUserCsv(`${HEADER}\nnina@acme.example;Nina Neu;consultant;Acme;BY`)

    expect(problems).toEqual([])
    expect(rows).toEqual([{ line: 2, email: "nina@acme.example", name: "Nina Neu", role: "consultant", supplierName: "Acme", workState: "BY" }])
  })

  it("reads commas too, with Windows line ends and a byte order mark", () => {
    const { rows } = parseUserCsv("\uFEFFemail,name,role\r\nnina@acme.example,Nina Neu,purchasing\r\n")

    expect(rows[0]).toMatchObject({ email: "nina@acme.example", role: "purchasing", supplierName: null, workState: null })
  })

  it("accepts columns in any order, in any spelling", () => {
    const { rows } = parseUserCsv("Role;Name;EMAIL\nProject Manager;Paula;P@X.example")

    expect(rows[0]).toMatchObject({ email: "p@x.example", name: "Paula", role: "project_manager" })
  })

  it("skips empty lines, and counts the real line numbers", () => {
    const { rows } = parseUserCsv(`${HEADER}\n\nnina@acme.example;Nina Neu;purchasing;;`)

    expect(rows[0]!.line).toBe(3)
  })
})

describe("rejecting a whole file", () => {
  it("rejects a file without the columns it needs", () => {
    expect(() => parseUserCsv("name;role\nNina;consultant")).toThrow(expect.objectContaining({ code: "IMPORT_BAD_HEADER" }))
  })

  it("rejects a file that is too long", () => {
    const lines = Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) => `u${i}@acme.example;User;purchasing;;`)

    expect(() => parseUserCsv([HEADER, ...lines].join("\n"))).toThrow(expect.objectContaining({ code: "IMPORT_TOO_LARGE" }))
  })

  it("accepts a file of exactly the maximum", () => {
    const lines = Array.from({ length: MAX_IMPORT_ROWS }, (_, i) => `u${i}@acme.example;User;purchasing;;`)

    expect(parseUserCsv([HEADER, ...lines].join("\n")).rows).toHaveLength(MAX_IMPORT_ROWS)
  })
})

describe("rejecting a single line", () => {
  const problem = (line: string) => parseUserCsv(`${HEADER}\n${line}`).problems[0]!

  it("rejects something that is not an email", () => {
    expect(problem("nina;Nina Neu;consultant;;")).toMatchObject({ line: 2, code: "IMPORT_INVALID_EMAIL" })
  })

  it("rejects a name that is too short", () => {
    expect(problem("n@acme.example;N;consultant;;").code).toBe("IMPORT_INVALID_NAME")
  })

  it("rejects a role that does not exist", () => {
    expect(problem("n@acme.example;Nina;boss;;").code).toBe("IMPORT_INVALID_ROLE")
  })

  it("rejects a state that does not exist", () => {
    expect(problem("n@acme.example;Nina;consultant;Acme;XX").code).toBe("IMPORT_INVALID_STATE")
  })
})
