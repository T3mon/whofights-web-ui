import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import "./PromotionTree.css";
import { colorForGroup, colorForPromotion, groupForPromotion, GROUP_ORDER } from "./promotionColors";
import { computeSubSeriesByPromotion, filterKey, leafKeysForPromotion, subSeriesValuesFor } from "./eventSeries";
import { useKeySet } from "./useKeySet";
import type { EventListItem, Promotion } from "./types";

// The grouped promotion checklist (select all, families, promotions,
// sub-series) with its keys defined by eventSeries.ts. Purely controlled -
// the calendar sidebar feeds it the filter, the account overlay feeds it
// the user's tracked promotions, and both get the exact same tree.
export interface PromotionTreeProps {
  promotions: Promotion[];
  events: EventListItem[];
  selectedKeys: Set<string>;
  onToggle: (key: string) => void;
  onSetMany: (keys: string[], selected: boolean) => void;
}

interface TriStateCheckboxProps {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
  ariaLabel: string;
  accentColor: string;
}

function TriStateCheckbox({ checked, indeterminate, onChange, ariaLabel, accentColor }: TriStateCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      className="promotion-checkbox"
      style={{ "--promotion-accent": accentColor } as React.CSSProperties}
      checked={checked}
      onChange={onChange}
      aria-label={ariaLabel}
    />
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={"promotion-chevron" + (expanded ? " promotion-chevron-expanded" : "")}
      width="10"
      height="10"
      viewBox="0 0 10 10"
      aria-hidden="true"
    >
      <path d="M2 3.2L5 6.2L8 3.2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function PromotionTree({ promotions, events, selectedKeys, onToggle, onSetMany }: PromotionTreeProps) {
  const { t } = useTranslation();
  const { keys: expandedGroups, toggle: toggleExpandedGroup } = useKeySet(() => new Set(GROUP_ORDER));
  const { keys: expandedPromotions, toggle: toggleExpandedPromotion } = useKeySet(() => new Set());

  const subSeriesByPromotion = useMemo(() => computeSubSeriesByPromotion(events), [events]);

  const byGroup = new Map<string, Promotion[]>();
  const standalone: Promotion[] = [];
  for (const promotion of promotions) {
    const group = groupForPromotion(promotion.code);
    if (group) {
      const existing = byGroup.get(group);
      if (existing) {
        existing.push(promotion);
      } else {
        byGroup.set(group, [promotion]);
      }
    } else {
      standalone.push(promotion);
    }
  }

  function renderPromotionEntry(promotion: Promotion, indented: boolean) {
    const color = colorForPromotion(promotion.code);
    const subValues = subSeriesValuesFor(promotion.code, subSeriesByPromotion);

    if (subValues.length === 0) {
      const key = promotion.code;
      return (
        <label className={"promotion-row" + (indented ? " promotion-row-indented" : "")} key={promotion.id}>
          <input
            type="checkbox"
            className="promotion-checkbox"
            style={{ "--promotion-accent": color } as React.CSSProperties}
            checked={selectedKeys.has(key)}
            onChange={() => onToggle(key)}
          />
          <span className="promotion-dot" style={{ backgroundColor: color }} />
          <span className="promotion-label-text">{promotion.name}</span>
        </label>
      );
    }

    // This promotion itself has multiple discovered sub-series - render it
    // as its own expandable group, same pattern as the family groups above.
    const keys = subValues.map((v) => filterKey(promotion.code, v));
    const selectedCount = keys.filter((k) => selectedKeys.has(k)).length;
    const allSelected = selectedCount === keys.length;
    const noneSelected = selectedCount === 0;
    const expanded = expandedPromotions.has(promotion.code);

    return (
      <div className="promotion-group" key={promotion.id}>
        <div className={"promotion-group-header" + (indented ? " promotion-row-indented" : "")}>
          <button
            type="button"
            className="promotion-group-caret"
            onClick={() => toggleExpandedPromotion(promotion.code)}
            aria-label={expanded ? t("sidebar.collapseAria", { name: promotion.name }) : t("sidebar.expandAria", { name: promotion.name })}
          >
            <ChevronIcon expanded={expanded} />
          </button>
          <TriStateCheckbox
            checked={allSelected}
            indeterminate={!allSelected && !noneSelected}
            onChange={() => onSetMany(keys, !allSelected)}
            ariaLabel={t("sidebar.selectPromotionAria", { name: promotion.name })}
            accentColor={color}
          />
          <span className="promotion-dot" style={{ backgroundColor: color }} />
          <span className="promotion-group-label">{promotion.name}</span>
        </div>

        <div className={"promotion-group-children-wrapper" + (expanded ? " expanded" : "")}>
          <div className="promotion-group-children">
            {subValues.map((value) => {
              const key = filterKey(promotion.code, value);
              return (
                <label className={"promotion-row " + (indented ? "promotion-row-indented-2" : "promotion-row-indented")} key={key}>
                  <input
                    type="checkbox"
                    className="promotion-checkbox"
                    style={{ "--promotion-accent": color } as React.CSSProperties}
                    checked={selectedKeys.has(key)}
                    onChange={() => onToggle(key)}
                  />
                  <span className="promotion-dot" style={{ backgroundColor: color }} />
                  <span className="promotion-label-text">{value ?? t("sidebar.numberedEvents")}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const allKeys = useMemo(
    () => promotions.flatMap((p) => leafKeysForPromotion(p.code, subSeriesByPromotion)),
    [promotions, subSeriesByPromotion],
  );
  const allSelectedCount = allKeys.filter((k) => selectedKeys.has(k)).length;
  const allSelected = allSelectedCount === allKeys.length && allKeys.length > 0;
  const noneSelected = allSelectedCount === 0;

  return (
    <div className="promotion-tree">
      <label className="promotion-row promotion-select-all">
        <TriStateCheckbox
          checked={allSelected}
          indeterminate={!allSelected && !noneSelected}
          onChange={() => onSetMany(allKeys, !allSelected)}
          ariaLabel={t("sidebar.selectAllAria")}
          accentColor="var(--text-bright)"
        />
        <span className="promotion-label-text">{allSelected ? t("sidebar.deselectAll") : t("sidebar.selectAll")}</span>
      </label>

      {GROUP_ORDER.filter((group) => byGroup.has(group)).map((group) => {
        const members = byGroup.get(group)!;
        const memberKeys = members.flatMap((m) => leafKeysForPromotion(m.code, subSeriesByPromotion));
        const selectedCount = memberKeys.filter((k) => selectedKeys.has(k)).length;
        const groupAllSelected = selectedCount === memberKeys.length;
        const groupNoneSelected = selectedCount === 0;
        const expanded = expandedGroups.has(group);
        const groupColor = colorForGroup(group);

        return (
          <div className="promotion-group" key={group}>
            <div className="promotion-group-header">
              <button
                type="button"
                className="promotion-group-caret"
                onClick={() => toggleExpandedGroup(group)}
                aria-label={expanded ? t("sidebar.collapseAria", { name: group }) : t("sidebar.expandAria", { name: group })}
              >
                <ChevronIcon expanded={expanded} />
              </button>
              <TriStateCheckbox
                checked={groupAllSelected}
                indeterminate={!groupAllSelected && !groupNoneSelected}
                onChange={() => onSetMany(memberKeys, !groupAllSelected)}
                ariaLabel={t("sidebar.selectGroupAria", { name: group })}
                accentColor={groupColor}
              />
              <span className="promotion-dot" style={{ backgroundColor: groupColor }} />
              <span className="promotion-group-label">{group}</span>
            </div>

            <div className={"promotion-group-children-wrapper" + (expanded ? " expanded" : "")}>
              <div className="promotion-group-children">{members.map((m) => renderPromotionEntry(m, true))}</div>
            </div>
          </div>
        );
      })}

      {standalone.length > 0 && (
        <div className="promotion-group">
          {byGroup.size > 0 && <div className="promotion-standalone-label">{t("sidebar.other")}</div>}
          {standalone.map((m) => renderPromotionEntry(m, false))}
        </div>
      )}
    </div>
  );
}
