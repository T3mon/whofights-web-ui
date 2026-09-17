import { useMemo } from "react";
import { format, isSameMonth } from "date-fns";
import { useTranslation } from "react-i18next";
import type { EventListItem } from "./types";
import { colorForPromotion } from "./promotionColors";
import { getDateLocale, getWeekdayLabels } from "./dateLocale";
import { dayKeyInZone, useTimezone, zonedDate } from "./timezone";
import { dayKey, fromDayKey, getMonthGridDays, matchupLabel, useEventsByDay } from "./calendarData";
import FighterLinks from "./FighterLinks";
import FightCardExpander from "./FightCardExpander";

interface HeatmapMonthProps {
  month: Date;
  events: EventListItem[];
  size: "large" | "medium";
  selectedDay: string | null;
  onSelectDay: (key: string | null) => void;
}

const MAX_MATCHUP_LINES: Record<"large" | "medium", number> = { large: 4, medium: 2 };

function HeatmapMonth({ month, events, size, selectedDay, onSelectDay }: HeatmapMonthProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);
  const timeZone = useTimezone();
  const weekdayLabels = useMemo(() => getWeekdayLabels(dateLocale), [dateLocale]);

  const todayKey = dayKeyInZone(new Date(), timeZone);

  const eventsByDay = useEventsByDay(events, timeZone);

  const days = getMonthGridDays(month);
  const selectedEvents = selectedDay ? (eventsByDay.get(selectedDay) ?? []) : [];

  return (
    <div className={"heatmap-month heatmap-month-" + size}>
      <div className="heatmap-month-title">{format(month, "MMMM yyyy", { locale: dateLocale })}</div>
      <div className="heatmap-weekdays">
        {weekdayLabels.map((label, i) => (
          <span key={i}>{label}</span>
        ))}
      </div>
      <div className="heatmap-days" style={{ gridTemplateRows: `repeat(${days.length / 7}, 1fr)` }}>
        {days.map((date) => {
          const key = dayKey(date);
          const dayEvents = eventsByDay.get(key) ?? [];
          const inMonth = isSameMonth(date, month);
          const today = key === todayKey;
          const isPast = key < todayKey;
          const maxLines = MAX_MATCHUP_LINES[size];
          // Most prominent first (bigger card = more bouts), not chronological -
          // the point of this line is "what's the headliner", not a schedule.
          const rankedEvents = dayEvents.slice().sort((a, b) => b.boutCount - a.boutCount);
          const shownEvents = rankedEvents.slice(0, maxLines);
          const hiddenCount = rankedEvents.length - shownEvents.length;
          return (
            <button
              key={key}
              type="button"
              className={
                "heatmap-day" +
                (inMonth ? "" : " heatmap-day-outside") +
                (today ? " heatmap-day-today" : "") +
                (isPast ? " heatmap-day-past" : "") +
                (dayEvents.length > 0 ? " heatmap-day-has-events" : "") +
                (selectedDay === key ? " heatmap-day-selected" : "")
              }
              onClick={() => (dayEvents.length > 0 ? onSelectDay(selectedDay === key ? null : key) : undefined)}
              disabled={dayEvents.length === 0}
            >
              <span className="heatmap-day-top">
                <span className="heatmap-day-number">{date.getDate()}</span>
              </span>
              {shownEvents.length > 0 && (
                <span className="heatmap-matchups">
                  {shownEvents.map((event) => (
                    <span key={event.id} className="heatmap-matchup-line">
                      <span className="heatmap-matchup-dot" style={{ backgroundColor: colorForPromotion(event.promotion.code) }} />
                      <span className="heatmap-matchup-text">{matchupLabel(event)}</span>
                    </span>
                  ))}
                  {hiddenCount > 0 && <span className="heatmap-matchup-more">{t("calendar.moreCount", { count: hiddenCount })}</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selectedDay && isSameMonth(fromDayKey(selectedDay), month) && selectedEvents.length > 0 && (
        <div className="heatmap-popover" role="dialog" aria-label={`Events on ${selectedDay}`}>
          <div className="heatmap-popover-header">
            <strong>{format(fromDayKey(selectedDay), "EEEE, MMMM d, yyyy", { locale: dateLocale })}</strong>
            <button type="button" className="heatmap-popover-close" onClick={() => onSelectDay(null)} aria-label={t("calendar.close")}>
              &times;
            </button>
          </div>
          <ul className="heatmap-popover-list">
            {selectedEvents
              .slice()
              .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
              .map((event) => (
                <li key={event.id}>
                  <a href={event.link} target="_blank" rel="noreferrer">
                    <span className="heatmap-dot" style={{ backgroundColor: colorForPromotion(event.promotion.code) }} />
                    <span className="heatmap-popover-time">{format(zonedDate(event.startsAt, timeZone), "h:mm a", { locale: dateLocale })}</span>
                    <span className="heatmap-popover-title">{event.title}</span>
                  </a>
                  {event.mainEvent && (
                    <div className="heatmap-popover-subtitle">
                      <FighterLinks bout={event.mainEvent} />
                    </div>
                  )}
                  <FightCardExpander slug={event.slug} />
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface HeatmapCalendarProps {
  months: Date[];
  events: EventListItem[];
  selectedDay: string | null;
  onSelectDay: (key: string | null) => void;
}

export default function HeatmapCalendar({ months, events, selectedDay, onSelectDay }: HeatmapCalendarProps) {
  const size = months.length === 1 ? "large" : "medium";
  return (
    <div className="heatmap-layout">
      {months.map((month) => (
        <HeatmapMonth
          key={month.toISOString()}
          month={month}
          events={events}
          size={size}
          selectedDay={selectedDay}
          onSelectDay={onSelectDay}
        />
      ))}
    </div>
  );
}
