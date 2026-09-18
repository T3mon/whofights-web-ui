import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import "./AccountOverlay.css";
import { fetchFollows, fetchNotificationSettings, saveFollows, saveNotificationSettings } from "./api";
import type { Session } from "./auth";
import PromotionTree from "./PromotionTree";
import { useTimezone } from "./timezone";
import { NOTIFICATION_CHANNELS, NOTIFICATION_KINDS, type EventListItem, type NotificationCell, type NotificationSettings, type Promotion } from "./types";
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

const NO_NOTIFICATIONS: NotificationSettings = { timeZone: "UTC", language: "en", subscriptions: [], available: [] };

const sameCell = (a: NotificationCell, b: NotificationCell) => a.kind === b.kind && a.channel === b.channel;

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
  const { t, i18n } = useTranslation();
  const timeZone = useTimezone();
  // resolvedLanguage is the base code the strings actually come from ("en"
  // for an "en-US" browser) - the same code the digest's translations use.
  const language = i18n.resolvedLanguage ?? i18n.language;
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

  const loadNotifications = useCallback(() => fetchNotificationSettings(token), [token]);
  const saveNotifications = useCallback((settings: NotificationSettings) => saveNotificationSettings(token, settings), [token]);
  const notifications = useRemoteSetting(open, NO_NOTIFICATIONS, loadNotifications, saveNotifications);

  // Flip one cell of the grid. Always send the zone and language the
  // calendar is using right now, so notifications read the way the site
  // does for this person.
  function toggleCell(cell: NotificationCell) {
    notifications.update((prev) => ({
      ...prev,
      timeZone,
      language,
      subscriptions: prev.subscriptions.some((c) => sameCell(c, cell))
        ? prev.subscriptions.filter((c) => !sameCell(c, cell))
        : [...prev.subscriptions, cell],
    }));
  }

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
                  <p className="account-overlay-hint">{t("account.notificationsHint", { zone: timeZone })}</p>
                  {statusMessage(notifications.status)}
                  {notifications.status !== "loading" && notifications.status !== "loadFailed" && (
                    <table className="notification-grid">
                      <thead>
                        <tr>
                          <th />
                          {NOTIFICATION_CHANNELS.map((channel) => (
                            <th key={channel} scope="col">
                              {t(`account.channel.${channel}`)}
                              {!notifications.value.available?.some((c) => c.channel === channel) && (
                                <span className="account-overlay-badge">{t("account.comingSoon")}</span>
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {NOTIFICATION_KINDS.map((kind) => (
                          <tr key={kind}>
                            <th scope="row">
                              <span className="account-overlay-toggle-label">{t(`account.kind.${kind}`)}</span>
                              <span className="account-overlay-toggle-hint">{t(`account.kindHint.${kind}`)}</span>
                            </th>
                            {NOTIFICATION_CHANNELS.map((channel) => {
                              const cell = { kind, channel };
                              // The server says which cells exist today; the rest stay locked
                              // (email can't carry reminders, Telegram isn't built yet).
                              const enabled = notifications.value.available?.some((c) => sameCell(c, cell)) ?? false;
                              return (
                                <td key={channel}>
                                  <input
                                    type="checkbox"
                                    className="promotion-checkbox"
                                    aria-label={t("account.cellAria", { kind: t(`account.kind.${kind}`), channel: t(`account.channel.${channel}`) })}
                                    disabled={!enabled}
                                    checked={notifications.value.subscriptions.some((c) => sameCell(c, cell))}
                                    onChange={() => toggleCell(cell)}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
