import { useLayoutEffect, type RefObject } from "react";

// Gap kept between a popup and the edge of the window.
const EDGE_GAP = 8;

// Keeps an open popup on screen sideways. Popups open lined up with their
// button, which runs them off the edge when the button sits near it (the
// settings button at the right end of the rankings page header, or mid-row
// on a phone) - cut off, with a sideways scrollbar. This measures the popup
// where its CSS puts it and slides it just far enough back, before it's
// painted, and again whenever the window is resized while it's open. The
// slide is a margin, not a transform: a transformed popup still widens the
// page from where it would have been.
export function useKeepInViewport(ref: RefObject<HTMLElement | null>, open: boolean) {
  useLayoutEffect(() => {
    const popup = ref.current;
    if (!open || !popup) return;

    function fit() {
      if (!popup) return;
      popup.style.marginLeft = "";
      const { left, right } = popup.getBoundingClientRect();
      const viewport = document.documentElement.clientWidth;
      // Back from the right edge, but never past the left one.
      const shift = Math.max(Math.min(0, viewport - EDGE_GAP - right), EDGE_GAP - left);
      popup.style.marginLeft = shift ? `${shift}px` : "";
    }

    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [ref, open]);
}
