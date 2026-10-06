import type { RankingEntry } from "./types";

interface RankedFighterNameProps {
  entry: RankingEntry;
  className?: string;
}

// A ranked fighter's name: links to their Wikipedia article when they have
// one, plain text otherwise. Every rankings layout uses this.
export default function RankedFighterName({ entry, className }: RankedFighterNameProps) {
  return entry.wikiLink ? (
    <a className={className} href={entry.wikiLink} target="_blank" rel="noreferrer">
      {entry.name}
    </a>
  ) : (
    <span className={className}>{entry.name}</span>
  );
}
