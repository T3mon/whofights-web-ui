import { useCallback, useState } from "react";

// A Set<string> in state plus the two writes every checkbox tree needs:
// flip one key, or force a batch of keys on/off (group and select-all
// checkboxes). Shared by the calendar filter, the account overlay's
// tracked promotions and the tree's own expand/collapse state.
export function useKeySet(initial: Set<string> | (() => Set<string>)) {
  const [keys, setKeys] = useState<Set<string>>(initial);

  const toggle = useCallback((key: string) => {
    setKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const setMany = useCallback((list: string[], selected: boolean) => {
    setKeys((prev) => {
      const next = new Set(prev);
      for (const key of list) {
        if (selected) next.add(key);
        else next.delete(key);
      }
      return next;
    });
  }, []);

  return { keys, setKeys, toggle, setMany };
}
