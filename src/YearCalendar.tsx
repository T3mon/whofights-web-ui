import { useMemo } from "react";
import { format, isSameMonth } from "date-fns";
import { useTranslation } from "react-i18next";
import type { EventListItem } from "./types";
import { colorForPromotion } from "./promotionColors";
import { getDateLocale, getWeekdayLabels } from "./dateLocale";
import { dayKeyInZone, useTimezone } from "./timezone";
import { MAX_DAY_DOTS, dayKey, getMonthGridDays, useEventsByDay } from "./calendarData";
import DayPopover from "./DayPopover";

interface YearCalendarProps {
  year: number;
  events: EventListItem[];
  selectedDay: string | null;
  onSelectDay: (key: string | null) => void;
}

export default function YearCalendar({ year, events, selectedDay, onSelectDay }: YearCalendarProps) {
  const { i18n } = useTranslation();
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
                        {dayEvents.slice(0, MAX_DAY_DOTS).map((event) => (
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
        <DayPopover dayKey={selectedDay} events={selectedEvents} onClose={() => onSelectDay(null)} />
      )}
    </div>
  );
}
