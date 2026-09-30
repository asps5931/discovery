import React, { useEffect, useState } from "react";
import {
  DOC_TITLES_CHANGED_EVENT,
  loadTitleOverride,
  saveTitleOverride,
  type DocKind,
} from "../../lib/docStorage";

type TitledDoc = { clientSlug: string; group: string; slug: string; name: string };

export function getRequirementTitle(doc: TitledDoc, kind: DocKind = "requirement"): string {
  return loadTitleOverride(kind, doc.clientSlug, doc.group, doc.slug) ?? doc.name;
}

/** Re-renders the caller whenever any requirement title is renamed. */
export function useTitlesVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener(DOC_TITLES_CHANGED_EVENT, bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener(DOC_TITLES_CHANGED_EVENT, bump);
      window.removeEventListener("storage", bump);
    };
  }, []);
  return version;
}

export function EditableRequirementTitle({
  doc,
  kind = "requirement",
  className = "",
}: {
  doc: TitledDoc;
  kind?: DocKind;
  className?: string;
}) {
  useTitlesVersion();
  const current = getRequirementTitle(doc, kind);
  const [draft, setDraft] = useState(current);

  useEffect(() => setDraft(current), [current]);

  const commit = () => {
    const next = draft.trim();
    if (!next) {
      setDraft(current);
      return;
    }
    if (next !== current) {
      saveTitleOverride(
        kind,
        doc.clientSlug,
        doc.group,
        doc.slug,
        next === doc.name ? "" : next
      );
    }
  };

  return (
    <input
      type="text"
      value={draft}
      aria-label={kind === "note" ? "Document title" : "Requirement title"}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setDraft(current);
          requestAnimationFrame(() => e.currentTarget?.blur());
        }
      }}
      size={Math.max(draft.length, 4)}
      className={`min-w-0 max-w-full bg-transparent rounded px-1 -mx-1 border border-transparent hover:border-ink-600 focus:border-accent-500 focus:outline-none transition-colors ${className}`}
    />
  );
}
