// Mirrors WhoFights.Api's Models/Api DTOs (whofights-api repo).

export interface Promotion {
  id: number;
  code: string;
  name: string;
}

// From GET/PUT /api/me/follows. Keys are the same filter keys the promotion
// tree uses (see eventSeries.ts filterKey).
export interface PromotionFollows {
  promotionKeys: string[];
}

// From GET /api/rankings - a division's ranking as one source publishes
// it, mirrored daily from Wikipedia.
export interface RankingEntry {
  // As the ranking source spells it, which can differ from Tapology's
  // spelling on event cards.
  name: string;
  // Contenders only; ties repeat a number and skip the next (3, 3, 5).
  rank: number | null;
  // Champions only: "UFC", or a boxing body ("WBA", "WBC", "IBF", "WBO").
  belt: string | null;
  // Always "W-L" or "W-L-D". Tapology's while the fighter has a card still
  // ahead, otherwise the ranking source's (it already has the latest result).
  record: string | null;
  wikiLink: string | null;
  // Tapology link of the matching fighter on our cards, when the name
  // could be linked safely.
  fighterLink: string | null;
}

export interface Ranking {
  id: string;
  sport: string;
  list: string;
  division: string;
  // "yyyy-MM-dd"; null when the source states no date (boxing).
  asOf: string | null;
  syncedAt: string;
  // The Wikipedia page it was read from - credit it wherever it's shown.
  sourceUrl: string | null;
  champions: RankingEntry[];
  ranked: RankingEntry[];
  topRated: RankingEntry | null;
}

// A fighter's standing, shown next to their name on cards: a title, or a
// contender rank. Official UFC rankings for MMA; BoxRec ranks and the four
// sanctioning bodies' belts for boxing.
export interface RankingBadge {
  // "ufc" or "boxrec".
  list: string;
  division: string;
  // Contenders only.
  rank: number | null;
  // Champions only: every belt they hold in that division - "UFC", or
  // "WBA", "WBC", "IBF", "WBO".
  belts: string[];
}

export interface Bout {
  fighterA: string;
  fighterALink: string;
  fighterB: string;
  fighterBLink: string;
  weightClass: string | null;
  // Null when the fighter holds no title or ranking.
  fighterARanking: RankingBadge | null;
  fighterBRanking: RankingBadge | null;
}

export interface EventListItem {
  id: number;
  slug: string;
  title: string;
  promotion: Promotion;
  startsAt: string; // ISO 8601, UTC
  venue: string | null;
  location: string | null;
  link: string;
  // Derived from the title server-side, e.g. "Fight Night" or "Friday
  // Fights". Null means a flagship/numbered event with no named sub-series.
  subSeries: string | null;
  mainEvent: Bout | null;
  boutCount: number;
}

// From GET /api/events/{slug} - same as EventListItem but with the full
// ordered card instead of just the headliner.
export interface EventDetail {
  id: number;
  slug: string;
  title: string;
  promotion: Promotion;
  startsAt: string;
  venue: string | null;
  location: string | null;
  link: string;
  subSeries: string | null;
  bouts: Bout[];
}
