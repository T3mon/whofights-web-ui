import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "./AccountOverlay.css";
import { fetchFollows, saveFollows } from "./api";
import type { Session } from "./auth";
import PromotionTree from "./PromotionTree";
import type { EventListItem, Promotion } from "./types";
import { useKeySet } from "./useKeySet";

interface AccountOverlayProps {
  session: Session;
  promotions: Promotion[];
  events: EventListItem[];
  onSignOut: () => void;
}

// Coalesces a burst of checkbox clicks into one PUT. Also keeps saves in
// order: each PUT replaces the whole list, so two in flight at once could
// land newest-first and leave the server holding the stale one.
const SAVE_DEBOUNCE_MS = 400;

type Section = "notifications" | "fighters" | "promotions";

const NOTIFICATION_KEYS = ["new-events", "card-updates", "starting-soon"] as const;

// Concept 3: no dropdown step at all - clicking the trigger goes straight
// into one large settings-page-style overlay with a left sub-nav, the way
// a dedicated account page would look rather than a menu or a drawer.
//
// Appearance/Language live in SiteSettingsButton instead, not here - those
// are app-wide preferences anyone can change, signed in or not. Everything
// in this overlay is genuinely per-account, so it stays gated behind
// having a session.
//
// Tracked promotions persist through /api/me/follows. Notifications and
// favorite fighters are still design placeholders.
// TODO: favorites need a favorite-fighters table before they can save.
export default function AccountOverlay({ session, promotions, events, onSignOut }: AccountOverlayProps) {
  const { t } = useTranslation();
  const NAV_ITEMS: { key: Section; label: string }[] = [
    { key: "notifications", label: t("account.notifications") },
    { key: "fighters", label: t("account.favoriteFighters") },
    { key: "promotions", label: t("account.trackedPromotions") },
  ];
  const NOTIFICATION_LABELS: Record<(typeof NOTIFICATION_KEYS)[number], string> = {
    "new-events": t("account.notificationNewEvents"),
    "card-updates": t("account.notificationCardUpdates"),
    "starting-soon": t("account.notificationStartingSoon"),
  };
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<Section>("notifications");
  const { keys: notifications, toggle: toggleNotification } = useKeySet(() => new Set(["new-events"]));
  const [fighterSearch, setFighterSearch] = useState("");
  const initial = session.email.charAt(0).toUpperCase();

  const { keys: tracked, setKeys: setTracked, toggle: toggleTracked, setMany: setManyTracked } = useKeySet(() => new Set());
  const [trackedStatus, setTrackedStatus] = useState<"loading" | "ready" | "loadFailed" | "saveFailed">("loading");
  // Flipped by the user's own edits only - the initial load must not
  // trigger a save of what the server just told us.
  const dirty = useRef(false);

  useEffect(() => {
    if (!open || trackedStatus !== "loading") return;
    let cancelled = false;
    fetchFollows(session.token)
      .then((keys) => {
        if (cancelled) return;
        setTracked(new Set(keys));
        setTrackedStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setTrackedStatus("loadFailed");
      });
    return () => {
      cancelled = true;
    };
  }, [open, trackedStatus, session.token, setTracked]);

  useEffect(() => {
    if (!dirty.current) return;
    const handle = setTimeout(() => {
      dirty.current = false;
      saveFollows(session.token, [...tracked]).catch(() => setTrackedStatus("saveFailed"));
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [tracked, session.token]);

  function editTracked(edit: () => void) {
    dirty.current = true;
    setTrackedStatus("ready");
    edit();
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
                  <h2 className="account-overlay-panel-title">
                    {t("account.notifications")} <span className="account-overlay-badge">{t("account.comingSoon")}</span>
                  </h2>
                  <div className="account-overlay-list">
                    {NOTIFICATION_KEYS.map((key) => (
                      <label className="account-overlay-toggle-row" key={key}>
                        <span>{NOTIFICATION_LABELS[key]}</span>
                        <input type="checkbox" checked={notifications.has(key)} onChange={() => toggleNotification(key)} />
                      </label>
                    ))}
                  </div>
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
                  {trackedStatus === "loading" && <p className="account-overlay-empty">{t("app.loading")}</p>}
                  {trackedStatus === "loadFailed" && <p className="account-overlay-error">{t("account.loadFailed")}</p>}
                  {trackedStatus === "saveFailed" && <p className="account-overlay-error">{t("account.saveFailed")}</p>}
                  {trackedStatus !== "loading" && trackedStatus !== "loadFailed" && (
                    <div className="account-overlay-list">
                      <PromotionTree
                        promotions={promotions}
                        events={events}
                        selectedKeys={tracked}
                        onToggle={(key) => editTracked(() => toggleTracked(key))}
                        onSetMany={(keys, selected) => editTracked(() => setManyTracked(keys, selected))}
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
