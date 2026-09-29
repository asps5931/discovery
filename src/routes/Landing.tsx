import React from "react";
import { Link } from "react-router-dom";
import { Presentation, FileText, FlaskConical, ArrowRight } from "lucide-react";
import { clients, getDecksForClient, getRequirementGroupsForClient, getPocsForClient } from "../lib/discovery";

export function Landing() {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-10 py-12 max-w-6xl mx-auto w-full">
        <h1 className="text-4xl font-bold text-white mb-3">Discovery</h1>
        <p className="text-ink-400 text-lg mb-12">
          Slide decks, requirements, and proof-of-concept demos — all in one place.
        </p>

        {clients.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {clients.map((client) => {
              const deckCount = getDecksForClient(client.slug).length;
              const reqCount = getRequirementGroupsForClient(client.slug).length;
              const pocCount = getPocsForClient(client.slug).length;

              return (
                <Link
                  key={client.slug}
                  to={`/${client.slug}`}
                  className="group rounded-xl border border-ink-700 bg-ink-900 p-6 hover:border-accent-500/50 hover:bg-ink-800/50 transition-all"
                >
                  <h2 className="text-xl font-semibold text-white mb-1">
                    {client.name}
                  </h2>
                  {client.description && (
                    <p className="text-sm text-ink-400 mb-4 line-clamp-2">
                      {client.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 text-sm text-ink-300">
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      <Presentation className="h-4 w-4 text-ink-400" />
                      {deckCount} {deckCount === 1 ? "deck" : "decks"}
                    </span>
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      <FileText className="h-4 w-4 text-ink-400" />
                      {reqCount} {reqCount === 1 ? "group" : "groups"}
                    </span>
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      <FlaskConical className="h-4 w-4 text-ink-400" />
                      {pocCount} {pocCount === 1 ? "POC" : "POCs"}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-accent-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    View client <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-ink-600 p-12 text-center">
      <p className="text-ink-300 text-lg mb-2">No clients yet</p>
      <p className="text-ink-400 text-sm">
        Add a client by creating a folder in{" "}
        <code className="text-accent-400 bg-ink-800 px-2 py-0.5 rounded">
          src/content/clients/your-client/
        </code>{" "}
        with a <code className="text-accent-400 bg-ink-800 px-2 py-0.5 rounded">meta.ts</code> file.
      </p>
    </div>
  );
}
