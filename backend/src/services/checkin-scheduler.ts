// Daily check-in event generation.
//
// For each active user with an active schedule we create one pending
// checkin_event for "today" at their locally-scheduled hour, expressed as a
// UTC instant (the DB stores timestamptz; we store UTC and the schedule's hour
// is interpreted in the user's timezone per the project's TZ rules).
//
// generateCheckinEventsForToday is idempotent: running it again on the same
// day for the same user is a no-op.

import { CheckinEvent, PrismaClient } from '@prisma/client';

interface WallClock {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

// Returns the wall-clock components of `date` as observed in `timeZone`.
function wallClockInZone(date: Date, timeZone: string): WallClock {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  // Intl can emit hour "24" at midnight; normalise to 0.
  const hour = get('hour') % 24;
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour,
    minute: get('minute'),
    second: get('second'),
  };
}

// Converts a wall-clock time in `timeZone` to the corresponding UTC instant.
// Works by guessing the UTC instant from the wall-clock values, measuring how
// that instant actually renders in the zone, and correcting by the difference
// (which is the zone's UTC offset, DST included).
export function zonedWallClockToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  timeZone: string
): Date {
  const wantedUtc = Date.UTC(year, month - 1, day, hour, 0, 0);
  const rendered = wallClockInZone(new Date(wantedUtc), timeZone);
  const renderedUtc = Date.UTC(
    rendered.year,
    rendered.month - 1,
    rendered.day,
    rendered.hour,
    rendered.minute,
    rendered.second
  );
  const offset = renderedUtc - wantedUtc;
  return new Date(wantedUtc - offset);
}

// Computes the UTC instant for today's scheduled check-in, where "today" and
// the hour are interpreted in the user's timezone.
export function scheduledInstantForToday(now: Date, scheduledHour: number, timeZone: string): Date {
  const today = wallClockInZone(now, timeZone);
  return zonedWallClockToUtc(today.year, today.month, today.day, scheduledHour, timeZone);
}

export async function generateCheckinEventsForToday(
  prisma: PrismaClient,
  now: Date = new Date()
): Promise<CheckinEvent[]> {
  const schedules = await prisma.checkinSchedule.findMany({
    where: {
      isActive: true,
      user: { deletedAt: null, isActive: true, isPaused: false },
    },
    include: { user: true },
  });

  const created: CheckinEvent[] = [];

  for (const schedule of schedules) {
    // Only daily frequency is generated automatically; weekly/custom cadences
    // need a day-of-week column that the schema does not yet have.
    if (schedule.frequency !== 'daily') continue;

    const scheduledAt = scheduledInstantForToday(now, schedule.scheduledHour, schedule.user.timezone);

    // Idempotency: skip if today's event already exists for this user.
    const existing = await prisma.checkinEvent.findFirst({
      where: { userId: schedule.userId, scheduledAt },
    });
    if (existing) continue;

    const event = await prisma.checkinEvent.create({
      data: { userId: schedule.userId, scheduledAt, status: 'pending' },
    });
    created.push(event);
  }

  return created;
}
