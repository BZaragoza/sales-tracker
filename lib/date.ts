const DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/

/**
 * The app groups everything by a plain `yyyy-MM-dd` "day key" chosen by the
 * client (the device's local calendar day). The server always interprets that
 * key as a full UTC day so that writes and reads are consistent regardless of
 * the server timezone (Vercel runs in UTC).
 */
export function isValidDateKey(value: string | null | undefined): value is string {
  return !!value && DATE_KEY_REGEX.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))
}

export function todayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

export function resolveDateKey(value: string | null | undefined): string {
  return isValidDateKey(value) ? value : todayKey()
}

export function startOfDay(dateKey: string | null | undefined): Date {
  return new Date(`${resolveDateKey(dateKey)}T00:00:00.000Z`)
}

export function endOfDay(dateKey: string | null | undefined): Date {
  return new Date(`${resolveDateKey(dateKey)}T23:59:59.999Z`)
}

export function dayRange(dateKey: string | null | undefined): { gte: Date; lte: Date } {
  return { gte: startOfDay(dateKey), lte: endOfDay(dateKey) }
}