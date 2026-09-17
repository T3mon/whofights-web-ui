import { useMemo } from "react";
import { format, isSameMonth } from "date-fns";
import { useTranslation } from "react-i18next";
import type { EventListItem } from "./types";
import { colorForPromotion } from "./promotionColors";
import { getDateLocale, getWeekdayLabels } from "./dateLocale";
import { dayKeyInZone, useTimezone } from "./timezone";
import { MAX_DAY_DOTS, dayKey, fromDayKey, getMonthGridDays, matchupLabel, useEventsByDay, weekStartKey } from "./calendarData";
import DayPopover from "./DayPopover";

export type HeatmapMonthSize = "large" | "medium" | "compact";

interface HeatmapMonthProps {
  month: Date;
  events: EventListItem[];
  size: HeatmapMonthSize;
  // large / medium: a day is selected and opens its popover here.
  selectedDay?: string | null;
  onSelectDay?: (key: string | null) => void;
  // compact: cells show dots only, and clicking a day selects its whole
  // week for a list rendered elsewhere (see QuarterCalendar).
  selectedWeekStart?: string;
  onSelectWeek?: (weekStartKey: string) => void;
}

const MAX_MATCHUP_LINES: Record<HeatmapMonthSize, number> = { large: 4, medium: 2, compact: 0 };

export function HeatmapMonth({ month, events, size, selectedDay, onSelectDay, selectedWeekStart, onSelectWeek }: HeatmapMonthProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);
  const timeZone = useTimezone();
  const weekdayLabels = useMemo(() => getWeekdayLabels(dateLocale), [dateLocale]);
  const compact = size === "compact";

  const todayKey = dayKeyInZone(new Date(), timeZone);
  const eventsByDay = useEventsByDay(events, timeZone);
  const days = getMonthGridDays(month);
  const selectedEvents = selectedDay ? (eventsByDay.get(selectedDay) ?? []) : [];

  return (
    <div className={"heatmap-month heatmap-month-" + size}>
      <div className="heatmap-month-title">{format(month, compact ? "MMMM" : "MMMM yyyy", { locale: dateLocale })}</div>
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
          const inWeek = compact && weekStartKey(date) === selectedWeekStart;
          // Most prominent first (bigger card = more bouts), not chronological -
          // the point of this line is "what's the headliner", not a schedule.
          const rankedEvents = dayEvents.slice().sort((a, b) => b.boutCount - a.boutCount);
          const shownEvents = rankedEvents.slice(0, MAX_MATCHUP_LINES[size]);
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
                (selectedDay === key ? " heatmap-day-selected" : "") +
                (inWeek ? " heatmap-day-in-week" : "")
              }
              onClick={() =>
                compact
                  ? onSelectWeek?.(weekStartKey(date))
                  : dayEvents.length > 0
                    ? onSelectDay?.(selectedDay === key ? null : key)
                    : undefined
              }
              disabled={!compact && dayEvents.length === 0}
              aria-label={compact ? format(date, "EEEE, MMMM d", { locale: dateLocale }) : undefined}
              aria-pressed={compact ? inWeek : undefined}
            >
              <span className="heatmap-day-top">
                <span className="heatmap-day-number">{date.getDate()}</span>
              </span>
              {compact ? (
                <span className="heatmap-day-dots">
                  {dayEvents.slice(0, MAX_DAY_DOTS).map((event) => (
                    <span key={event.id} className="heatmap-matchup-dot" style={{ backgroundColor: colorForPromotion(event.promotion.code) }} />
                  ))}
                </span>
              ) : (
                shownEvents.length > 0 && (
                  <span className="heatmap-matchups">
                    {shownEvents.map((event) => (
                      <span key={event.id} className="heatmap-matchup-line">
                        <span className="heatmap-matchup-dot" style={{ backgroundColor: colorForPromotion(event.promotion.code) }} />
                        <span className="heatmap-matchup-text">{matchupLabel(event, t("calendar.versus"))}</span>
                      </span>
                    ))}
                    {hiddenCount > 0 && <span className="heatmap-matchup-more">{t("calendar.moreCount", { count: hiddenCount })}</span>}
                  </span>
                )
              )}
            </button>
          );
        })}
      </div>

      {!compact && selectedDay && onSelectDay && isSameMonth(fromDayKey(selectedDay), month) && selectedEvents.length > 0 && (
        <DayPopover dayKey={selectedDay} events={selectedEvents} onClose={() => onSelectDay(null)} />
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
