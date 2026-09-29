import React, { useState, useMemo, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronRight, Play, FileText, Pencil } from "lucide-react";
import {
  getClient,
  getOriginalDeckMarkdown,
  getDeckMarkdown,
  titleFromSlug,
} from "../lib/discovery";
import { renderDeck } from "../lib/marp";
import { SlidePresenter } from "../components/slides/SlidePresenter";
import { DeckEditor } from "../components/slides/DeckEditor";
import {
  loadDeckOverride,
  saveDeckOverride,
  clearDeckOverride,
} from "../lib/deckStorage";

export function DeckView() {
  const { clientSlug, deckSlug } = useParams<{ clientSlug: string; deckSlug: string }>();
  const [presentMode, setPresentMode] = useState(false);
  const [presentIndex, setPresentIndex] = useState(0);
  const [editMode, setEditMode] = useState(false);

  const client = clientSlug ? getClient(clientSlug) : undefined;
  const originalMarkdown =
    clientSlug && deckSlug ? getOriginalDeckMarkdown(clientSlug, deckSlug) : undefined;

  const [markdown, setMarkdown] = useState<string | undefined>(() =>
    clientSlug && deckSlug ? getDeckMarkdown(clientSlug, deckSlug) : undefined
  );

  const savedMarkdown = useMemo(
    () =>
      clientSlug && deckSlug
        ? loadDeckOverride(clientSlug, deckSlug) ?? originalMarkdown
        : undefined,
    [clientSlug, deckSlug, originalMarkdown]
  );

  const dirty = useMemo(
    () => markdown !== undefined && savedMarkdown !== undefined && markdown !== savedMarkdown,
    [markdown, savedMarkdown]
  );

  const hasSavedOverride = useMemo(
    () =>
      clientSlug && deckSlug ? loadDeckOverride(clientSlug, deckSlug) !== null : false,
    [clientSlug, deckSlug, markdown]
  );

  const handleSave = useCallback(() => {
    if (!clientSlug || !deckSlug || markdown === undefined) return;
    saveDeckOverride(clientSlug, deckSlug, markdown);
  }, [clientSlug, deckSlug, markdown]);

  const handleReset = useCallback(() => {
    if (!clientSlug || !deckSlug) return;
    clearDeckOverride(clientSlug, deckSlug);
    setMarkdown(originalMarkdown);
  }, [clientSlug, deckSlug, originalMarkdown]);

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
        <Breadcrumbs clientName={client.name} clientSlug={client.slug} deckSlug={deckSlug || ""} />
        <div className="flex items-center justify-center flex-1 text-ink-400">
          Deck not found. Add a .md file in the decks folder.
        </div>
      </div>
    );
  }

  const deckName = titleFromSlug(deckSlug || "");

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
        <Breadcrumbs clientName={client.name} clientSlug={client.slug} deckSlug={deckSlug || ""} />
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
      <Breadcrumbs clientName={client.name} clientSlug={client.slug} deckSlug={deckSlug || ""} />

      <div className="px-10 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">{deckName}</h1>
            {hasSavedOverride && (
              <p className="text-xs text-amber-400 mt-1">
                This deck has saved edits. Reset to restore the original.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
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
          deckName={deckName}
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
  deckName,
  onSlideDoubleClick,
}: {
  markdown: string;
  deckName: string;
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

function Breadcrumbs({ clientName, clientSlug, deckSlug }: { clientName: string; clientSlug: string; deckSlug: string }) {
  return (
    <div className="px-10 pt-6">
      <Link to="/" className="text-sm text-ink-400 hover:text-white transition-colors">
        Clients
      </Link>
      <ChevronRight className="inline h-3 w-3 text-ink-500 mx-1" />
      <Link to={`/${clientSlug}`} className="text-sm text-ink-400 hover:text-white transition-colors">
        {clientName}
      </Link>
      <ChevronRight className="inline h-3 w-3 text-ink-500 mx-1" />
      <span className="text-sm text-ink-200">{titleFromSlug(deckSlug)}</span>
    </div>
  );
}
