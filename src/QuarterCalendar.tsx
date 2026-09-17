import { useState } from "react";
import { addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth } from "date-fns";
import { useTranslation } from "react-i18next";
import type { EventListItem } from "./types";
import { getDateLocale } from "./dateLocale";
import { dayKeyInZone, useTimezone } from "./timezone";
import { dayKey, fromDayKey, useEventsByDay, weekStartKey } from "./calendarData";
import { HeatmapMonth } from "./HeatmapCalendar";
import EventList from "./EventList";

interface QuarterCalendarProps {
  months: Date[];
  events: EventListItem[];
}

// Three dot-only month grids to pick a week, and that week's cards listed in
// full underneath. Fight cards are sparse and land on weekends, so a normal
// 7-column grid spends most of its space on empty weekdays and truncates the
// names that matter - here the grid only navigates, and the list gets the room.
export default function QuarterCalendar({ months, events }: QuarterCalendarProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);
  const timeZone = useTimezone();
  const [pickedWeek, setPickedWeek] = useState<string | null>(null);

  const todayKey = dayKeyInZone(new Date(), timeZone);
  const eventsByDay = useEventsByDay(events, timeZone);

  const rangeStart = weekStartKey(startOfMonth(months[0]));
  const rangeEnd = dayKey(endOfWeek(endOfMonth(months[months.length - 1])));
  const inRange = (key: string) => key >= rangeStart && key <= rangeEnd;

  // A week picked in a previous quarter shouldn't survive navigating away
  // from it - fall back to today's week when visible, else the first one.
  const weekStart =
    pickedWeek && inRange(pickedWeek) ? pickedWeek : inRange(todayKey) ? weekStartKey(fromDayKey(todayKey)) : rangeStart;

  const weekDays = eachDayOfInterval({ start: fromDayKey(weekStart), end: endOfWeek(fromDayKey(weekStart)) });
  // Only what's still ahead - the list answers "what's on", not "what was".
  const weekEvents = weekDays.filter((day) => dayKey(day) >= todayKey).flatMap((day) => eventsByDay.get(dayKey(day)) ?? []);

  const weekEnd = weekDays[weekDays.length - 1];
  const weekLabel = isSameMonth(weekDays[0], weekEnd)
    ? `${format(weekDays[0], "MMM d", { locale: dateLocale })} – ${format(weekEnd, "d", { locale: dateLocale })}`
    : `${format(weekDays[0], "MMM d", { locale: dateLocale })} – ${format(weekEnd, "MMM d", { locale: dateLocale })}`;

  function shiftWeek(direction: 1 | -1) {
    const next = weekStartKey(addWeeks(fromDayKey(weekStart), direction));
    if (inRange(next)) setPickedWeek(next);
  }

  return (
    <div className="quarter-layout">
      <div className="quarter-months">
        {months.map((month) => (
          <HeatmapMonth
            key={month.toISOString()}
            month={month}
            events={events}
            size="compact"
            selectedWeekStart={weekStart}
            onSelectWeek={setPickedWeek}
          />
        ))}
      </div>

      <section className="quarter-week" aria-label={weekLabel}>
        <div className="quarter-week-header">
          <button type="button" className="quarter-week-nav" onClick={() => shiftWeek(-1)} aria-label={t("calendar.previousWeek")}>
            ‹
          </button>
          <h2 className="quarter-week-title">{weekLabel}</h2>
          <button type="button" className="quarter-week-nav" onClick={() => shiftWeek(1)} aria-label={t("calendar.nextWeek")}>
            ›
          </button>
        </div>
        {weekEvents.length === 0 ? (
          <p className="quarter-week-empty">{t("calendar.noEventsThisWeek")}</p>
        ) : (
          <EventList events={weekEvents} headline="matchup" showDay />
        )}
      </section>
    </div>
  );
}
