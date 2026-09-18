import { useCallback, useEffect, useRef, useState } from "react";

export type RemoteStatus = "loading" | "ready" | "loadFailed" | "saveFailed";

// Coalesces a burst of edits into one PUT. Also keeps saves in order: each
// PUT replaces the whole value, so two in flight at once could land
// newest-first and leave the server holding the stale one.
const SAVE_DEBOUNCE_MS = 400;

// A per-account setting that lives on the API: loaded once `enabled` turns
// true (e.g. the overlay opens), edited optimistically, saved debounced.
// The account overlay's tracked promotions and notification toggles are
// the same shape - only `load`/`save` differ - so they share this. Pass
// stable `load`/`save` (useCallback) or the initial fetch restarts on
// every render while loading.
export function useRemoteSetting<T>(enabled: boolean, initial: T, load: () => Promise<T>, save: (value: T) => Promise<unknown>) {
  const [value, setValue] = useState<T>(initial);
  const [status, setStatus] = useState<RemoteStatus>("loading");
  // Flipped by the user's own edits only - the initial load must not
  // trigger a save of what the server just told us.
  const dirty = useRef(false);

  useEffect(() => {
    if (!enabled || status !== "loading") return;
    let cancelled = false;
    load()
      .then((loaded) => {
        if (cancelled) return;
        setValue(loaded);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("loadFailed");
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, status, load]);

  useEffect(() => {
    if (!dirty.current) return;
    const handle = setTimeout(() => {
      dirty.current = false;
      save(value).catch(() => setStatus("saveFailed"));
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [value, save]);

  const update = useCallback((updater: (prev: T) => T) => {
    dirty.current = true;
    setStatus("ready");
    setValue(updater);
  }, []);

  return { value, status, update };
}
