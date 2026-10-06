import type { Ranking, RankingEntry } from "./types";

// The rankings the page can show, in dropdown order. `list` is the API's
// list key, `labelKey` the i18n key of its name.
export const RANKING_SOURCES = [
  { list: "ufc", labelKey: "rankings.source.ufcMedia" },
  { list: "ufc-meta", labelKey: "rankings.source.ufcMeta" },
  { list: "boxrec", labelKey: "rankings.source.boxing" },
] as const;

export type RankingListKey = (typeof RANKING_SOURCES)[number]["list"];

export function isRankingList(value: string | null): value is RankingListKey {
  return RANKING_SOURCES.some((s) => s.list === value);
}

// Heaviest to lightest, with women's divisions after the men's (in the
// same order). Names as the sources write them.
const WEIGHT_ORDER = [
  "heavyweight",
  "cruiserweight",
  "light heavyweight",
  "super middleweight",
  "middleweight",
  "super welterweight",
  "welterweight",
  "super lightweight",
  "lightweight",
  "super featherweight",
  "featherweight",
  "super bantamweight",
  "bantamweight",
  "super flyweight",
  "flyweight",
  "light flyweight",
  "strawweight",
];
const WOMENS_PREFIX = "women's ";

function weightIndex(division: string): number {
  const name = division.toLowerCase();
  const womens = name.startsWith(WOMENS_PREFIX);
  const index = WEIGHT_ORDER.indexOf(womens ? name.slice(WOMENS_PREFIX.length) : name);
  // Unknown divisions go last within their group rather than vanish.
  return (womens ? WEIGHT_ORDER.length + 1 : 0) + (index < 0 ? WEIGHT_ORDER.length : index);
}

export function sortByWeight(rankings: Ranking[]): Ranking[] {
  return [...rankings].sort((a, b) => weightIndex(a.division) - weightIndex(b.division) || a.division.localeCompare(b.division));
}

// The newest "rankings released" date across the lists on screen; null
// when none states one (boxing).
export function latestAsOf(rankings: Ranking[]): string | null {
  return rankings.reduce<string | null>((latest, r) => (r.asOf && (!latest || r.asOf > latest) ? r.asOf : latest), null);
}

// Boxing's four sanctioning bodies, in the order they're usually listed.
const BOXING_BELTS = ["WBA", "WBC", "IBF", "WBO"];
const UFC_BELT = "UFC";

export interface TitleHolder {
  // Null when the belt is vacant.
  fighter: RankingEntry | null;
  belts: string[];
}

// Who holds which belt in a division: one entry per champion - so a
// unified champion appears once with all their belts - then one per vacant
// belt. Boxing always accounts for all four bodies; UFC for its one title.
export function titleHolders(ranking: Ranking): TitleHolder[] {
  const expected = ranking.sport === "boxing" ? BOXING_BELTS : [UFC_BELT];
  const byName = new Map<string, TitleHolder>();
  for (const champion of ranking.champions) {
    const belt = champion.belt ?? UFC_BELT;
    const holder = byName.get(champion.name);
    if (holder) holder.belts.push(belt);
    else byName.set(champion.name, { fighter: champion, belts: [belt] });
  }

  const order = (belt: string) => (expected.includes(belt) ? expected.indexOf(belt) : expected.length);
  const holders = [...byName.values()].map((h) => ({ ...h, belts: [...h.belts].sort((a, b) => order(a) - order(b)) }));
  const held = new Set(ranking.champions.map((c) => c.belt ?? UFC_BELT));
  const vacant = expected.filter((belt) => !held.has(belt)).map((belt) => ({ fighter: null, belts: [belt] }));
  return [...holders, ...vacant];
}
