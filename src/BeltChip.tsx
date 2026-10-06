import type { ReactNode } from "react";
import "./BeltChip.css";

interface BeltChipProps {
  // The body's name ("WBC"), or an icon.
  children: ReactNode;
  className?: string;
}

// A title belt: gold, whichever body it's from. The rankings page and the
// badges on cards both use it, so a title looks the same everywhere.
export default function BeltChip({ children, className }: BeltChipProps) {
  return <span className={"belt-chip" + (className ? " " + className : "")}>{children}</span>;
}
