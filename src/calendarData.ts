import { useMemo } from "react";
import { eachDayOfInterval, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import type { EventListItem } from "./types";
import { dayKeyInZone } from "./timezone";

// The calendar views all bucket events by calendar day and lay months out
// as full weeks; this is the one place those rules live.

// How many promotion dots a small day cell shows before it stops.
export const MAX_DAY_DOTS = 4;

export function dayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function fromDayKey(key: string): Date {
  return new Date(key + "T00:00:00");
}

export function weekStartKey(date: Date): string {
  return dayKey(startOfWeek(date));
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

export function sortByStart(events: EventListItem[]): EventListItem[] {
  return events.slice().sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

// "Already happened" is judged by day, not by the minute: a card that
// started two hours ago is still on; one dated yesterday is history. Same
// rule the grids use to dim past days.
export function isUpcoming(event: EventListItem, todayKey: string, timeZone: string): boolean {
  return dayKeyInZone(event.startsAt, timeZone) >= todayKey;
}

export function useUpcomingEvents(events: EventListItem[], timeZone: string): EventListItem[] {
  const todayKey = dayKeyInZone(new Date(), timeZone);
  return useMemo(() => events.filter((event) => isUpcoming(event, todayKey, timeZone)), [events, todayKey, timeZone]);
}

export function matchupLabel(event: EventListItem, versus: string): string {
  return event.mainEvent ? `${event.mainEvent.fighterA} ${versus} ${event.mainEvent.fighterB}` : event.title;
}

// "Las Vegas, Nevada, United States" -> "Las Vegas, Nevada"; the country
// rarely adds anything a fight fan needs at a glance.
export function shortLocation(location: string | null): string | null {
  return location ? location.split(",").slice(0, 2).join(",") : null;
}
