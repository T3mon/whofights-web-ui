import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import "./EventList.css";
import type { EventListItem } from "./types";
import { colorForPromotion } from "./promotionColors";
import { getDateLocale } from "./dateLocale";
import { useTimezone, zonedDate } from "./timezone";
import { shortLocation, sortByStart } from "./calendarData";
import FighterLinks from "./FighterLinks";
import FightCardExpander from "./FightCardExpander";

interface EventListProps {
  events: EventListItem[];
  // "title" leads with the event name (a single day's popover); "matchup"
  // leads with the fighters, for lists spanning days where the bout is what
  // people scan for.
  headline?: "title" | "matchup";
  // Show the day of each event - needed when the list spans more than one.
  showDay?: boolean;
}

// The one way events are listed everywhere: day popovers and the quarter
// view's week panel share it, so a change here lands in all of them.
export default function EventList({ events, headline = "title", showDay = false }: EventListProps) {
  const { i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);
  const timeZone = useTimezone();

  return (
    <ul className="event-list">
      {sortByStart(events).map((event) => {
        const starts = zonedDate(event.startsAt, timeZone);
        const location = shortLocation(event.location);
        const titleLink = (
          <a href={event.link} target="_blank" rel="noreferrer">
            {event.title}
          </a>
        );
        return (
          <li key={event.id} className="event-list-item">
            {showDay && (
              <div className="event-list-day">
                <span className="event-list-day-number">{format(starts, "d")}</span>
                <span className="event-list-day-name">{format(starts, "EEE", { locale: dateLocale })}</span>
              </div>
            )}
            <div className="event-list-body">
              <div className="event-list-headline">
                <span className="event-list-dot" style={{ backgroundColor: colorForPromotion(event.promotion.code) }} />
                <span className="event-list-time">{format(starts, "h:mm a", { locale: dateLocale })}</span>
                {headline === "matchup" && event.mainEvent ? <FighterLinks bout={event.mainEvent} /> : titleLink}
              </div>
              {(headline === "matchup" ? event.mainEvent || location : event.mainEvent) && (
                <div className="event-list-subtitle">
                  {headline === "matchup" ? (
                    <>
                      {event.mainEvent && titleLink}
                      {location && <span>{location}</span>}
                    </>
                  ) : (
                    event.mainEvent && <FighterLinks bout={event.mainEvent} />
                  )}
                </div>
              )}
              <FightCardExpander slug={event.slug} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
