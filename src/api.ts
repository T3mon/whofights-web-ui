import { addYears, subYears } from "date-fns";
import type { EventDetail, EventListItem, Promotion, PromotionFollows } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5080";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }
  return response.json() as Promise<T>;
}

// Signed-in calls carry the session token minted by WhoFights.Auth; the API
// validates it and scopes the request to that user.
function withBearer(token: string, init: RequestInit & { headers?: Record<string, string> } = {}): RequestInit {
  return { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } };
}

export function fetchPromotions(): Promise<Promotion[]> {
  return requestJson<Promotion[]>("/api/promotions");
}

export function fetchEvents(): Promise<EventListItem[]> {
  // The API defaults to "now onward" when from/to are omitted, which would
  // silently hide events after they happen - pass an explicit range so
  // already-past events (which the calendar still shows, just dimmed)
  // come back too.
  const now = new Date();
  const from = subYears(now, 1).toISOString();
  const to = addYears(now, 1).toISOString();
  return requestJson<EventListItem[]>(`/api/events?from=${from}&to=${to}&take=500`);
}

export function fetchEventDetail(slug: string): Promise<EventDetail> {
  return requestJson<EventDetail>(`/api/events/${slug}`);
}

export async function fetchFollows(token: string): Promise<string[]> {
  const result = await requestJson<PromotionFollows>("/api/me/follows", withBearer(token));
  return result.promotionKeys;
}

// Replaces the whole list server-side, so each save carries the complete
// current selection rather than a diff.
export async function saveFollows(token: string, promotionKeys: string[]): Promise<string[]> {
  const result = await requestJson<PromotionFollows>(
    "/api/me/follows",
    withBearer(token, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ promotionKeys } satisfies PromotionFollows),
    }),
  );
  return result.promotionKeys;
}
