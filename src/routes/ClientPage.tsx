import React from "react";
import { Link, useParams } from "react-router-dom";
import { Presentation, FileText, FlaskConical, NotebookPen, ArrowRight, ExternalLink, ChevronRight } from "lucide-react";
import {
  getClient,
  getDecksForClient,
  getRequirementGroupsForClient,
  getPocsForClient,
  getNoteGroupsForClient,
} from "../lib/discovery";

export function ClientPage() {
  const { clientSlug } = useParams<{ clientSlug: string }>();
  const client = clientSlug ? getClient(clientSlug) : undefined;

  if (!client) {
    return (
      <div className="flex items-center justify-center h-full text-ink-400">
        Client not found.
      </div>
    );
  }

  const clientDecks = getDecksForClient(client.slug);
  const clientReqGroups = getRequirementGroupsForClient(client.slug);
  const clientPocs = getPocsForClient(client.slug);
  const clientNoteGroups = getNoteGroupsForClient(client.slug);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Breadcrumb */}
      <div className="px-10 pt-6">
        <Link to="/" className="text-sm text-ink-400 hover:text-white transition-colors">
          Clients
        </Link>
        <ChevronRight className="inline h-3 w-3 text-ink-500 mx-1" />
        <span className="text-sm text-ink-200">{client.name}</span>
      </div>

      <div className="px-10 py-8 max-w-5xl w-full">
        <h1 className="text-3xl font-bold text-white mb-2">{client.name}</h1>
        {client.description && (
          <p className="text-ink-400 text-lg mb-10 max-w-2xl">{client.description}</p>
        )}

        {/* Decks section */}
        {clientDecks.length > 0 && (
          <section className="mb-12">
            <h2 className="text-sm uppercase tracking-wider text-ink-400 font-semibold mb-4 flex items-center gap-2">
              <Presentation className="h-4 w-4" /> Slide Decks
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {clientDecks.map((deck) => (
                <Link
                  key={deck.slug}
                  to={`/${client.slug}/decks/${deck.slug}`}
                  className="group rounded-lg border border-ink-700 bg-ink-900 p-5 hover:border-accent-500/50 hover:bg-ink-800/50 transition-all"
                >
                  <h3 className="text-white font-medium mb-1">{deck.name}</h3>
                  <p className="text-sm text-ink-400">
                    {deck.slideCount} {deck.slideCount === 1 ? "slide" : "slides"}
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-accent-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Open deck <ArrowRight className="h-3 w-3" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Requirements section */}
        {clientReqGroups.length > 0 && (
          <section className="mb-12">
            <h2 className="text-sm uppercase tracking-wider text-ink-400 font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4" /> Requirements
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {clientReqGroups.map((group) => (
                <Link
                  key={group.slug}
                  to={`/${client.slug}/requirements/${group.slug}`}
                  className="group rounded-lg border border-ink-700 bg-ink-900 p-5 hover:border-accent-500/50 hover:bg-ink-800/50 transition-all"
                >
                  <h3 className="text-white font-medium mb-1">{group.name}</h3>
                  <p className="text-sm text-ink-400">
                    {group.docs.length} {group.docs.length === 1 ? "doc" : "docs"}
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-accent-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    View requirements <ArrowRight className="h-3 w-3" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* POCs section */}
        {clientPocs.length > 0 && (
          <section className="mb-12">
            <h2 className="text-sm uppercase tracking-wider text-ink-400 font-semibold mb-4 flex items-center gap-2">
              <FlaskConical className="h-4 w-4" /> Proof of Concepts
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {clientPocs.map((poc) => (
                <Link
                  key={poc.slug}
                  to={`/${client.slug}/pocs/${poc.slug}`}
                  className="group rounded-lg border border-ink-700 bg-ink-900 p-5 hover:border-accent-500/50 hover:bg-ink-800/50 transition-all"
                >
                  <h3 className="text-white font-medium mb-1">{poc.name}</h3>
                  <div className="mt-3 flex items-center gap-1 text-accent-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Open POC <ExternalLink className="h-3 w-3" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Notes section */}
        {clientNoteGroups.length > 0 && (
          <section className="mb-12">
            <h2 className="text-sm uppercase tracking-wider text-ink-400 font-semibold mb-4 flex items-center gap-2">
              <NotebookPen className="h-4 w-4" /> Notes
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {clientNoteGroups.map((group) => (
                <Link
                  key={group.slug}
                  to={`/${client.slug}/notes/${group.slug}`}
                  className="group rounded-lg border border-ink-700 bg-ink-900 p-5 hover:border-accent-500/50 hover:bg-ink-800/50 transition-all"
                >
                  <h3 className="text-white font-medium mb-1">{group.name}</h3>
                  <p className="text-sm text-ink-400">
                    {group.notes.length} {group.notes.length === 1 ? "note" : "notes"}
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-accent-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    View notes <ArrowRight className="h-3 w-3" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {clientDecks.length === 0 && clientReqGroups.length === 0 && clientPocs.length === 0 && clientNoteGroups.length === 0 && (
          <div className="rounded-xl border border-dashed border-ink-600 p-12 text-center">
            <p className="text-ink-300 text-lg mb-2">No content yet</p>
            <p className="text-ink-400 text-sm">
              Add decks, requirements, POCs, or notes under this client's folder to see them here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
