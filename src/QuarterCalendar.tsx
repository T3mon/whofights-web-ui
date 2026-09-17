import { useMemo, useState } from "react";
import { addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { useTranslation } from "react-i18next";
import type { EventListItem } from "./types";
import { colorForPromotion } from "./promotionColors";
import { getDateLocale, getWeekdayLabels } from "./dateLocale";
import { dayKeyInZone, useTimezone, zonedDate } from "./timezone";
import FightCardExpander from "./FightCardExpander";

const MAX_DOTS = 3;

function dayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function fromDayKey(key: string): Date {
  return new Date(key + "T00:00:00");
}

function weekStartKey(date: Date): string {
  return dayKey(startOfWeek(date));
}

function shortLocation(location: string | null): string | null {
  return location ? location.split(",").slice(0, 2).join(",") : null;
}

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
  const weekdayLabels = useMemo(() => getWeekdayLabels(dateLocale), [dateLocale]);
  const [pickedWeek, setPickedWeek] = useState<string | null>(null);

  const todayKey = dayKeyInZone(new Date(), timeZone);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventListItem[]>();
    for (const event of events) {
      const key = dayKeyInZone(event.startsAt, timeZone);
      const existing = map.get(key);
      if (existing) existing.push(event);
      else map.set(key, [event]);
    }
    return map;
  }, [events, timeZone]);

  const rangeStart = weekStartKey(startOfMonth(months[0]));
  const rangeEnd = dayKey(endOfWeek(endOfMonth(months[months.length - 1])));
  const inRange = (key: string) => key >= rangeStart && key <= rangeEnd;

  // A week picked in a previous quarter shouldn't survive navigating away
  // from it - fall back to today's week when visible, else the first one.
  const weekStart =
    pickedWeek && inRange(pickedWeek) ? pickedWeek : inRange(todayKey) ? weekStartKey(fromDayKey(todayKey)) : rangeStart;

  const weekDays = eachDayOfInterval({ start: fromDayKey(weekStart), end: endOfWeek(fromDayKey(weekStart)) });
  const weekEvents = weekDays
    .flatMap((day) => eventsByDay.get(dayKey(day)) ?? [])
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

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
        {months.map((month) => {
          const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) });
          return (
            <div key={month.toISOString()} className="quarter-month">
              <div className="quarter-month-title">{format(month, "MMMM", { locale: dateLocale })}</div>
              <div className="quarter-weekdays">
                {weekdayLabels.map((label, i) => (
                  <span key={i}>{label}</span>
                ))}
              </div>
              <div className="quarter-days">
                {days.map((date) => {
                  const key = dayKey(date);
                  const dayEvents = eventsByDay.get(key) ?? [];
                  const inWeek = weekStartKey(date) === weekStart;
                  return (
                    <button
                      key={key}
                      type="button"
                      className={
                        "quarter-day" +
                        (isSameMonth(date, month) ? "" : " quarter-day-outside") +
                        (key === todayKey ? " quarter-day-today" : "") +
                        (dayEvents.length > 0 ? " quarter-day-has-events" : "") +
                        (inWeek ? " quarter-day-in-week" : "")
                      }
                      onClick={() => setPickedWeek(weekStartKey(date))}
                      aria-label={format(date, "EEEE, MMMM d", { locale: dateLocale })}
                      aria-pressed={inWeek}
                    >
                      <span className="quarter-day-number">{date.getDate()}</span>
                      <span className="quarter-day-dots">
                        {dayEvents.slice(0, MAX_DOTS).map((event) => (
                          <span key={event.id} className="quarter-dot" style={{ backgroundColor: colorForPromotion(event.promotion.code) }} />
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
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
          <ul className="quarter-events">
            {weekEvents.map((event) => {
              const starts = zonedDate(event.startsAt, timeZone);
              const color = colorForPromotion(event.promotion.code);
              const location = shortLocation(event.location);
              return (
                <li key={event.id} className="quarter-event">
                  <div className="quarter-event-day">
                    <span className="quarter-event-day-number">{format(starts, "d")}</span>
                    <span className="quarter-event-day-name">{format(starts, "EEE", { locale: dateLocale })}</span>
                  </div>
                  <div className="quarter-event-main">
                    <div className="quarter-event-headline">
                      {event.mainEvent ? (
                        <>
                          <a href={event.mainEvent.fighterALink} target="_blank" rel="noreferrer">
                            {event.mainEvent.fighterA}
                          </a>{" "}
                          vs{" "}
                          <a href={event.mainEvent.fighterBLink} target="_blank" rel="noreferrer">
                            {event.mainEvent.fighterB}
                          </a>
                        </>
                      ) : (
                        <a href={event.link} target="_blank" rel="noreferrer">
                          {event.title}
                        </a>
                      )}
                    </div>
                    <div className="quarter-event-sub">
                      <span className="quarter-pill" style={{ color, backgroundColor: color + "22", borderColor: color + "55" }}>
                        {event.promotion.code}
                      </span>
                      {event.mainEvent && (
                        <a href={event.link} target="_blank" rel="noreferrer" className="quarter-event-title">
                          {event.title}
                        </a>
                      )}
                      {location && <span className="quarter-event-location">{location}</span>}
                    </div>
                    <FightCardExpander slug={event.slug} />
                  </div>
                  <span className="quarter-event-time">{format(starts, "h:mm a", { locale: dateLocale })}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
