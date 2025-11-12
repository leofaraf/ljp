import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "date-fns"

export function getRange(mode) {
  const now = new Date()
  switch (mode) {
    case "week":
      return [
        startOfWeek(now, { weekStartsOn: 1 }),
        endOfWeek(now, { weekStartsOn: 1 }),
      ]
    case "month":
      return [startOfMonth(now), endOfMonth(now)]
    case "year":
      return [startOfYear(now), endOfYear(now)]
    default:
      return [now, now]
  }
}
