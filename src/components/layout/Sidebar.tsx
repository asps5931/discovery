import React from "react";
import { Link, useLocation } from "react-router-dom";
import { FolderKanban, Presentation, FileText, FlaskConical, NotebookPen, ChevronRight } from "lucide-react";
import { clients, getDecksForClient, getRequirementGroupsForClient, getPocsForClient, getNoteGroupsForClient } from "../../lib/discovery";

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 flex-shrink-0 bg-ink-900 border-r border-ink-700 flex flex-col h-full overflow-y-auto">
      <div className="px-5 py-5 border-b border-ink-700">
        <Link to="/" className="flex items-center gap-2 text-white font-semibold text-lg">
          <div className="h-8 w-8 rounded-lg bg-accent-500 flex items-center justify-center">
            <FolderKanban className="h-5 w-5 text-white" />
          </div>
          Discovery
        </Link>
      </div>

      <nav className="flex-1 py-4">
        {clients.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-ink-400">
            No clients yet. Add a client folder in <code className="text-accent-400">content/clients/</code>
          </div>
        )}

        {clients.map((client) => {
          const clientDecks = getDecksForClient(client.slug);
          const clientReqGroups = getRequirementGroupsForClient(client.slug);
          const clientPocs = getPocsForClient(client.slug);
          const clientNoteGroups = getNoteGroupsForClient(client.slug);
          const isActive = location.pathname.startsWith(`/${client.slug}`);

          return (
            <div key={client.slug} className="mb-1">
              <Link
                to={`/${client.slug}`}
                className={`flex items-center gap-2 px-5 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-white bg-ink-800"
                    : "text-ink-300 hover:text-white hover:bg-ink-800/50"
                }`}
              >
                <ChevronRight
                  className={`h-3 w-3 transition-transform ${isActive ? "rotate-90" : ""}`}
                />
                {client.name}
              </Link>

              {isActive && (
                <div className="ml-4 mt-1 space-y-0.5">
                  {clientDecks.length > 0 && (
                    <SidebarSection
                      label="Decks"
                      icon={<Presentation className="h-3.5 w-3.5" />}
                      items={clientDecks.map((d) => ({
                        slug: d.slug,
                        name: d.name,
                        path: `/${client.slug}/decks/${d.slug}`,
                        badge: `${d.slideCount}`,
                      }))}
                      location={location}
                    />
                  )}

                  {clientReqGroups.length > 0 && (
                    <SidebarSection
                      label="Requirements"
                      icon={<FileText className="h-3.5 w-3.5" />}
                      items={clientReqGroups.map((g) => ({
                        slug: g.slug,
                        name: g.name,
                        path: `/${client.slug}/requirements/${g.slug}`,
                        badge: `${g.docs.length}`,
                      }))}
                      location={location}
                    />
                  )}

                  {clientPocs.length > 0 && (
                    <SidebarSection
                      label="POCs"
                      icon={<FlaskConical className="h-3.5 w-3.5" />}
                      items={clientPocs.map((p) => ({
                        slug: p.slug,
                        name: p.name,
                        path: `/${client.slug}/pocs/${p.slug}`,
                      }))}
                      location={location}
                    />
                  )}

                  {clientNoteGroups.length > 0 && (
                    <SidebarSection
                      label="Notes"
                      icon={<NotebookPen className="h-3.5 w-3.5" />}
                      items={clientNoteGroups.map((g) => ({
                        slug: g.slug,
                        name: g.name,
                        path: `/${client.slug}/notes/${g.slug}`,
                        badge: `${g.notes.length}`,
                      }))}
                      location={location}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function SidebarSection({
  label,
  icon,
  items,
  location,
}: {
  label: string;
  icon: React.ReactNode;
  items: { slug: string; name: string; path: string; badge?: string }[];
  location: { pathname: string };
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5 px-5 py-1 text-[11px] uppercase tracking-wider text-ink-400 font-medium">
        {icon}
        {label}
      </div>
      {items.map((item) => {
        const isActive = location.pathname.startsWith(item.path);
        return (
          <Link
            key={item.slug}
            to={item.path}
            className={`flex items-center justify-between pl-8 pr-5 py-1.5 text-sm transition-colors ${
              isActive
                ? "text-accent-300 bg-ink-800/80 border-l-2 border-accent-500"
                : "text-ink-300 hover:text-white hover:bg-ink-800/40"
            }`}
          >
            <span className="truncate">{item.name}</span>
            {item.badge && (
              <span className="text-[10px] font-mono text-ink-400 bg-ink-700 px-1.5 py-0.5 rounded">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
