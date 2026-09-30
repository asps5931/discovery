import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ChevronRight, Play, Pencil, Trash2 } from "lucide-react";
import {
  getClient,
  getOriginalDeckMarkdown,
  getDeckMarkdown,
  getDeckDisplayName,
} from "../lib/discovery";
import { renderDeck } from "../lib/marp";
import { SlidePresenter } from "../components/slides/SlidePresenter";
import { DeckEditor } from "../components/slides/DeckEditor";
import {
  loadDeckOverride,
  saveDeckOverride,
  clearDeckOverride,
  isUserDeck,
  deleteUserDeck,
  starterDeckMarkdown,
  DECKS_CHANGED_EVENT,
} from "../lib/deckStorage";

export function DeckView() {
  const { clientSlug, deckSlug } = useParams<{ clientSlug: string; deckSlug: string }>();
  const navigate = useNavigate();
  const [presentMode, setPresentMode] = useState(false);
  const [presentIndex, setPresentIndex] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [deckTick, setDeckTick] = useState(0);

  const client = clientSlug ? getClient(clientSlug) : undefined;
  const userCreated =
    clientSlug && deckSlug ? isUserDeck(clientSlug, deckSlug) : false;
  const originalMarkdown =
    clientSlug && deckSlug ? getOriginalDeckMarkdown(clientSlug, deckSlug) : undefined;

  const [markdown, setMarkdown] = useState<string | undefined>(() =>
    clientSlug && deckSlug ? getDeckMarkdown(clientSlug, deckSlug) : undefined
  );

  useEffect(() => {
    if (clientSlug && deckSlug) {
      setMarkdown(getDeckMarkdown(clientSlug, deckSlug));
    }
  }, [clientSlug, deckSlug, deckTick]);

  useEffect(() => {
    const refresh = () => setDeckTick((t) => t + 1);
    window.addEventListener(DECKS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(DECKS_CHANGED_EVENT, refresh);
  }, []);

  const savedMarkdown = useMemo(() => {
    if (!clientSlug || !deckSlug) return undefined;
    const override = loadDeckOverride(clientSlug, deckSlug);
    if (override !== null) return override;
    return originalMarkdown;
  }, [clientSlug, deckSlug, originalMarkdown, deckTick]);

  const dirty = useMemo(
    () => markdown !== undefined && savedMarkdown !== undefined && markdown !== savedMarkdown,
    [markdown, savedMarkdown]
  );

  const hasSavedOverride = useMemo(
    () =>
      clientSlug && deckSlug ? loadDeckOverride(clientSlug, deckSlug) !== null : false,
    [clientSlug, deckSlug, markdown, deckTick]
  );

  const handleSave = useCallback(() => {
    if (!clientSlug || !deckSlug || markdown === undefined) return;
    saveDeckOverride(clientSlug, deckSlug, markdown);
  }, [clientSlug, deckSlug, markdown]);

  const handleReset = useCallback(() => {
    if (!clientSlug || !deckSlug) return;
    if (userCreated) {
      const name = getDeckDisplayName(clientSlug, deckSlug);
      const starter = starterDeckMarkdown(name);
      saveDeckOverride(clientSlug, deckSlug, starter);
      setMarkdown(starter);
      return;
    }
    clearDeckOverride(clientSlug, deckSlug);
    setMarkdown(originalMarkdown);
  }, [clientSlug, deckSlug, originalMarkdown, userCreated]);

  const handleDelete = useCallback(() => {
    if (!clientSlug || !deckSlug || !userCreated) return;
    if (!window.confirm("Delete this deck? This cannot be undone.")) return;
    deleteUserDeck(clientSlug, deckSlug);
    navigate(`/${clientSlug}`);
  }, [clientSlug, deckSlug, userCreated, navigate]);

  if (!client) {
    return (
      <div className="flex items-center justify-center h-full text-ink-400">
        Client not found.
      </div>
    );
  }

  if (!markdown) {
    return (
      <div className="flex flex-col h-full">
        <Breadcrumbs
          clientName={client.name}
          clientSlug={client.slug}
          deckName={deckSlug || ""}
        />
        <div className="flex items-center justify-center flex-1 text-ink-400">
          Deck not found. Add a .md file in the decks folder, or create a new deck from the client page.
        </div>
      </div>
    );
  }

  const deckName = getDeckDisplayName(client.slug, deckSlug || "");

  if (presentMode) {
    return (
      <div className="fixed inset-0 z-50 bg-ink-950">
        <SlidePresenter
          markdown={markdown}
          deckName={deckName}
          initialIndex={presentIndex}
          onExit={() => setPresentMode(false)}
        />
      </div>
    );
  }

  if (editMode) {
    return (
      <div className="flex flex-col h-full">
        <Breadcrumbs
          clientName={client.name}
          clientSlug={client.slug}
          deckName={deckName}
        />
        <div className="flex-1 overflow-hidden">
          <DeckEditor
            markdown={markdown}
            dirty={dirty}
            onChange={setMarkdown}
            onSave={handleSave}
            onReset={handleReset}
            onExit={() => setEditMode(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <Breadcrumbs
        clientName={client.name}
        clientSlug={client.slug}
        deckName={deckName}
      />

      <div className="px-10 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-ink-50">{deckName}</h1>
            {userCreated ? (
              <p className="text-xs text-ink-400 mt-1">
                User-created deck — stored in this browser.
              </p>
            ) : hasSavedOverride ? (
              <p className="text-xs text-amber-800 dark:text-amber-400 mt-1">
                This deck has saved edits. Reset to restore the original.
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {userCreated && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-ink-600 text-ink-200 text-sm font-medium hover:bg-ink-800 hover:text-red-400 transition-colors"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            )}
            <button
              onClick={() => setEditMode(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-ink-600 text-ink-200 text-sm font-medium hover:bg-ink-800 transition-colors"
            >
              <Pencil className="h-4 w-4" /> Edit
            </button>
            <button
              onClick={() => {
                setPresentIndex(0);
                setPresentMode(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 transition-colors"
            >
              <Play className="h-4 w-4" /> Present
            </button>
          </div>
        </div>

        <DeckPreview
          markdown={markdown}
          onSlideDoubleClick={(i) => {
            setPresentIndex(i);
            setPresentMode(true);
          }}
        />
      </div>
    </div>
  );
}

function DeckPreview({
  markdown,
  onSlideDoubleClick,
}: {
  markdown: string;
  onSlideDoubleClick: (index: number) => void;
}) {
  const { htmls, css } = useMemo(() => renderDeck(markdown), [markdown]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <p className="text-ink-400 text-sm mb-6">
        {htmls.length} {htmls.length === 1 ? "slide" : "slides"} — Click Present to enter
        full-screen presentation mode, or double-click any slide to present from there.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {htmls.map((slideHtml, i) => (
          <div
            key={i}
            onDoubleClick={() => onSlideDoubleClick(i)}
            className="relative aspect-video rounded-lg overflow-hidden border border-ink-700 hover:border-accent-500/50 transition-all cursor-pointer select-none"
            title="Double-click to present from this slide"
          >
            <div
              className="marpit absolute inset-0 pointer-events-none"
              dangerouslySetInnerHTML={{ __html: slideHtml }}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-ink-950/90 to-transparent p-3">
              <span className="text-xs font-mono text-ink-400">{i + 1}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Breadcrumbs({
  clientName,
  clientSlug,
  deckName,
}: {
  clientName: string;
  clientSlug: string;
  deckName: string;
}) {
  return (
    <div className="px-10 pt-6">
      <Link to="/" className="text-sm text-ink-400 hover:text-ink-50 transition-colors">
        Clients
      </Link>
      <ChevronRight className="inline h-3 w-3 text-ink-500 mx-1" />
      <Link to={`/${clientSlug}`} className="text-sm text-ink-400 hover:text-ink-50 transition-colors">
        {clientName}
      </Link>
      <ChevronRight className="inline h-3 w-3 text-ink-500 mx-1" />
      <span className="text-sm text-ink-200">{deckName}</span>
    </div>
  );
}
