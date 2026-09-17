import { useMemo } from "react";
import { format, isSameMonth } from "date-fns";
import { useTranslation } from "react-i18next";
import type { EventListItem } from "./types";
import { colorForPromotion } from "./promotionColors";
import { getDateLocale, getWeekdayLabels } from "./dateLocale";
import { dayKeyInZone, useTimezone, zonedDate } from "./timezone";
import { dayKey, getMonthGridDays, useEventsByDay } from "./calendarData";
import FightCardExpander from "./FightCardExpander";

const MAX_DOTS_PER_DAY = 4;

interface YearCalendarProps {
  year: number;
  events: EventListItem[];
  selectedDay: string | null;
  onSelectDay: (key: string | null) => void;
}

export default function YearCalendar({ year, events, selectedDay, onSelectDay }: YearCalendarProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);
  const timeZone = useTimezone();
  const monthNames = useMemo(
    () => Array.from({ length: 12 }, (_, m) => format(new Date(2000, m, 1), "MMMM", { locale: dateLocale })),
    [dateLocale],
  );
  const weekdayLabels = useMemo(() => getWeekdayLabels(dateLocale), [dateLocale]);

  // "Today" and "past" follow the selected zone too - if you've pinned Tokyo
  // it would be odd for the highlight to sit on your device's date instead.
  const todayKey = dayKeyInZone(new Date(), timeZone);

  const eventsByDay = useEventsByDay(events, timeZone);

  const selectedEvents = selectedDay ? (eventsByDay.get(selectedDay) ?? []) : [];

  return (
    <div className="year-grid">
      {monthNames.map((monthName, month) => {
        const days = getMonthGridDays(new Date(year, month, 1));
        return (
          <div className="year-grid-month" key={monthName}>
            <div className="year-grid-month-title">{monthName}</div>
            <div className="year-grid-weekdays">
              {weekdayLabels.map((label, i) => (
                <span key={i}>{label}</span>
              ))}
            </div>
            <div className="year-grid-days">
              {days.map((date) => {
                const key = dayKey(date);
                const dayEvents = eventsByDay.get(key) ?? [];
                const inMonth = isSameMonth(date, new Date(year, month, 1));
                const today = key === todayKey;
                const isPast = key < todayKey;
                return (
                  <button
                    key={key}
                    type="button"
                    className={
                      "year-grid-day" +
                      (inMonth ? "" : " year-grid-day-outside") +
                      (today ? " year-grid-day-today" : "") +
                      (isPast ? " year-grid-day-past" : "") +
                      (dayEvents.length > 0 ? " year-grid-day-has-events" : "") +
                      (selectedDay === key ? " year-grid-day-selected" : "")
                    }
                    onClick={() => (dayEvents.length > 0 ? onSelectDay(selectedDay === key ? null : key) : undefined)}
                    disabled={dayEvents.length === 0}
                  >
                    <span className="year-grid-day-number">{date.getDate()}</span>
                    {dayEvents.length > 0 && (
                      <span className="year-grid-day-dots">
                        {dayEvents.slice(0, MAX_DOTS_PER_DAY).map((event) => (
                          <span
                            key={event.id}
                            className="year-grid-dot"
                            style={{ backgroundColor: colorForPromotion(event.promotion.code) }}
                          />
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {selectedDay && selectedEvents.length > 0 && (
        <div className="year-grid-popover" role="dialog" aria-label={`Events on ${selectedDay}`}>
          <div className="year-grid-popover-header">
            <strong>{format(new Date(selectedDay + "T00:00:00"), "EEEE, MMMM d, yyyy", { locale: dateLocale })}</strong>
            <button type="button" className="year-grid-popover-close" onClick={() => onSelectDay(null)} aria-label={t("calendar.close")}>
              &times;
            </button>
          </div>
          <ul className="year-grid-popover-list">
            {selectedEvents
              .slice()
              .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
              .map((event) => (
                <li key={event.id}>
                  <a href={event.link} target="_blank" rel="noreferrer">
                    <span
                      className="year-grid-dot"
                      style={{ backgroundColor: colorForPromotion(event.promotion.code) }}
                    />
                    <span className="year-grid-popover-time">{format(zonedDate(event.startsAt, timeZone), "h:mm a", { locale: dateLocale })}</span>
                    <span className="year-grid-popover-title">{event.title}</span>
                  </a>
                  {event.mainEvent && (
                    <div className="year-grid-popover-subtitle">
                      <a href={event.mainEvent.fighterALink} target="_blank" rel="noreferrer">
                        {event.mainEvent.fighterA}
                      </a>{" "}
                      vs{" "}
                      <a href={event.mainEvent.fighterBLink} target="_blank" rel="noreferrer">
                        {event.mainEvent.fighterB}
                      </a>
                    </div>
                  )}
                  <FightCardExpander slug={event.slug} />
                </li>
              ))}
          </ul>
          <div className="year-grid-popover-footnote">
            {t("calendar.localTimezoneNote", { zone: timeZone.replace(/_/g, " ") })}
          </div>
        </div>
      )}
    </div>
  );
}
