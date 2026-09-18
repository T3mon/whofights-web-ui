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

// From GET/PUT /api/me/notifications. Mirrors NotificationKind /
// NotificationChannel in WhoFights.Data (camelCase over the wire).
export const NOTIFICATION_KINDS = ["weeklyDigest", "reminder24h", "reminder1h"] as const;
export const NOTIFICATION_CHANNELS = ["email", "telegram"] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

// One switched-on cell of the notifications grid.
export interface NotificationCell {
  kind: NotificationKind;
  channel: NotificationChannel;
}

export interface NotificationSettings {
  // IANA zone notifications pick their moment and show times in - the
  // calendar sends whatever zone it is currently showing.
  timeZone: string;
  // Language notifications are written in - the calendar's current UI language.
  language: string;
  subscriptions: NotificationCell[];
  // Read-only, from the server: the cells that can be switched on today.
  // Everything else renders locked. Omitted when sending.
  available?: NotificationCell[];
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
