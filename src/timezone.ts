import { useSyncExternalStore } from "react";
import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";

// "auto" means follow whatever the device reports, which is what most
// people want - the stored value is only ever a real IANA id when someone
// has deliberately pinned a zone (travelling, or planning around a venue).
export const AUTO_TIMEZONE = "auto";

const STORAGE_KEY = "whofights.timezone";

export function getDeviceTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function isValidTimezone(id: string): boolean {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: id });
    return true;
  } catch {
    return false;
  }
}

// A pinned zone can go stale - tzdata renames zones and localStorage can be
// edited by hand - so anything unrecognized falls back to auto rather than
// throwing on every date we format.
function readStored(): string {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored || stored === AUTO_TIMEZONE) return AUTO_TIMEZONE;
  return isValidTimezone(stored) ? stored : AUTO_TIMEZONE;
}

let setting = readStored();
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSetting(): string {
  return setting;
}

export function setTimezone(next: string): void {
  setting = next;
  if (next === AUTO_TIMEZONE) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, next);
  }
  for (const listener of listeners) listener();
}

/** The raw preference - either AUTO_TIMEZONE or a pinned IANA id. */
export function useTimezoneSetting(): string {
  return useSyncExternalStore(subscribe, getSetting);
}

/** The zone to actually format in, with "auto" already resolved - for code outside render (callbacks, effects). */
export function getTimezone(): string {
  return setting === AUTO_TIMEZONE ? getDeviceTimezone() : setting;
}

/** Same as getTimezone, subscribed so a component re-renders when the setting changes. */
export function useTimezone(): string {
  useSyncExternalStore(subscribe, getSetting);
  return getTimezone();
}

export function getSupportedTimezones(): string[] {
  // Supported everywhere we target, but it is a relatively recent API and
  // a picker with one entry beats a crash if it is ever missing.
  if (typeof Intl.supportedValuesOf !== "function") return [getDeviceTimezone()];
  return Intl.supportedValuesOf("timeZone");
}

/**
 * Reinterprets an instant in the given zone. Every date-fns call downstream
 * (format, isSameMonth, comparisons) then operates in that zone, so this is
 * the single place event timestamps become zone-aware.
 */
export function zonedDate(value: string | Date, timeZone: string): TZDate {
  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return new TZDate(timestamp, timeZone);
}

/**
 * Which calendar square an instant belongs to, in the given zone. A card at
 * 10pm Los Angeles time is already the next day in Kyiv, so this has to be
 * zone-aware or events land on the wrong day.
 */
export function dayKeyInZone(value: string | Date, timeZone: string): string {
  return format(zonedDate(value, timeZone), "yyyy-MM-dd");
}
