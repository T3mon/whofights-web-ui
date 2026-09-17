import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import "./SearchBar.css";
import { getDateLocale } from "./dateLocale";
import { useTimezone, zonedDate } from "./timezone";
import { colorForPromotion } from "./promotionColors";
import type { EventListItem } from "./types";

interface SearchBarProps {
  events: EventListItem[];
  onJumpToEvent: (event: EventListItem) => void;
}

const MAX_RESULTS = 8;

// Searches the full event list regardless of the sidebar's current
// promotion filter - the point of search is to find something even if
// you've filtered it out, not just what's already showing.
function matchesQuery(event: EventListItem, query: string): boolean {
  const haystack = [
    event.title,
    event.promotion.name,
    event.promotion.code,
    event.mainEvent?.fighterA,
    event.mainEvent?.fighterB,
    event.venue,
    event.location,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export default function SearchBar({ events, onJumpToEvent }: SearchBarProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);
  const timeZone = useTimezone();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // YouTube-style "/" shortcut - only when nothing else is capturing text
  // input, so it doesn't hijack typing into another field (the timezone
  // search box, a future text input, etc).
  useEffect(() => {
    if (open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const isTyping =
        target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;
      if (isTyping) return;
      e.preventDefault();
      setOpen(true);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const results = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];
    return events
      .filter((event) => matchesQuery(event, trimmed))
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
      .slice(0, MAX_RESULTS);
  }, [events, query]);

  function close() {
    setQuery("");
    setOpen(false);
  }

  function handleSelect(event: EventListItem) {
    onJumpToEvent(event);
    close();
  }

  return (
    <div className="search-bar">
      {open ? (
        <div className="search-bar-expanded">
          <SearchIcon />
          <input
            type="text"
            className="search-bar-input"
            placeholder={t("search.placeholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Escape") close();
            }}
          />
          <button type="button" className="search-bar-close" onClick={close} aria-label={t("search.close")}>
            &times;
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="search-bar-trigger"
          onClick={() => setOpen(true)}
          aria-label={t("search.ariaLabel")}
          title={`${t("search.ariaLabel")} (/)`}
        >
          <SearchIcon />
        </button>
      )}

      {open && (
        <>
          <div className="search-bar-backdrop" onClick={close} />
          {query.trim() && (
            <div className="search-bar-results" role="listbox">
              {results.length === 0 ? (
                <p className="search-bar-empty">{t("search.noResults")}</p>
              ) : (
                results.map((event) => (
                  <button type="button" className="search-bar-result" key={event.id} onClick={() => handleSelect(event)}>
                    <span className="search-bar-result-dot" style={{ backgroundColor: colorForPromotion(event.promotion.code) }} />
                    <span className="search-bar-result-text">
                      <span className="search-bar-result-title">{event.title}</span>
                      {event.mainEvent && (
                        <span className="search-bar-result-matchup">
                          {event.mainEvent.fighterA} {t("calendar.versus")} {event.mainEvent.fighterB}
                        </span>
                      )}
                    </span>
                    <span className="search-bar-result-date">{format(zonedDate(event.startsAt, timeZone), "MMM d, yyyy", { locale: dateLocale })}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
