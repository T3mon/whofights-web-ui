import { recordLink } from "./rankings";
import type { RankingEntry } from "./types";

interface RankedFighterNameProps {
  entry: RankingEntry;
  // The ranking's sport, which decides which record the link opens at.
  sport: string;
  className?: string;
}

// A ranked fighter's name: links to their record on Wikipedia when they
// have an article, plain text otherwise. Every rankings layout uses this.
export default function RankedFighterName({ entry, sport, className }: RankedFighterNameProps) {
  return entry.wikiLink ? (
    <a className={className} href={recordLink(entry.wikiLink, sport)} target="_blank" rel="noreferrer">
      {entry.name}
    </a>
  ) : (
    <span className={className}>{entry.name}</span>
  );
}
