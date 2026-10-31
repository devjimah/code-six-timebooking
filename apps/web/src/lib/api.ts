// Thin fetch wrapper for the API. Every error response of the API has the shape { code, message }
// (see apps/api/src/api/error-handler.ts); we turn it into an ApiError so screens can translate the code.

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers },
      credentials: "same-origin", // sends the session cookie
    })
  } catch {
    // fetch only throws when the server cannot be reached at all
    throw new ApiError(0, "NETWORK_ERROR", "The server cannot be reached.")
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new ApiError(response.status, body.code ?? "INTERNAL_ERROR", body.message ?? response.statusText)
  }
  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}
