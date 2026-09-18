import { useCallback, useState } from "react";

// The two writes every checkbox tree needs, as pure functions so they work
// on local state (useKeySet) and on server-backed state (useRemoteSetting)
// alike: flip one key, or force a batch of keys on/off (group and
// select-all checkboxes).
export function toggleIn(keys: Set<string>, key: string): Set<string> {
  const next = new Set(keys);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

export function setManyIn(keys: Set<string>, list: string[], selected: boolean): Set<string> {
  const next = new Set(keys);
  for (const key of list) {
    if (selected) next.add(key);
    else next.delete(key);
  }
  return next;
}

// A Set<string> in state plus those two writes. Shared by the calendar
// filter and the promotion tree's own expand/collapse state.
export function useKeySet(initial: Set<string> | (() => Set<string>)) {
  const [keys, setKeys] = useState<Set<string>>(initial);

  const toggle = useCallback((key: string) => setKeys((prev) => toggleIn(prev, key)), []);
  const setMany = useCallback((list: string[], selected: boolean) => setKeys((prev) => setManyIn(prev, list, selected)), []);

  return { keys, setKeys, toggle, setMany };
}
