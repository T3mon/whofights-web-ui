import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { CSSProperties } from "react";
import "./RankingsBoard.css";
import BeltChip from "./BeltChip";
import { colorForGroup } from "./promotionColors";
import RankedFighterName from "./RankedFighterName";
import { titleHolders } from "./rankings";
import type { Ranking } from "./types";

interface RankingsBoardProps {
  rankings: Ranking[];
}

// How many contenders a card shows on a phone before "Show all" - enough to
// answer "who's near the top", short enough that 11-17 cards still scroll.
const COLLAPSED_COUNT = 5;

// Design 1 - "Division cards": every division at once, one card each, the
// way ufc.com lays them out. The champion block anchors each card; the
// ranked list underneath is the same in every card so they scan alike.
export default function RankingsBoard({ rankings }: RankingsBoardProps) {
  return (
    <div className="rk-grid">
      {rankings.map((ranking) => (
        <DivisionCard key={ranking.id} ranking={ranking} />
      ))}
    </div>
  );
}

function DivisionCard({ ranking }: { ranking: Ranking }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const holders = titleHolders(ranking);
  const accent = colorForGroup(ranking.sport === "boxing" ? "Boxing" : "UFC");
  // Records only for MMA: boxing's come from a different world (BoxRec) and
  // ours would be partial and out of step with the ranking beside them.
  const showRecords = ranking.sport === "mma";

  return (
    <section className={"rk-card" + (expanded ? " rk-card-expanded" : "")} style={{ "--rk-accent": accent } as CSSProperties}>
      <header className="rk-card-head">
        <h3 className="rk-division">{ranking.division}</h3>
        {ranking.sport === "boxing" ? (
          <ul className="rk-belts">
            {holders.map((holder) => (
              <li key={holder.belts.join()} className="rk-belt-row">
                <span className="rk-belt-chips">
                  {holder.belts.map((belt) => (
                    <BeltChip key={belt} className="rk-belt">
                      {belt}
                    </BeltChip>
                  ))}
                </span>
                {holder.fighter ? (
                  <RankedFighterName entry={holder.fighter} className="rk-belt-holder" />
                ) : (
                  <span className="rk-vacant">{t("rankings.vacant")}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          holders.map((holder) => (
            <div key={holder.belts.join()}>
              {holder.fighter ? (
                <RankedFighterName entry={holder.fighter} className="rk-champion-name" />
              ) : (
                <span className="rk-champion-name rk-vacant">{t("rankings.vacant")}</span>
              )}
              <div className="rk-champion-label">
                {t("rankings.champion")}
                {showRecords && holder.fighter?.record && <span className="rk-record">{holder.fighter.record}</span>}
              </div>
            </div>
          ))
        )}
        {ranking.topRated && (
          <div className="rk-top-rated">
            {t("rankings.topRated")} &middot; <RankedFighterName entry={ranking.topRated} />
          </div>
        )}
      </header>

      <ol className="rk-list">
        {ranking.ranked.map((entry) => (
          <li key={`${entry.rank}-${entry.name}`} className="rk-row">
            <span className="rk-rank">{entry.rank}</span>
            <RankedFighterName entry={entry} className="rk-name" />
            {showRecords && entry.record && <span className="rk-record">{entry.record}</span>}
          </li>
        ))}
      </ol>

      {ranking.ranked.length > COLLAPSED_COUNT && (
        <button type="button" className="rk-more" onClick={() => setExpanded((e) => !e)} aria-expanded={expanded}>
          {expanded ? t("rankings.showTop", { count: COLLAPSED_COUNT }) : t("rankings.showAll", { count: ranking.ranked.length })}
        </button>
      )}
    </section>
  );
}
