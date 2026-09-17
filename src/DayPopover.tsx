import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import type { EventListItem } from "./types";
import { getDateLocale } from "./dateLocale";
import { useTimezone } from "./timezone";
import { fromDayKey } from "./calendarData";
import EventList from "./EventList";

interface DayPopoverProps {
  dayKey: string;
  events: EventListItem[];
  onClose: () => void;
}

// One day's events, floated over whichever grid opened it. Positioned by the
// parent's `position: relative`, so it centres over a single month or the
// whole year grid alike.
export default function DayPopover({ dayKey, events, onClose }: DayPopoverProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);
  const timeZone = useTimezone();
  const title = format(fromDayKey(dayKey), "EEEE, MMMM d, yyyy", { locale: dateLocale });

  return (
    <div className="day-popover" role="dialog" aria-label={title}>
      <div className="day-popover-header">
        <strong>{title}</strong>
        <button type="button" className="day-popover-close" onClick={onClose} aria-label={t("calendar.close")}>
          &times;
        </button>
      </div>
      <EventList events={events} />
      <div className="day-popover-footnote">{t("calendar.localTimezoneNote", { zone: timeZone.replace(/_/g, " ") })}</div>
    </div>
  );
}
