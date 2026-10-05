import { useState, type ReactNode } from "react";
import "./Dropdown.css";

export interface DropdownOption {
  value: string;
  label: string;
  // Always listed, even while a search query filters the rest - e.g. the
  // location picker's "Automatic" entry.
  pinned?: boolean;
}

interface DropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  // What the closed dropdown shows: "Language: English", or just the
  // selected option's label.
  trigger: ReactNode;
  // Accessible name of the option list.
  label: string;
  // Extra classes for the wrapper and for the trigger button. Without a
  // trigger class it renders as the standalone pill used across the site;
  // site settings passes its own row style instead.
  className?: string;
  triggerClassName?: string;
  // Pass both to control which dropdown is open from outside - site
  // settings keeps only one of its menus open at a time.
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  // Adds a filter box above the options. `matches` decides whether an
  // option stays for a query; "noResults" shows when nothing does.
  search?: {
    placeholder: string;
    noResults: string;
    matches: (option: DropdownOption, query: string) => boolean;
  };
}

// The one dropdown the site uses - the language and location pickers in
// site settings and the rankings picker all render this - so they look and
// behave the same: the chosen option is highlighted, and a click outside or
// Escape closes it.
export default function Dropdown({
  value,
  options,
  onChange,
  trigger,
  label,
  className,
  triggerClassName = "dropdown-button",
  open: controlledOpen,
  onOpenChange,
  search,
}: DropdownProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [query, setQuery] = useState("");
  const open = controlledOpen ?? uncontrolledOpen;

  function setOpen(next: boolean) {
    // Every open starts with an empty search.
    setQuery("");
    setUncontrolledOpen(next);
    onOpenChange?.(next);
  }

  const trimmed = query.trim();
  const visible = search && trimmed ? options.filter((o) => o.pinned || search.matches(o, trimmed)) : options;
  const nothingMatches = search && trimmed && !visible.some((o) => !o.pinned);

  return (
    <div
      className={"dropdown" + (className ? ` ${className}` : "")}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) setOpen(false);
      }}
    >
      <button
        type="button"
        className={triggerClassName}
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {trigger}
        <span className={"dropdown-chevron" + (open ? " open" : "")} aria-hidden="true">
          &#9662;
        </span>
      </button>

      {open && (
        <>
          <div className="dropdown-backdrop" onClick={() => setOpen(false)} />
          <div className="dropdown-menu">
            {search && (
              <input
                type="text"
                className="dropdown-search"
                placeholder={search.placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
            )}
            <ul className="dropdown-list" role="listbox" aria-label={label}>
              {visible.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={option.value === value}
                    className={"dropdown-option" + (option.value === value ? " active" : "")}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                  >
                    {option.label}
                  </button>
                </li>
              ))}
              {nothingMatches && <li className="dropdown-empty">{search.noResults}</li>}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
