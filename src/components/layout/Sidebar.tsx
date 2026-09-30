import React, { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FolderKanban,
  Presentation,
  FileText,
  FlaskConical,
  NotebookPen,
  ChevronDown,
  Store,
  ListChecks,
} from "lucide-react";
import {
  clients,
  getDecksForClient,
  getRequirementGroupsForClient,
  getPocsForClient,
  getNoteGroupsForClient,
} from "../../lib/discovery";
import { DECKS_CHANGED_EVENT } from "../../lib/deckStorage";
import { ThemeToggle } from "./ThemeToggle";

const SECTION_STATE_KEY = "discovery-sidebar-sections";

function loadSectionState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(SECTION_STATE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveSectionState(state: Record<string, boolean>) {
  try {
    localStorage.setItem(SECTION_STATE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function Sidebar() {
  const location = useLocation();
  const [sectionOpen, setSectionOpen] = useState<Record<string, boolean>>(() =>
    loadSectionState()
  );
  const [deckTick, setDeckTick] = useState(0);

  useEffect(() => {
    const refresh = () => setDeckTick((t) => t + 1);
    window.addEventListener(DECKS_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(DECKS_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const toggleSection = useCallback((key: string) => {
    setSectionOpen((prev) => {
      const next = { ...prev, [key]: !(prev[key] ?? true) };
      saveSectionState(next);
      return next;
    });
  }, []);

  return (
    <aside className="w-60 flex-shrink-0 bg-ink-900 border-r border-ink-700 flex flex-col h-full overflow-y-auto">
      <div className="px-4 py-4 border-b border-ink-700">
        <Link
          to="/"
          className="flex items-center gap-2.5 text-ink-50 font-semibold text-base tracking-tight"
        >
          <div className="h-7 w-7 rounded-md bg-accent-500 flex items-center justify-center shrink-0">
            <FolderKanban className="h-4 w-4 text-white" />
          </div>
          Discovery
        </Link>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-1">
        {clients.length === 0 && (
          <div className="px-3 py-8 text-center text-sm text-ink-400">
            No clients yet.
          </div>
        )}

        {clients.map((client) => {
          void deckTick;
          const clientDecks = getDecksForClient(client.slug);
          const clientReqGroups = getRequirementGroupsForClient(client.slug);
          const clientPocs = getPocsForClient(client.slug);
          const clientNoteGroups = getNoteGroupsForClient(client.slug);
          const isActive = location.pathname.startsWith(`/${client.slug}`);

          return (
            <div key={client.slug}>
              <Link
                to={`/${client.slug}`}
                className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-ink-800 text-ink-50"
                    : "text-ink-300 hover:bg-ink-800/60 hover:text-ink-50"
                }`}
              >
                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 text-ink-500 transition-transform ${
                    isActive ? "" : "-rotate-90"
                  }`}
                />
                <span className="truncate">{client.name}</span>
              </Link>

              {isActive && (
                <div className="mt-1 mb-2 ml-2 border-l border-ink-700 pl-2 space-y-0.5">
                  <Link
                    to={`/${client.slug}/site-profile`}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                      location.pathname === `/${client.slug}/site-profile`
                        ? "bg-ink-800/80 text-ink-200"
                        : "text-ink-400 hover:bg-ink-800/50 hover:text-ink-200"
                    }`}
                  >
                    <Store className="h-3.5 w-3.5 text-ink-500" />
                    Site Profile
                  </Link>
                  <Link
                    to={`/${client.slug}/action-items`}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                      location.pathname === `/${client.slug}/action-items`
                        ? "bg-ink-800/80 text-ink-200"
                        : "text-ink-400 hover:bg-ink-800/50 hover:text-ink-200"
                    }`}
                  >
                    <ListChecks className="h-3.5 w-3.5 text-ink-500" />
                    Action Items
                  </Link>
                  {clientDecks.length > 0 && (
                    <SidebarSection
                      sectionKey={`${client.slug}:decks`}
                      label="Decks"
                      icon={<Presentation className="h-3.5 w-3.5" />}
                      items={clientDecks.map((d) => ({
                        slug: d.slug,
                        name: d.name,
                        path: `/${client.slug}/decks/${d.slug}`,
                        badge: `${d.slideCount}`,
                      }))}
                      location={location}
                      open={sectionOpen[`${client.slug}:decks`] ?? true}
                      onToggle={() => toggleSection(`${client.slug}:decks`)}
                    />
                  )}

                  {clientReqGroups.length > 0 && (
                    <SidebarSection
                      sectionKey={`${client.slug}:requirements`}
                      label="Requirements"
                      href={`/${client.slug}/requirements`}
                      icon={<FileText className="h-3.5 w-3.5" />}
                      items={clientReqGroups.map((g) => ({
                        slug: g.slug,
                        name: g.name,
                        path: `/${client.slug}/requirements/${g.slug}`,
                        badge: `${g.docs.length}`,
                      }))}
                      location={location}
                      open={sectionOpen[`${client.slug}:requirements`] ?? true}
                      onToggle={() =>
                        toggleSection(`${client.slug}:requirements`)
                      }
                    />
                  )}

                  {clientPocs.length > 0 && (
                    <SidebarSection
                      sectionKey={`${client.slug}:pocs`}
                      label="POCs"
                      icon={<FlaskConical className="h-3.5 w-3.5" />}
                      items={clientPocs.map((p) => ({
                        slug: p.slug,
                        name: p.name,
                        path: `/${client.slug}/pocs/${p.slug}`,
                      }))}
                      location={location}
                      open={sectionOpen[`${client.slug}:pocs`] ?? true}
                      onToggle={() => toggleSection(`${client.slug}:pocs`)}
                    />
                  )}

                  {clientNoteGroups.length > 0 && (
                    <SidebarSection
                      sectionKey={`${client.slug}:notes`}
                      label="References"
                      icon={<NotebookPen className="h-3.5 w-3.5" />}
                      items={clientNoteGroups.map((g) => ({
                        slug: g.slug,
                        name: g.name,
                        path: `/${client.slug}/references/${g.slug}`,
                        badge: `${g.notes.length}`,
                      }))}
                      location={location}
                      open={sectionOpen[`${client.slug}:notes`] ?? true}
                      onToggle={() => toggleSection(`${client.slug}:notes`)}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-ink-700 p-2">
        <ThemeToggle />
      </div>
    </aside>
  );
}

function SidebarSection({
  sectionKey,
  label,
  href,
  icon,
  items,
  location,
  open,
  onToggle,
}: {
  sectionKey: string;
  label: string;
  href?: string;
  icon: React.ReactNode;
  items: { slug: string; name: string; path: string; badge?: string }[];
  location: { pathname: string };
  open: boolean;
  onToggle: () => void;
}) {
  const panelId = `sidebar-section-${sectionKey.replace(/[^a-z0-9_-]/gi, "-")}`;
  const sectionActive = href
    ? location.pathname === href || location.pathname.startsWith(`${href}/`)
    : false;

  return (
    <div>
      <div
        className={`flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors ${
          sectionActive
            ? "bg-ink-800/80 text-ink-200"
            : "text-ink-400 hover:bg-ink-800/50 hover:text-ink-200"
        }`}
      >
        {href ? (
          <Link
            to={href}
            className="flex min-w-0 flex-1 items-center gap-2"
          >
            <span className="text-ink-500">{icon}</span>
            <span className="truncate text-left font-medium">{label}</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={onToggle}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <span className="text-ink-500">{icon}</span>
            <span className="truncate font-medium">{label}</span>
          </button>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={`${open ? "Collapse" : "Expand"} ${label}`}
          className="rounded p-0.5 text-ink-500 hover:text-ink-200"
        >
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 transition-transform ${
              open ? "" : "-rotate-90"
            }`}
          />
        </button>
      </div>

      {open && (
        <div id={panelId} role="region" aria-label={label} className="mt-0.5 space-y-0.5">
          {items.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.slug}
                to={item.path}
                className={`flex items-center gap-2 rounded-md py-1.5 pl-8 pr-2 text-sm transition-colors ${
                  isActive
                    ? "bg-accent-500/10 text-accent-800 dark:text-accent-300 font-medium"
                    : "text-ink-300 hover:bg-ink-800/50 hover:text-ink-50"
                }`}
              >
                <span className="truncate flex-1">{item.name}</span>
                {item.badge && (
                  <span className="shrink-0 text-[11px] font-medium tabular-nums text-ink-400">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
