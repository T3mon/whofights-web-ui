import { useEffect, useMemo, useState } from "react";
import { format, isWithinInterval } from "date-fns";
import type { Locale } from "date-fns";
import { useTranslation } from "react-i18next";
import "./App.css";
import "./YearCalendar.css";
import "./HeatmapCalendar.css";
import "./QuarterCalendar.css";
import { fetchEvents, fetchPromotions } from "./api";
import YearCalendar from "./YearCalendar";
import HeatmapCalendar from "./HeatmapCalendar";
import QuarterCalendar from "./QuarterCalendar";
import PromotionSidebar from "./PromotionSidebar";
import SignInButton from "./SignInButton";
import Wordmark from "./Wordmark";
import AccountOverlay from "./AccountOverlay";
import SiteSettingsButton from "./SiteSettingsButton";
import SearchBar from "./SearchBar";
import { clearSession, loadSession, type Session } from "./auth";
import { getVisibleRange, isViewingToday, monthsInView, shiftViewDate, type ViewMode } from "./calendarView";
import { computeSubSeriesByPromotion, filterKeyForEvent, leafKeysForPromotion } from "./eventSeries";
import { loadDeselectedKeys, saveDeselectedKeys } from "./filterStorage";
import { getDateLocale } from "./dateLocale";
import { dayKeyInZone, useTimezone, zonedDate } from "./timezone";
import type { EventListItem, Promotion } from "./types";

function formatViewLabel(mode: ViewMode, viewDate: Date, locale: Locale): string {
  if (mode === "year") return String(viewDate.getFullYear());
  if (mode === "month") return format(viewDate, "MMMM yyyy", { locale });
  const months = monthsInView("quarter", viewDate);
  const first = months[0]!;
  const last = months[months.length - 1]!;
  return first.getFullYear() === last.getFullYear()
    ? `${format(first, "MMM", { locale })} – ${format(last, "MMM yyyy", { locale })}`
    : `${format(first, "MMM yyyy", { locale })} – ${format(last, "MMM yyyy", { locale })}`;
}

function App() {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);
  const timeZone = useTimezone();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  // Full year's 12-up grid is unreadable on a phone screen, so start narrow
  // viewports on month view instead - the dropdown still lets anyone switch.
  const [viewMode, setViewMode] = useState<ViewMode>(() => (window.innerWidth < 768 ? "month" : "year"));
  const [viewDate, setViewDate] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchPromotions(), fetchEvents()])
      .then(([promotionsResult, eventsResult]) => {
        setPromotions(promotionsResult);
        const subSeriesByPromotion = computeSubSeriesByPromotion(eventsResult);
        const allKeys = promotionsResult.flatMap((p) => leafKeysForPromotion(p.code, subSeriesByPromotion));
        const deselected = loadDeselectedKeys();
        setSelectedKeys(new Set(allKeys.filter((key) => !deselected.has(key))));
        setEvents(eventsResult);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function toggleKey(key: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function setManyKeys(keys: string[], selected: boolean) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      for (const key of keys) {
        if (selected) {
          next.add(key);
        } else {
          next.delete(key);
        }
      }
      return next;
    });
  }

  const subSeriesByPromotion = useMemo(() => computeSubSeriesByPromotion(events), [events]);

  // Search runs over every fetched event, not just what the sidebar
  // currently shows - jumping to a result should never come up empty
  // just because its promotion happened to be unchecked.
  function jumpToEvent(event: EventListItem) {
    const key = filterKeyForEvent(event, subSeriesByPromotion);
    setSelectedKeys((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
    // Zone-aware so the day we open matches the square the calendar put the
    // event on - a late-night card can sit on a different date per zone.
    const date = zonedDate(event.startsAt, timeZone);
    setViewMode("month");
    setViewDate(new Date(date.getFullYear(), date.getMonth(), date.getDate()));
    setSelectedDay(dayKeyInZone(event.startsAt, timeZone));
  }

  // Persist only the user's explicit unchecks (see filterStorage.ts) once
  // real data has loaded - skip the initial empty-Set render before the
  // fetch above resolves, which would otherwise wipe a returning visitor's
  // saved selection.
  useEffect(() => {
    if (loading) return;
    const allKeys = promotions.flatMap((p) => leafKeysForPromotion(p.code, subSeriesByPromotion));
    saveDeselectedKeys(new Set(allKeys.filter((key) => !selectedKeys.has(key))));
  }, [loading, promotions, subSeriesByPromotion, selectedKeys]);

  const visibleRange = useMemo(() => getVisibleRange(viewMode, viewDate), [viewMode, viewDate]);

  const visibleEvents = useMemo(
    () =>
      events.filter(
        (event) =>
          selectedKeys.has(filterKeyForEvent(event, subSeriesByPromotion)) &&
          isWithinInterval(zonedDate(event.startsAt, timeZone), visibleRange),
      ),
    [events, selectedKeys, subSeriesByPromotion, visibleRange, timeZone],
  );

  return (
    <div className="d-flex flex-column p-3 app-shell" style={{ boxSizing: "border-box" }}>
      <header className="d-flex align-items-center justify-content-between mb-2 flex-shrink-0 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm d-md-none"
            onClick={() => setSidebarOpen(true)}
            aria-label={t("nav.showFilters")}
          >
            &#9776;
          </button>
          <h1 className="h4 mb-0">
            <Wordmark />
          </h1>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <SearchBar events={events} onJumpToEvent={jumpToEvent} />
          <SiteSettingsButton />
          <div className="nav-toolbar">
            <div className="nav-stepper">
              <button
                type="button"
                className="nav-step-btn"
                onClick={() => setViewDate((d) => shiftViewDate(viewMode, d, -1))}
                aria-label={t("nav.previous")}
              >
                &lsaquo;
              </button>
              <span className="nav-date-label">{formatViewLabel(viewMode, viewDate, dateLocale)}</span>
              <button
                type="button"
                className="nav-step-btn"
                onClick={() => setViewDate((d) => shiftViewDate(viewMode, d, 1))}
                aria-label={t("nav.next")}
              >
                &rsaquo;
              </button>
            </div>

            {!isViewingToday(viewMode, viewDate) && (
              <button type="button" className="nav-today-chip" onClick={() => setViewDate(new Date())}>
                {t("nav.today")}
              </button>
            )}

            <div className="view-switcher" role="tablist">
              {([
                ["year", t("nav.year")],
                ["quarter", t("nav.quarter")],
                ["month", t("nav.month")],
              ] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={viewMode === mode}
                  className={"view-switcher-btn" + (viewMode === mode ? " active" : "")}
                  onClick={() => setViewMode(mode as ViewMode)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {session ? (
            <AccountOverlay
              session={session}
              promotions={promotions}
              onSignOut={() => {
                clearSession();
                setSession(null);
              }}
            />
          ) : (
            <SignInButton onSignedIn={setSession} />
          )}
        </div>
      </header>

      {error && (
        <div className="alert alert-danger flex-shrink-0" role="alert">
          {t("app.failedToLoadEvents", { message: error })}
        </div>
      )}
      {loading && <p className="text-muted flex-shrink-0">{t("app.loading")}</p>}

      {!loading && !error && (
        <div className="d-flex flex-grow-1" style={{ minHeight: 0, gap: "1rem" }}>
          {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
          <aside className={"flex-shrink-0 sidebar" + (sidebarOpen ? " sidebar-open" : "")}>
            <PromotionSidebar
              promotions={promotions}
              events={events}
              selectedKeys={selectedKeys}
              onToggle={toggleKey}
              onSetMany={setManyKeys}
            />
          </aside>

          <main className="flex-grow-1 calendar-main" style={{ minHeight: 0 }}>
            {viewMode === "year" ? (
              <YearCalendar
                year={viewDate.getFullYear()}
                events={visibleEvents}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
              />
            ) : viewMode === "quarter" ? (
              <QuarterCalendar months={monthsInView(viewMode, viewDate)} events={visibleEvents} />
            ) : (
              <HeatmapCalendar
                months={monthsInView(viewMode, viewDate)}
                events={visibleEvents}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
              />
            )}
          </main>
        </div>
      )}
    </div>
  );
}

export default App;
