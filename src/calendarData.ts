import { useMemo } from "react";
import { eachDayOfInterval, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import type { EventListItem } from "./types";
import { dayKeyInZone } from "./timezone";

// The calendar views all bucket events by calendar day and lay months out
// as full weeks; this is the one place those rules live.

export function dayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function fromDayKey(key: string): Date {
  return new Date(key + "T00:00:00");
}

// Every day shown in a month grid: the month itself plus the leading and
// trailing days that complete its first and last weeks.
export function getMonthGridDays(month: Date): Date[] {
  return eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) });
}

// Keyed by the day the event falls on in the selected timezone, not the
// device's - pinning Tokyo should move a Saturday-night US card to Sunday.
export function useEventsByDay(events: EventListItem[], timeZone: string): Map<string, EventListItem[]> {
  return useMemo(() => {
    const map = new Map<string, EventListItem[]>();
    for (const event of events) {
      const key = dayKeyInZone(event.startsAt, timeZone);
      const existing = map.get(key);
      if (existing) existing.push(event);
      else map.set(key, [event]);
    }
    return map;
  }, [events, timeZone]);
}

export function matchupLabel(event: EventListItem): string {
  return event.mainEvent ? `${event.mainEvent.fighterA} vs ${event.mainEvent.fighterB}` : event.title;
}
