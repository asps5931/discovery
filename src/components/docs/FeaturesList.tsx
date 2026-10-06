import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Plus, X } from "lucide-react";
import { ConfirmButton } from "../ConfirmButton";
import { getRequirementMarkdown } from "../../lib/discovery";
import { saveDocOverride } from "../../lib/docStorage";
import { stripFrontmatter } from "../../lib/frontmatter";

export const FEATURES_LIST_GROUP = "features-list";

function parseTitles(raw: string): string[] {
  return stripFrontmatter(raw)
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*[-*]\s+(.*)$/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => m[1].trim())
    .filter(Boolean);
}

function serializeTitles(titles: string[]): string {
  return titles.length ? titles.map((title) => `- ${title.replace(/\s+/g, " ")}`).join("\n") + "\n" : "";
}

export function FeaturesList({
  clientSlug,
  groupSlug,
  docSlug,
}: {
  clientSlug: string;
  groupSlug: string;
  docSlug: string;
}) {
  const [items, setItems] = useState<string[]>(() =>
    parseTitles(getRequirementMarkdown(clientSlug, groupSlug, docSlug) ?? "")
  );
  const itemsRef = useRef(items);
  const [draft, setDraft] = useState("");

  const write = (next: string[]) => {
    saveDocOverride("requirement", clientSlug, groupSlug, docSlug, serializeTitles(next));
  };

  const save = (next: string[]) => {
    itemsRef.current = next;
    setItems(next);
    write(next);
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const title = draft.trim();
    if (!title) return;
    save([...items, title]);
    setDraft("");
  };

  return (
    <div>
      <form onSubmit={add} className="flex gap-2 mb-6">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a feature…"
          className="flex-1 rounded-lg bg-ink-800 border border-ink-700 px-3 py-2 text-sm text-ink-50 focus:border-accent-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-accent-500 text-white disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-ink-400">No features yet.</p>
      ) : (
        <ul className="border border-ink-700 rounded-xl bg-ink-900 divide-y divide-ink-700">
          {items.map((title, index) => (
            <li key={index} className="group flex items-center gap-2 px-3 py-2">
              <input
                value={title}
                aria-label={`Feature ${index + 1} title`}
                onChange={(e) => {
                  const next = itemsRef.current.slice();
                  next[index] = e.target.value;
                  itemsRef.current = next;
                  setItems(next);
                  const trimmed = next.map((item) => item.trim());
                  if (trimmed.every(Boolean)) write(trimmed);
                }}
                onBlur={() => save(itemsRef.current.map((item) => item.trim()).filter(Boolean))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                className="flex-1 min-w-0 bg-transparent rounded px-1 py-0.5 text-sm text-ink-100 border border-transparent hover:border-ink-600 focus:border-accent-500 focus:outline-none"
              />
              <ConfirmButton
                message={`Remove "${title.trim() || "this feature"}"?`}
                confirmLabel="Remove"
                onConfirm={() => save(items.filter((_, i) => i !== index))}
                ariaLabel={`Remove "${title.trim() || "feature"}"`}
                className="shrink-0 rounded p-0.5 text-ink-500 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-ink-200 transition-opacity"
              >
                <X className="h-4 w-4" />
              </ConfirmButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function FeaturesListPage({
  clientName,
  clientSlug,
  docSlug,
}: {
  clientName: string;
  clientSlug: string;
  docSlug: string;
}) {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-10 pt-6">
        <Link to="/" className="text-sm text-ink-400 hover:text-ink-50 transition-colors">
          Clients
        </Link>
        <ChevronRight className="inline h-3 w-3 text-ink-500 mx-1" />
        <Link to={`/${clientSlug}`} className="text-sm text-ink-400 hover:text-ink-50 transition-colors">
          {clientName}
        </Link>
        <ChevronRight className="inline h-3 w-3 text-ink-500 mx-1" />
        <Link
          to={`/${clientSlug}/requirements`}
          className="text-sm text-ink-400 hover:text-ink-50 transition-colors"
        >
          Requirements
        </Link>
        <ChevronRight className="inline h-3 w-3 text-ink-500 mx-1" />
        <span className="text-sm text-ink-200">Features List</span>
      </div>

      <div className="px-10 py-8 max-w-4xl w-full">
        <h1 className="text-2xl font-bold text-ink-50 mb-6">Features List</h1>
        <FeaturesList clientSlug={clientSlug} groupSlug={FEATURES_LIST_GROUP} docSlug={docSlug} />
      </div>
    </div>
  );
}
