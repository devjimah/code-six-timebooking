/** "95,50" or "95.50" → 9550 cents; NaN if it is not a number. German users type a decimal comma. */
export const euroToCents = (text: string) => Math.round(Number(text.replace(",", ".")) * 100)
