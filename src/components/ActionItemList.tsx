import React, { useRef, useState } from "react";
import { GripVertical, Plus, X } from "lucide-react";
import { ConfirmButton } from "./ConfirmButton";
import type { ActionItem } from "../lib/actionItems";

let nextId = 0;

function reorder<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = items.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function ActionItemList({
  items,
  onChange,
  placeholder = "Add an action item…",
  emptyLabel = "No action items yet.",
}: {
  items: ActionItem[];
  onChange: (items: ActionItem[]) => void;
  placeholder?: string;
  emptyLabel?: string;
}) {
  const [draft, setDraft] = useState("");
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const dragFrom = useRef<number | null>(null);
  const openCount = items.filter((item) => !item.done).length;

  const add = (event: React.FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onChange([...items, { id: `new-${nextId++}`, text, done: false }]);
    setDraft("");
  };

  return (
    <>
      <p className="text-ink-400 text-sm mb-8">
        {openCount} open · {items.length - openCount} done
      </p>
      <form onSubmit={add} className="flex gap-2 mb-6">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={placeholder}
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
        <p className="text-sm text-ink-400">{emptyLabel}</p>
      ) : (
        <ul className="border border-ink-700 rounded-xl bg-ink-900 divide-y divide-ink-700">
          {items.map((item, index) => (
            <li
              key={item.id}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setOverIndex((current) => (current === index ? current : index));
              }}
              onDrop={(event) => {
                event.preventDefault();
                const from = dragFrom.current ?? Number(event.dataTransfer.getData("text/plain"));
                dragFrom.current = null;
                setOverIndex(null);
                if (!Number.isNaN(from)) onChange(reorder(items, from, index));
              }}
              className={`group flex items-start gap-3 px-3 py-2.5 ${
                overIndex === index ? "bg-ink-800" : ""
              }`}
            >
              <button
                type="button"
                draggable
                aria-label={`Drag to reorder "${item.text}"`}
                className="mt-0.5 shrink-0 cursor-grab rounded p-0.5 text-ink-500 hover:text-ink-200 active:cursor-grabbing"
                onDragStart={(event) => {
                  dragFrom.current = index;
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", String(index));
                  const row = event.currentTarget.closest("li");
                  if (row) event.dataTransfer.setDragImage(row, 24, 16);
                }}
                onDragEnd={() => {
                  dragFrom.current = null;
                  setOverIndex(null);
                }}
              >
                <GripVertical className="h-4 w-4" />
              </button>
              <input
                type="checkbox"
                checked={item.done}
                onChange={() =>
                  onChange(items.map((entry) => (entry.id === item.id ? { ...entry, done: !entry.done } : entry)))
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
              <ConfirmButton
                message={`Remove "${item.text}"?`}
                confirmLabel="Remove"
                onConfirm={() => onChange(items.filter((entry) => entry.id !== item.id))}
                ariaLabel={`Remove "${item.text}"`}
                className="shrink-0 rounded p-0.5 text-ink-500 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-ink-200 transition-opacity"
              >
                <X className="h-4 w-4" />
              </ConfirmButton>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
