import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import "./AccountOverlay.css";
import { fetchFollows, fetchNotificationPreferences, saveFollows, saveNotificationPreferences } from "./api";
import type { Session } from "./auth";
import PromotionTree from "./PromotionTree";
import { useTimezone } from "./timezone";
import type { EventListItem, NotificationPreferences, Promotion } from "./types";
import { setManyIn, toggleIn } from "./useKeySet";
import { type RemoteStatus, useRemoteSetting } from "./useRemoteSetting";

interface AccountOverlayProps {
  session: Session;
  promotions: Promotion[];
  events: EventListItem[];
  onSignOut: () => void;
}

const SECTIONS = ["notifications", "fighters", "promotions"] as const;
type Section = (typeof SECTIONS)[number];

// Links in the digest email (and anywhere else) can open the overlay on a
// given panel with ?account=<section>. Read once, then scrubbed from the
// URL so a reload doesn't pop the overlay again.
function sectionFromUrl(): Section | null {
  const wanted = new URLSearchParams(window.location.search).get("account");
  if (!wanted || !(SECTIONS as readonly string[]).includes(wanted)) return null;
  window.history.replaceState(null, "", window.location.pathname);
  return wanted as Section;
}

const NO_NOTIFICATIONS: NotificationPreferences = { weeklyDigestEmail: false, timeZone: "UTC" };

// Concept 3: no dropdown step at all - clicking the trigger goes straight
// into one large settings-page-style overlay with a left sub-nav, the way
// a dedicated account page would look rather than a menu or a drawer.
//
// Appearance/Language live in SiteSettingsButton instead, not here - those
// are app-wide preferences anyone can change, signed in or not. Everything
// in this overlay is genuinely per-account, so it stays gated behind
// having a session.
//
// Tracked promotions and notification settings persist through /api/me.
// Favorite fighters are still a design placeholder.
// TODO: favorites need a favorite-fighters table before they can save.
export default function AccountOverlay({ session, promotions, events, onSignOut }: AccountOverlayProps) {
  const { t } = useTranslation();
  const timeZone = useTimezone();
  const NAV_ITEMS: { key: Section; label: string }[] = [
    { key: "notifications", label: t("account.notifications") },
    { key: "fighters", label: t("account.favoriteFighters") },
    { key: "promotions", label: t("account.trackedPromotions") },
  ];
  const [initialSection] = useState(sectionFromUrl);
  const [open, setOpen] = useState(initialSection !== null);
  const [section, setSection] = useState<Section>(initialSection ?? "notifications");
  const [fighterSearch, setFighterSearch] = useState("");
  const initial = session.email.charAt(0).toUpperCase();

  const { token } = session;
  const loadTracked = useCallback(async () => new Set(await fetchFollows(token)), [token]);
  const saveTracked = useCallback((keys: Set<string>) => saveFollows(token, [...keys]), [token]);
  const tracked = useRemoteSetting(open, new Set<string>(), loadTracked, saveTracked);

  const loadNotifications = useCallback(() => fetchNotificationPreferences(token), [token]);
  const saveNotifications = useCallback((prefs: NotificationPreferences) => saveNotificationPreferences(token, prefs), [token]);
  const notifications = useRemoteSetting(open, NO_NOTIFICATIONS, loadNotifications, saveNotifications);

  // The load/error lines both panels show above their content.
  function statusMessage(status: RemoteStatus) {
    if (status === "loading") return <p className="account-overlay-empty">{t("app.loading")}</p>;
    if (status === "loadFailed") return <p className="account-overlay-error">{t("account.loadFailed")}</p>;
    if (status === "saveFailed") return <p className="account-overlay-error">{t("account.saveFailed")}</p>;
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="account-overlay-trigger"
        onClick={() => setOpen(true)}
        aria-label={t("account.ariaLabel")}
        title={session.email}
      >
        <span className="account-overlay-avatar">{initial}</span>
      </button>

      {open && (
        <div className="scrim-backdrop account-overlay-backdrop" onClick={() => setOpen(false)}>
          <div className="account-overlay" role="dialog" aria-label={t("account.ariaLabel")} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="account-overlay-close" onClick={() => setOpen(false)} aria-label={t("account.close")}>
              &times;
            </button>

            <nav className="account-overlay-nav">
              <div className="account-overlay-nav-profile">
                <span className="account-overlay-avatar account-overlay-avatar-lg">{initial}</span>
                <span className="account-overlay-nav-email">{session.email}</span>
              </div>
              <div className="account-overlay-nav-divider" />
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={"account-overlay-nav-item" + (section === item.key ? " active" : "")}
                  onClick={() => setSection(item.key)}
                >
                  {item.label}
                </button>
              ))}
              <div className="account-overlay-nav-divider" />
              <button
                type="button"
                className="account-overlay-nav-item account-overlay-nav-item-danger"
                onClick={() => {
                  setOpen(false);
                  onSignOut();
                }}
              >
                {t("account.signOut")}
              </button>
            </nav>

            <div className="account-overlay-content">
              {section === "notifications" && (
                <div className="account-overlay-panel">
                  <h2 className="account-overlay-panel-title">{t("account.notifications")}</h2>
                  {statusMessage(notifications.status)}
                  {notifications.status !== "loading" && notifications.status !== "loadFailed" && (
                    <div className="account-overlay-list">
                      <label className="account-overlay-toggle-row">
                        <span>
                          <span className="account-overlay-toggle-label">{t("account.weeklyDigest")}</span>
                          <span className="account-overlay-toggle-hint">{t("account.weeklyDigestHint", { zone: timeZone })}</span>
                        </span>
                        <input
                          type="checkbox"
                          className="promotion-checkbox"
                          checked={notifications.value.weeklyDigestEmail}
                          // Always send the zone the calendar is showing right now, so the
                          // digest's times match what this person sees on the site.
                          onChange={() => notifications.update((prev) => ({ weeklyDigestEmail: !prev.weeklyDigestEmail, timeZone }))}
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}

              {section === "fighters" && (
                <div className="account-overlay-panel">
                  <h2 className="account-overlay-panel-title">
                    {t("account.favoriteFighters")} <span className="account-overlay-badge">{t("account.comingSoon")}</span>
                  </h2>
                  <input
                    type="text"
                    className="account-overlay-search"
                    placeholder={t("account.searchFightersPlaceholder")}
                    value={fighterSearch}
                    onChange={(e) => setFighterSearch(e.target.value)}
                  />
                  <p className="account-overlay-empty">{t("account.noFavoritesYet")}</p>
                </div>
              )}

              {section === "promotions" && (
                <div className="account-overlay-panel">
                  <h2 className="account-overlay-panel-title">{t("account.trackedPromotions")}</h2>
                  <p className="account-overlay-hint">{t("account.trackedPromotionsHint")}</p>
                  {statusMessage(tracked.status)}
                  {tracked.status !== "loading" && tracked.status !== "loadFailed" && (
                    <div className="account-overlay-list">
                      <PromotionTree
                        promotions={promotions}
                        events={events}
                        selectedKeys={tracked.value}
                        onToggle={(key) => tracked.update((prev) => toggleIn(prev, key))}
                        onSetMany={(keys, selected) => tracked.update((prev) => setManyIn(prev, keys, selected))}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
