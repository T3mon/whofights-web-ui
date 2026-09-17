import { useState } from "react";
import { useTranslation } from "react-i18next";
import "./FightCardExpander.css";
import { fetchEventDetail } from "./api";
import FighterLinks from "./FighterLinks";
import type { EventDetail } from "./types";

interface FightCardExpanderProps {
  slug: string;
}

// Concept 2: no popup at all - the full card expands in place right where
// the button is, accordion-style, so the day popover just grows taller.
export default function FightCardExpander({ slug }: FightCardExpanderProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (!detail && !loading) {
      setLoading(true);
      fetchEventDetail(slug)
        .then(setDetail)
        .catch((err: Error) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }

  return (
    <div className="fight-card-expander">
      <button type="button" className="fight-card-expander-toggle" onClick={toggle} aria-expanded={expanded}>
        <span className={"fight-card-expander-chevron" + (expanded ? " expanded" : "")}>&#9656;</span>
        {t("calendar.fullCard")}
      </button>

      {expanded && (
        <div className="fight-card-expander-body">
          {loading && <p className="fight-card-expander-status">{t("calendar.loading")}</p>}
          {error && <p className="fight-card-expander-status fight-card-expander-error">{t("calendar.failedToLoad", { message: error })}</p>}
          {detail && detail.bouts.length === 0 && <p className="fight-card-expander-status">{t("calendar.noCardDetailsYet")}</p>}
          {detail && detail.bouts.length > 0 && (
            <ol className="fight-card-expander-list">
              {detail.bouts.map((bout, i) => (
                <li key={i}>
                  <span className="fight-card-expander-matchup">
                    <FighterLinks bout={bout} />
                  </span>
                  {bout.weightClass && <span className="fight-card-expander-weight">{bout.weightClass}</span>}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
