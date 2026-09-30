import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronRight, Plus, X } from "lucide-react";
import { getActionItemsMarkdown, getClient, saveActionItems } from "../lib/discovery";
import { parseActionItems, serializeActionItems, type ActionItem } from "../lib/actionItems";

let nextId = 0;

export function ActionItemsView() {
  const { clientSlug = "" } = useParams<{ clientSlug: string }>();
  const client = getClient(clientSlug);
  const [items, setItems] = useState<ActionItem[]>(() =>
    parseActionItems(getActionItemsMarkdown(clientSlug))
  );
  const [draft, setDraft] = useState("");

  const update = (next: ActionItem[]) => {
    setItems(next);
    saveActionItems(clientSlug, serializeActionItems(next));
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    update([...items, { id: `new-${nextId++}`, text, done: false }]);
    setDraft("");
  };

  if (!client) {
    return (
      <div className="flex items-center justify-center h-full text-ink-400">
        Client not found.
      </div>
    );
  }

  const openCount = items.filter((i) => !i.done).length;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-10 pt-6">
        <Link to="/" className="text-sm text-ink-400 hover:text-ink-50 transition-colors">
          Clients
        </Link>
        <ChevronRight className="inline h-3 w-3 text-ink-500 mx-1" />
        <Link to={`/${client.slug}`} className="text-sm text-ink-400 hover:text-ink-50 transition-colors">
          {client.name}
        </Link>
        <ChevronRight className="inline h-3 w-3 text-ink-500 mx-1" />
        <span className="text-sm text-ink-200">Action Items</span>
      </div>

      <div className="px-10 py-8 max-w-4xl w-full">
        <h1 className="text-2xl font-bold text-ink-50 mb-2">Action Items</h1>
        <p className="text-ink-400 text-sm mb-8">
          {openCount} open · {items.length - openCount} done
        </p>

        <form onSubmit={add} className="flex gap-2 mb-6">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add an action item…"
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
          <p className="text-sm text-ink-400">No action items yet.</p>
        ) : (
          <ul className="border border-ink-700 rounded-xl bg-ink-900 divide-y divide-ink-700">
            {items.map((item) => (
              <li key={item.id} className="group flex items-start gap-3 px-4 py-2.5">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() =>
                    update(items.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)))
                  }
                  aria-label={`Mark "${item.text}" ${item.done ? "not done" : "done"}`}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-accent-500 cursor-pointer"
                />
                <span
                  className={`flex-1 text-sm leading-snug ${
                    item.done ? "line-through text-ink-500" : "text-ink-100"
                  }`}
                >
                  {item.text}
                </span>
                <button
                  type="button"
                  onClick={() => update(items.filter((i) => i.id !== item.id))}
                  aria-label={`Remove "${item.text}"`}
                  className="shrink-0 rounded p-0.5 text-ink-500 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-ink-200 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
