import type { Bout } from "./types";

interface FighterLinksProps {
  bout: Bout;
}

// "A vs B" with each name linking to the fighter's page. Inherits the
// surrounding text style so it reads as a headline or a subtitle alike.
export default function FighterLinks({ bout }: FighterLinksProps) {
  return (
    <>
      <a href={bout.fighterALink} target="_blank" rel="noreferrer">
        {bout.fighterA}
      </a>{" "}
      vs{" "}
      <a href={bout.fighterBLink} target="_blank" rel="noreferrer">
        {bout.fighterB}
      </a>
    </>
  );
}
