const DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/

/**
 * The business operates on a fixed UTC-6 calendar day. Every record is grouped
 * by that day key (`yyyy-MM-dd`) and the server always interprets a key as a
 * full UTC day, so writes and reads are consistent regardless of the server or
 * browser timezone.
 */
export const BUSINESS_UTC_OFFSET_HOURS = -6

export function isValidDateKey(value: string | null | undefined): value is string {
  return !!value && DATE_KEY_REGEX.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))
}

export function businessTodayKey(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() + BUSINESS_UTC_OFFSET_HOURS * 60 * 60 * 1000)
  return shifted.toISOString().slice(0, 10)
}

export function todayKey(now: Date = new Date()): string {
  return businessTodayKey(now)
}

export function resolveDateKey(value: string | null | undefined): string {
  return isValidDateKey(value) ? value : businessTodayKey()
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
