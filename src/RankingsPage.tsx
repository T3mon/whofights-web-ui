import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import "./RankingsPage.css";
import { fetchRankings } from "./api";
import Dropdown from "./Dropdown";
import { getDateLocale } from "./dateLocale";
import { RANKING_SOURCES, isRankingList, latestAsOf, sortByWeight, type RankingListKey } from "./rankings";
import RankingsBoard from "./RankingsBoard";
import type { Ranking } from "./types";

// Which ranking is showing lives in the URL (?list=ufc-meta), so a shared
// link opens the same view.
function listFromUrl(): RankingListKey {
  const value = new URLSearchParams(window.location.search).get("list");
  return isRankingList(value) ? value : "ufc";
}

type Loaded = { list: RankingListKey; rankings: Ranking[] } | { list: RankingListKey; failed: true };

// /rankings - the shell every layout shares: which ranking, how fresh it
// is, where it comes from. The divisions themselves are RankingsBoard's.
export default function RankingsPage() {
  const { t, i18n } = useTranslation();
  const [list, setList] = useState(listFromUrl);
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchRankings(list)
      .then((rankings) => {
        if (!cancelled) setLoaded({ list, rankings: sortByWeight(rankings) });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ list, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [list]);

  function selectList(value: string) {
    if (!isRankingList(value)) return;
    window.history.replaceState(null, "", `?list=${value}`);
    setList(value);
  }

  // Data for the list that was asked for - anything else is still loading.
  const current = loaded?.list === list ? loaded : null;
  const rankings = current && "rankings" in current ? current.rankings : null;
  const asOf = rankings ? latestAsOf(rankings) : null;
  const sourceUrl = rankings?.find((r) => r.sourceUrl)?.sourceUrl ?? null;

  return (
    <div className="rankings-page">
      <div className="rankings-toolbar">
        <h2 className="rankings-title">{t("rankings.title")}</h2>
        <Dropdown
          trigger={t(RANKING_SOURCES.find((s) => s.list === list)!.labelKey)}
          label={t("rankings.sourceLabel")}
          value={list}
          options={RANKING_SOURCES.map((source) => ({ value: source.list, label: t(source.labelKey) }))}
          onChange={selectList}
        />
        {asOf && (
          <span className="rankings-as-of">
            {t("rankings.asOf", { date: format(new Date(`${asOf}T00:00:00`), "PP", { locale: getDateLocale(i18n.language) }) })}
          </span>
        )}
      </div>

      {!current && <p className="rankings-status">{t("app.loading")}</p>}
      {current && "failed" in current && <p className="rankings-status rankings-error">{t("rankings.loadFailed")}</p>}
      {rankings && rankings.length === 0 && <p className="rankings-status">{t("rankings.empty")}</p>}
      {rankings && rankings.length > 0 && <RankingsBoard rankings={rankings} />}

      {sourceUrl && (
        <p className="rankings-credit">
          {t("rankings.sourceCredit")}:{" "}
          <a href={sourceUrl} target="_blank" rel="noreferrer">
            Wikipedia
          </a>{" "}
          &middot;{" "}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">
            CC BY-SA 4.0
          </a>
        </p>
      )}
    </div>
  );
}
