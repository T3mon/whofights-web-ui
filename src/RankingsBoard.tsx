import RankedFighterName from "./RankedFighterName";
import { titleHolders } from "./rankings";
import type { Ranking } from "./types";

interface RankingsBoardProps {
  rankings: Ranking[];
}

export default function RankingsBoard({ rankings }: RankingsBoardProps) {
  return (
    <div>
      {rankings.map((ranking) => (
        <section key={ranking.id}>
          <h3>{ranking.division}</h3>
          {titleHolders(ranking).map((holder) => (
            <p key={holder.belts.join()}>
              {holder.belts.join(" ")}: {holder.fighter ? <RankedFighterName entry={holder.fighter} /> : "-"}
            </p>
          ))}
          <ol>
            {ranking.ranked.map((entry) => (
              <li key={`${entry.rank}-${entry.name}`}>
                <RankedFighterName entry={entry} />
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
