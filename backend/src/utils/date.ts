const TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata';

function partsFor(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });
  const p = dtf.formatToParts(date);
  const get = (type: string) => parseInt(p.find(x => x.type === type)?.value || '0', 10);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

// returns Date that is the UTC instant corresponding to local 00:00 in TIMEZONE
export function getDateAtMidnight(date: Date): Date {
  // 1) get the date parts in the target timezone
  const { year, month, day } = partsFor(date, TIMEZONE);

  // 2) compute the UTC instant for that timezone's midnight:
  //    Build a Date representing that midnight *as if it were UTC* (Date.UTC)
  //    and then shift it by the timezone's offset at that moment.
  const midnightAsUtcMillis = Date.UTC(year, month - 1, day, 0, 0, 0);

  // To find the timezone offset at that midnight, ask Intl how the timezone
  // represents that UTC instant (gives us the wall-clock), then compare.
  // Create a Date object for the same UTC instant then format it in TIMEZONE.
  const referenceDate = new Date(midnightAsUtcMillis);
  const tzParts = partsFor(referenceDate, TIMEZONE);
  // Convert the timezone's wall-clock at that instant back to a UTC millis:
  const tzAsUtcMillis = Date.UTC(tzParts.year, tzParts.month - 1, tzParts.day, tzParts.hour, tzParts.minute, tzParts.second);

  // offset = tzAsUtcMillis - referenceDate.getTime()
  const offsetMs = tzAsUtcMillis - referenceDate.getTime();

  // The correct UTC instant for TIMEZONE midnight is referenceDate - offsetMs
  const localMidnightUtc = new Date(midnightAsUtcMillis - offsetMs);

  return localMidnightUtc;
}

export function getTodayDate(): Date {
  return getDateAtMidnight(new Date());
}

export function getUtcRangeForLocalDate(localMidnightDate: Date) {
  // localMidnightDate must be the UTC instant for the zone's midnight
  const startUtc = localMidnightDate;
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);
  return { startUtc, endUtc };
}
