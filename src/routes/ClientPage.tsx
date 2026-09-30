import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Presentation,
  FileText,
  FlaskConical,
  NotebookPen,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Plus,
  X,
} from "lucide-react";
import {
  getClient,
  getDecksForClient,
  getRequirementGroupsForClient,
  getPocsForClient,
  getNoteGroupsForClient,
} from "../lib/discovery";
import {
  createUserDeck,
  DECKS_CHANGED_EVENT,
} from "../lib/deckStorage";

export function ClientPage() {
  const { clientSlug } = useParams<{ clientSlug: string }>();
  const navigate = useNavigate();
  const client = clientSlug ? getClient(clientSlug) : undefined;
  const [deckTick, setDeckTick] = useState(0);
  const [showNewDeck, setShowNewDeck] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState("");
  const [newDeckError, setNewDeckError] = useState("");

  useEffect(() => {
    const refresh = () => setDeckTick((t) => t + 1);
    window.addEventListener(DECKS_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(DECKS_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  if (!client) {
    return (
      <div className="flex items-center justify-center h-full text-ink-400">
        Client not found.
      </div>
    );
  }

  const clientDecks = getDecksForClient(client.slug);
  void deckTick;
  const clientReqGroups = getRequirementGroupsForClient(client.slug);
  const clientPocs = getPocsForClient(client.slug);
  const clientNoteGroups = getNoteGroupsForClient(client.slug);

  const handleCreateDeck = () => {
    if (!newDeckTitle.trim()) {
      setNewDeckError("Please enter a deck title.");
      return;
    }
    const taken = getDecksForClient(client.slug).map((d) => d.slug);
    const created = createUserDeck(client.slug, newDeckTitle.trim(), taken);
    setShowNewDeck(false);
    setNewDeckTitle("");
    setNewDeckError("");
    navigate(`/${client.slug}/decks/${created.slug}`);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Breadcrumb */}
      <div className="px-10 pt-6">
        <Link to="/" className="text-sm text-ink-400 hover:text-ink-50 transition-colors">
          Clients
        </Link>
        <ChevronRight className="inline h-3 w-3 text-ink-500 mx-1" />
        <span className="text-sm text-ink-200">{client.name}</span>
      </div>

      <div className="px-10 py-8 max-w-5xl w-full">
        <h1 className="text-3xl font-bold text-ink-50 mb-2">{client.name}</h1>
        {client.description && (
          <p className="text-ink-400 text-lg mb-10 max-w-2xl">{client.description}</p>
        )}

        {/* Decks section — always shown so users can create decks */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm uppercase tracking-wider text-ink-400 font-semibold flex items-center gap-2">
              <Presentation className="h-4 w-4" /> Slide Decks
            </h2>
            <button
              type="button"
              onClick={() => {
                setShowNewDeck(true);
                setNewDeckError("");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 transition-colors"
            >
              <Plus className="h-4 w-4" /> New deck
            </button>
          </div>

          {showNewDeck && (
            <div className="mb-4 rounded-lg border border-accent-500/40 bg-ink-900 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-ink-50">Create slide deck</h3>
                <button
                  type="button"
                  onClick={() => setShowNewDeck(false)}
                  className="text-ink-400 hover:text-ink-50 transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <label className="block text-sm text-ink-300 mb-1.5" htmlFor="new-deck-title">
                Title
              </label>
              <input
                id="new-deck-title"
                value={newDeckTitle}
                onChange={(e) => setNewDeckTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateDeck();
                }}
                placeholder="e.g. Architecture Overview"
                className="w-full px-3 py-2 mb-3 bg-ink-950 text-ink-100 text-sm rounded-lg border border-ink-700 focus:outline-none focus:ring-1 focus:ring-accent-500"
                autoFocus
              />
              {newDeckError && (
                <p className="text-sm text-red-400 mb-3">{newDeckError}</p>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCreateDeck}
                  className="px-4 py-2 rounded-lg bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 transition-colors"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewDeck(false)}
                  className="px-4 py-2 rounded-lg text-sm text-ink-300 hover:text-ink-50 hover:bg-ink-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {clientDecks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-ink-600 p-8 text-center">
              <p className="text-ink-300 mb-1">No decks yet</p>
              <p className="text-ink-400 text-sm">
                Create a new deck to start building slides.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {clientDecks.map((deck) => (
                <Link
                  key={deck.slug}
                  to={`/${client.slug}/decks/${deck.slug}`}
                  className="group rounded-lg border border-ink-700 bg-ink-900 p-5 hover:border-accent-500/50 hover:bg-ink-800/50 transition-all"
                >
                  <h3 className="text-ink-50 font-medium mb-1">{deck.name}</h3>
                  <p className="text-sm text-ink-400">
                    {deck.slideCount} {deck.slideCount === 1 ? "slide" : "slides"}
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-accent-700 dark:text-accent-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Open deck <ArrowRight className="h-3 w-3" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

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
                  <h3 className="text-ink-50 font-medium mb-1">{group.name}</h3>
                  <p className="text-sm text-ink-400">
                    {group.docs.length} {group.docs.length === 1 ? "doc" : "docs"}
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-accent-700 dark:text-accent-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
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
                  <h3 className="text-ink-50 font-medium mb-1">{poc.name}</h3>
                  <div className="mt-3 flex items-center gap-1 text-accent-700 dark:text-accent-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
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
                  to={`/${client.slug}/references/${group.slug}`}
                  className="group rounded-lg border border-ink-700 bg-ink-900 p-5 hover:border-accent-500/50 hover:bg-ink-800/50 transition-all"
                >
                  <h3 className="text-ink-50 font-medium mb-1">{group.name}</h3>
                  <p className="text-sm text-ink-400">
                    {group.notes.length} {group.notes.length === 1 ? "note" : "notes"}
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-accent-700 dark:text-accent-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    View notes <ArrowRight className="h-3 w-3" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
