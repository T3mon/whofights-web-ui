import { useTranslation } from "react-i18next";
import "./RankBadge.css";
import BeltChip from "./BeltChip";
import type { RankingBadge } from "./types";

// Each list by the name people know it by.
const SOURCE_NAMES: Record<string, string> = { ufc: "UFC", boxrec: "BoxRec" };

interface RankBadgeProps {
  ranking: RankingBadge | null | undefined;
}

// A fighter's standing, just before their name on a card: a gold chip for a
// title - a crown for the UFC's, each body's name for boxing's - or a muted
// "#3" for a contender. Hovering spells it out, and screen readers get the
// same sentence.
export default function RankBadge({ ranking }: RankBadgeProps) {
  const { t } = useTranslation();
  if (!ranking) return null;

  const source = SOURCE_NAMES[ranking.list] ?? ranking.list;
  const champion = ranking.belts.length > 0;
  if (!champion && ranking.rank === null) return null;

  const label = champion
    ? t("rankings.badge.champion", { division: ranking.division, belts: ranking.belts.join(", ") })
    : t("rankings.badge.ranked", { rank: ranking.rank, division: ranking.division, source });

  return (
    <span className="rank-badge">
      {/* The tooltip sits on the hidden part, so screen readers hear the label once. */}
      <span className="rank-badge-visual" title={label} aria-hidden="true">
        {!champion ? (
          <span className="rank-badge-rank">{t("rankings.badge.rank", { rank: ranking.rank })}</span>
        ) : ranking.list === "ufc" ? (
          <BeltChip className="rank-badge-crown">
            <CrownIcon />
          </BeltChip>
        ) : (
          ranking.belts.map((belt) => <BeltChip key={belt}>{belt}</BeltChip>)
        )}
      </span>
      <span className="visually-hidden">{label}</span>
    </span>
  );
}

function CrownIcon() {
  return (
    <svg viewBox="0 0 12 10" width="11" height="9" fill="currentColor">
      <path d="M0 1.5 3 4.5 6 0l3 4.5 3-3L11 7.5H1Z" />
      <rect x="1" y="8.5" width="10" height="1.5" rx="0.5" />
    </svg>
  );
}
