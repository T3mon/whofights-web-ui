// Mirrors WhoFights.Api's Models/Api DTOs (whofights-api repo).

export interface Promotion {
  id: number;
  code: string;
  name: string;
}

export interface Bout {
  fighterA: string;
  fighterALink: string;
  fighterB: string;
  fighterBLink: string;
  weightClass: string | null;
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
