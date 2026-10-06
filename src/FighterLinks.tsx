import { useTranslation } from "react-i18next";
import "./FighterLinks.css";
import RankBadge from "./RankBadge";
import type { Bout, RankingBadge } from "./types";

interface FighterLinksProps {
  bout: Bout;
}

// "A vs B" with each name linking to the fighter's page and their ranking
// badge, if any, just before it. Inherits the surrounding text style so it
// reads as a headline or a subtitle alike.
export default function FighterLinks({ bout }: FighterLinksProps) {
  const { t } = useTranslation();
  return (
    <>
      <Fighter name={bout.fighterA} link={bout.fighterALink} ranking={bout.fighterARanking} />{" "}
      {t("calendar.versus")}{" "}
      <Fighter name={bout.fighterB} link={bout.fighterBLink} ranking={bout.fighterBRanking} />
    </>
  );
}

interface FighterProps {
  name: string;
  link: string;
  ranking: RankingBadge | null | undefined;
}

// Badge and name kept together, so a line never breaks between them.
function Fighter({ name, link, ranking }: FighterProps) {
  return (
    <span className="fighter-link">
      <RankBadge ranking={ranking} />
      <a href={link} target="_blank" rel="noreferrer">
        {name}
      </a>
    </span>
  );
}
