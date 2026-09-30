import React, { useState, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronRight, Plus } from "lucide-react";
import {
  canCreateRequirements,
  createRequirement,
  nextRequirementKey,
  getClient,
  getRequirementGroupsForClient,
  getRequirementMarkdown,
  requirementAnchorId,
  requirementKey,
} from "../lib/discovery";
import type { RequirementDoc } from "../lib/types";
import { saveDocOverride } from "../lib/docStorage";
import { TableOfContents, useHeadingToc } from "../components/docs/TableOfContents";
import { InlineMarkdownEditor } from "../components/editor/InlineMarkdownEditor";
import {
  EditableRequirementTitle,
  getRequirementTitle,
  useTitlesVersion,
} from "../components/docs/EditableTitle";

function NewRequirement({
  clientSlug,
  groupSlug,
  groupName,
  compact = false,
}: {
  clientSlug: string;
  groupSlug: string;
  groupName: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  if (!canCreateRequirements) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-lg text-accent-700 dark:text-accent-400 hover:bg-ink-800 transition-colors ${
          compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm border border-ink-700"
        }`}
      >
        <Plus className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        New requirement
      </button>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      const slug = await createRequirement(clientSlug, groupSlug, title, description);
      // Full load so the new file is picked up by the content glob.
      window.location.assign(`/${clientSlug}/requirements/${groupSlug}/${slug}`);
    } catch {
      setSaving(false);
      window.alert("Couldn't create the requirement. Is the dev server running?");
    }
  };

  return (
    <form
      onSubmit={submit}
      className="w-full border border-ink-700 rounded-xl bg-ink-900 p-4 space-y-3"
    >
      <div className="flex items-center gap-2 text-sm">
        <span className="font-mono text-xs font-medium text-accent-700 dark:text-accent-400">
          {nextRequirementKey(clientSlug)}
        </span>
        <span className="text-ink-400">New {groupName} requirement</span>
      </div>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        placeholder="Title"
        className="w-full rounded-lg bg-ink-800 border border-ink-700 px-3 py-2 text-sm text-ink-50 focus:border-accent-500 focus:outline-none"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (markdown supported)"
        rows={4}
        className="w-full rounded-lg bg-ink-800 border border-ink-700 px-3 py-2 text-sm text-ink-50 focus:border-accent-500 focus:outline-none"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 text-sm rounded-lg text-ink-300 hover:bg-ink-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!title.trim() || saving}
          className="px-3 py-1.5 text-sm rounded-lg bg-accent-500 text-white disabled:opacity-50"
        >
          {saving ? "Creating…" : "Create"}
        </button>
      </div>
    </form>
  );
}

function RequirementTitle({ doc }: { doc: RequirementDoc }) {
  return (
    <span className="flex items-baseline gap-2 min-w-0">
      <span className="shrink-0 font-mono text-xs font-medium text-accent-700 dark:text-accent-400">
        {requirementKey(doc)}
      </span>
      <EditableRequirementTitle doc={doc} className="flex-1" />
    </span>
  );
}

export function RequirementsView() {
  const { clientSlug, groupSlug, docSlug } = useParams<{
    clientSlug: string;
    groupSlug?: string;
    docSlug?: string;
  }>();

  const client = clientSlug ? getClient(clientSlug) : undefined;
  const groups = clientSlug ? getRequirementGroupsForClient(clientSlug) : [];

  if (!client) {
    return (
      <div className="flex items-center justify-center h-full text-ink-400">
        Client not found.
      </div>
    );
  }

  if (groupSlug && docSlug) {
    return (
      <RequirementDocView
        clientName={client.name}
        clientSlug={client.slug}
        groupSlug={groupSlug}
        docSlug={docSlug}
        groups={groups}
      />
    );
  }

  if (groupSlug) {
    const group = groups.find((g) => g.slug === groupSlug);
    if (!group) {
      return (
        <div className="flex items-center justify-center h-full text-ink-400">
          Requirements group not found.
        </div>
      );
    }
    return (
      <RequirementGroupView
        clientName={client.name}
        clientSlug={client.slug}
        groupSlug={groupSlug}
        groups={groups}
      />
    );
  }

  return (
    <AllRequirementsView
      clientName={client.name}
      clientSlug={client.slug}
      groups={groups}
    />
  );
}

function AllRequirementsView({
  clientName,
  clientSlug,
  groups,
}: {
  clientName: string;
  clientSlug: string;
  groups: ReturnType<typeof getRequirementGroupsForClient>;
}) {
  useTitlesVersion();
  const allDocs = groups.flatMap((g) => g.docs);
  const tocItems = allDocs.map((doc) => ({
    id: requirementAnchorId(doc),
    label: `${requirementKey(doc)} ${getRequirementTitle(doc)}`,
  }));

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
        <span className="text-sm text-ink-200">Requirements</span>
      </div>

      <div className="px-10 py-8 max-w-4xl w-full">
        <h1 className="text-2xl font-bold text-ink-50 mb-2">All Requirements</h1>
        <p className="text-ink-400 text-sm mb-10">
          {allDocs.length} {allDocs.length === 1 ? "document" : "documents"} across{" "}
          {groups.length} {groups.length === 1 ? "group" : "groups"}.
          Double-click any document body to edit inline.
        </p>

        <div className="flex flex-wrap gap-2 mb-8">
          <Link
            to={`/${clientSlug}/requirements`}
            className="px-3 py-1.5 rounded-full text-sm bg-accent-500 text-white"
          >
            All ({allDocs.length})
          </Link>
          {groups.map((g) => (
            <Link
              key={g.slug}
              to={`/${clientSlug}/requirements/${g.slug}`}
              className="px-3 py-1.5 rounded-full text-sm bg-ink-800 text-ink-300 hover:bg-ink-700 transition-colors"
            >
              {g.name} ({g.docs.length})
            </Link>
          ))}
        </div>

        <TableOfContents items={tocItems} title="Requirements" />

        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.slug} className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm uppercase tracking-wider text-ink-400 font-semibold">
                  {group.name}
                </h2>
                <NewRequirement
                  clientSlug={clientSlug}
                  groupSlug={group.slug}
                  groupName={group.name}
                  compact
                />
              </div>
              {group.docs.map((doc) => (
                <RequirementDocSection
                  key={doc.id}
                  clientSlug={clientSlug}
                  groupSlug={doc.group}
                  docSlug={doc.slug}
                  doc={doc}
                  anchorId={requirementAnchorId(doc)}
                />
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function RequirementGroupView({
  clientName,
  clientSlug,
  groupSlug,
  groups,
}: {
  clientName: string;
  clientSlug: string;
  groupSlug: string;
  groups: ReturnType<typeof getRequirementGroupsForClient>;
}) {
  const group = groups.find((g) => g.slug === groupSlug)!;
  const groupName = group.name;
  useTitlesVersion();
  const allCount = groups.reduce((n, g) => n + g.docs.length, 0);
  const tocItems = group.docs.map((doc) => ({
    id: requirementAnchorId(doc),
    label: `${requirementKey(doc)} ${getRequirementTitle(doc)}`,
  }));

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
        <span className="text-sm text-ink-200">{groupName}</span>
      </div>

      <div className="px-10 py-8 max-w-4xl w-full">
        <h1 className="text-2xl font-bold text-ink-50 mb-2">{groupName} Requirements</h1>
        <p className="text-ink-400 text-sm mb-6">
          {group.docs.length} {group.docs.length === 1 ? "document" : "documents"} in this group.
          Double-click any document body to edit inline.
        </p>
        <div className="mb-8">
          <NewRequirement clientSlug={clientSlug} groupSlug={groupSlug} groupName={groupName} />
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          <Link
            to={`/${clientSlug}/requirements`}
            className="px-3 py-1.5 rounded-full text-sm bg-ink-800 text-ink-300 hover:bg-ink-700 transition-colors"
          >
            All ({allCount})
          </Link>
          {groups.map((g) => (
            <Link
              key={g.slug}
              to={`/${clientSlug}/requirements/${g.slug}`}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                g.slug === groupSlug
                  ? "bg-accent-500 text-white"
                  : "bg-ink-800 text-ink-300 hover:bg-ink-700"
              }`}
            >
              {g.name} ({g.docs.length})
            </Link>
          ))}
        </div>

        <TableOfContents items={tocItems} title="Requirements" />

        <div className="space-y-8">
          {group.docs.map((doc) => (
            <RequirementDocSection
              key={doc.id}
              clientSlug={clientSlug}
              groupSlug={groupSlug}
              docSlug={doc.slug}
              doc={doc}
              anchorId={requirementAnchorId(doc)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function RequirementDocSection({
  clientSlug,
  groupSlug,
  docSlug,
  doc,
  anchorId,
}: {
  clientSlug: string;
  groupSlug: string;
  docSlug: string;
  doc: RequirementDoc;
  anchorId: string;
}) {
  const original = getRequirementMarkdown(clientSlug, groupSlug, docSlug) ?? "";
  const [markdown, setMarkdown] = useState(original);

  const handleSave = useCallback(
    (next: string) => {
      saveDocOverride("requirement", clientSlug, groupSlug, docSlug, next);
      setMarkdown(next);
    },
    [clientSlug, groupSlug, docSlug]
  );

  return (
    <div
      id={anchorId}
      className="border border-ink-700 rounded-xl bg-ink-900 overflow-hidden scroll-mt-8"
    >
      <div className="border-b border-ink-700 px-6 py-3 flex items-center justify-between gap-3 bg-ink-800/50">
        <h2 className="text-lg font-semibold text-ink-50 min-w-0 flex-1">
          <RequirementTitle doc={doc} />
        </h2>
        <Link
          to={`/${clientSlug}/requirements/${groupSlug}/${docSlug}`}
          className="shrink-0 text-xs text-accent-700 dark:text-accent-400 hover:text-accent-800 dark:hover:text-accent-300 transition-colors"
        >
          View →
        </Link>
      </div>
      <div className="px-4 py-4">
        {markdown ? (
          <InlineMarkdownEditor value={markdown} onSave={handleSave} />
        ) : (
          <div className="text-ink-400 text-sm px-2">Document not found.</div>
        )}
      </div>
    </div>
  );
}

function RequirementDocView({
  clientName,
  clientSlug,
  groupSlug,
  docSlug,
  groups,
}: {
  clientName: string;
  clientSlug: string;
  groupSlug: string;
  docSlug: string;
  groups: ReturnType<typeof getRequirementGroupsForClient>;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const group = groups.find((g) => g.slug === groupSlug);
  const doc = group?.docs.find((d) => d.slug === docSlug);
  const original = getRequirementMarkdown(clientSlug, groupSlug, docSlug) ?? "";
  const [markdown, setMarkdown] = useState(original);
  const tocItems = useHeadingToc(contentRef, [markdown, docSlug]);
  useTitlesVersion();

  const handleSave = useCallback(
    (next: string) => {
      saveDocOverride("requirement", clientSlug, groupSlug, docSlug, next);
      setMarkdown(next);
    },
    [clientSlug, groupSlug, docSlug]
  );

  if (!doc) {
    return (
      <div className="flex items-center justify-center h-full text-ink-400">
        Document not found.
      </div>
    );
  }

  const docIndex = group!.docs.findIndex((d) => d.slug === docSlug);
  const prevDoc = docIndex > 0 ? group!.docs[docIndex - 1] : null;
  const nextDoc = docIndex < group!.docs.length - 1 ? group!.docs[docIndex + 1] : null;

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
        <Link
          to={`/${clientSlug}/requirements/${groupSlug}`}
          className="text-sm text-ink-400 hover:text-ink-50 transition-colors"
        >
          {group!.name}
        </Link>
        <ChevronRight className="inline h-3 w-3 text-ink-500 mx-1" />
        <span className="text-sm text-ink-200 inline-flex items-baseline gap-2">
          <span className="font-mono text-xs text-accent-700 dark:text-accent-400">
            {requirementKey(doc)}
          </span>
          {getRequirementTitle(doc)}
        </span>
      </div>

      <div className="px-10 py-8 max-w-4xl w-full">
        <Link
          to={`/${clientSlug}/requirements/${groupSlug}`}
          className="inline-flex items-center gap-1 text-sm text-ink-400 hover:text-ink-50 transition-colors mb-6"
        >
          ← Back to {group!.name}
        </Link>

        <h1 className="text-2xl font-bold text-ink-50 mb-6 flex items-baseline gap-3">
          <span className="shrink-0 font-mono text-sm font-medium text-accent-700 dark:text-accent-400">
            {requirementKey(doc)}
          </span>
          <EditableRequirementTitle doc={doc} className="flex-1" />
        </h1>

        <TableOfContents items={tocItems} title="On this page" />

        <div ref={contentRef}>
          <InlineMarkdownEditor value={markdown} onSave={handleSave} />
        </div>

        <div className="flex items-center justify-between mt-12 pt-6 border-t border-ink-700">
          {prevDoc ? (
            <Link
              to={`/${clientSlug}/requirements/${groupSlug}/${prevDoc.slug}`}
              className="text-sm text-ink-300 hover:text-ink-50 transition-colors inline-flex items-baseline gap-2"
            >
              ←
              <span className="font-mono text-xs text-accent-700 dark:text-accent-400">
                {requirementKey(prevDoc)}
              </span>
              {getRequirementTitle(prevDoc)}
            </Link>
          ) : (
            <span />
          )}
          {nextDoc ? (
            <Link
              to={`/${clientSlug}/requirements/${groupSlug}/${nextDoc.slug}`}
              className="text-sm text-ink-300 hover:text-ink-50 transition-colors inline-flex items-baseline gap-2"
            >
              <span className="font-mono text-xs text-accent-700 dark:text-accent-400">
                {requirementKey(nextDoc)}
              </span>
              {getRequirementTitle(nextDoc)} →
            </Link>
          ) : (
            <span />
          )}
        </div>
      </div>
    </div>
  );
}
