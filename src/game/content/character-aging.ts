const dayMs = 86_400_000;
const pacificDate = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  hourCycle: "h23",
});

function localParts(time: number) {
  return Object.fromEntries(pacificDate.formatToParts(time).map((part) => [part.type, Number(part.value)]));
}

function saturdayNoon(localDate: number) {
  // Noon always exists once, including during the spring and autumn clock changes.
  const probe = localDate + 20 * 3_600_000;
  const hour = localParts(probe).hour;
  return probe + (12 - hour) * 3_600_000;
}

function latestBoundary(time: number) {
  const { year, month, day } = localParts(time);
  const date = Date.UTC(year, month - 1, day);
  const daysSinceSaturday = (new Date(date).getUTCDay() + 1) % 7;
  let saturday = date - daysSinceSaturday * dayMs;
  if (saturdayNoon(saturday) > time) saturday -= 7 * dayMs;
  return { date: saturday, boundary: saturdayNoon(saturday) };
}

/** Weekly aging occurs Saturday at noon in America/Los_Angeles. */
export function ageInterval(now: number, after: number): { boundary: number; weeks: number } {
  if (!Number.isFinite(now) || !Number.isFinite(after)) throw new RangeError("Aging requires finite timestamps.");
  const current = latestBoundary(now);
  if (now <= after) return { boundary: Math.max(after, current.boundary), weeks: 0 };
  const previous = latestBoundary(after);
  return { boundary: current.boundary, weeks: Math.round((current.date - previous.date) / (7 * dayMs)) };
}
