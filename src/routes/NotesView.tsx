import React, { useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ChevronRight,
  Plus,
  Trash2,
  Save,
  X,
  CalendarDays,
  FileDown,
  Tag,
} from "lucide-react";
import {
  getClient,
  getNoteGroupsForClient,
  getNoteMarkdown,
} from "../lib/discovery";
import {
  listUserNotes,
  addUserNote,
  deleteUserNote,
  updateUserNote,
  loadNoteDraft,
  saveNoteDraft,
  clearNoteDraft,
  listHiddenNotes,
  hideNote,
  parseTagsFromMarkdown,
  slugify,
  downloadMarkdownFile,
  type UserNote,
} from "../lib/noteStorage";
import { saveDocOverride } from "../lib/docStorage";
import {
  contentExists,
  deleteContentFile,
  fileSyncEnabled,
  resolveDocPath,
  writeContentFile,
} from "../lib/contentSync";
import {
  EditableRequirementTitle,
  getRequirementTitle,
  useTitlesVersion,
} from "../components/docs/EditableTitle";
import { TableOfContents, useHeadingToc } from "../components/docs/TableOfContents";
import { InlineMarkdownEditor } from "../components/editor/InlineMarkdownEditor";

export function NotesView() {
  const { clientSlug, groupSlug, docSlug } = useParams<{
    clientSlug: string;
    groupSlug?: string;
    docSlug?: string;
  }>();

  const client = clientSlug ? getClient(clientSlug) : undefined;
  const groups = clientSlug ? getNoteGroupsForClient(clientSlug) : [];

  if (!client) {
    return (
      <div className="flex items-center justify-center h-full text-ink-400">
        Client not found.
      </div>
    );
  }

  if (groupSlug) {
    const group = groups.find((g) => g.slug === groupSlug);
    if (!group) {
      return (
        <div className="flex items-center justify-center h-full text-ink-400">
          Notes group not found.
        </div>
      );
    }
    const note = docSlug ? group.notes.find((n) => n.slug === docSlug) : undefined;
    if (docSlug && !note) {
      return (
        <div className="flex items-center justify-center h-full text-ink-400">
          Document not found.
        </div>
      );
    }
    if (note) {
      return <NoteDocView key={note.slug} clientName={client.name} groupName={group.name} note={note} />;
    }
    return (
      <NoteGroupView
        clientName={client.name}
        clientSlug={client.slug}
        groupSlug={groupSlug}
      />
    );
  }

  return (
    <div className="flex items-center justify-center h-full text-ink-400">
      Select a notes group from the sidebar.
    </div>
  );
}

function NoteDocView({
  clientName,
  groupName,
  note,
}: {
  clientName: string;
  groupName: string;
  note: { clientSlug: string; group: string; slug: string; name: string };
}) {
  const { clientSlug, group: groupSlug, slug } = note;
  const contentRef = useRef<HTMLDivElement>(null);
  const [markdown, setMarkdown] = useState(getNoteMarkdown(clientSlug, groupSlug, slug) ?? "");
  const tocItems = useHeadingToc(contentRef, [markdown, slug]);
  useTitlesVersion();

  const handleSave = (next: string) => {
    saveDocOverride("note", clientSlug, groupSlug, slug, next);
    setMarkdown(next);
  };

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
          to={`/${clientSlug}/references/${groupSlug}`}
          className="text-sm text-ink-400 hover:text-ink-50 transition-colors"
        >
          {groupName}
        </Link>
        <ChevronRight className="inline h-3 w-3 text-ink-500 mx-1" />
        <span className="text-sm text-ink-200">{getRequirementTitle(note, "note")}</span>
      </div>

      <div className="px-10 py-8 max-w-4xl w-full">
        <Link
          to={`/${clientSlug}/references/${groupSlug}`}
          className="inline-flex items-center gap-1 text-sm text-ink-400 hover:text-ink-50 transition-colors mb-6"
        >
          ← Back to {groupName}
        </Link>

        <h1 className="text-2xl font-bold text-ink-50 mb-6">
          <EditableRequirementTitle doc={note} kind="note" className="w-full" />
        </h1>

        <TableOfContents items={tocItems} title="On this page" />

        <div ref={contentRef}>
          <InlineMarkdownEditor value={markdown} onSave={handleSave} />
        </div>
      </div>
    </div>
  );
}

function NoteGroupView({
  clientName,
  clientSlug,
  groupSlug,
}: {
  clientName: string;
  clientSlug: string;
  groupSlug: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const titlesVersion = useTitlesVersion();
  // Re-read each render so files created/deleted this session show up.
  const groups = getNoteGroupsForClient(clientSlug);
  const group = groups.find((g) => g.slug === groupSlug)!;
  const noun = groupSlug === "documents" ? "document" : "note";

  const fileNotes = useMemo(() => {
    const hidden = listHiddenNotes(clientSlug, groupSlug);
    return group.notes
      .filter((n) => !hidden.includes(n.slug))
      .map((n) => {
        const markdown = getNoteMarkdown(clientSlug, groupSlug, n.slug) ?? "";
        return { ...n, tags: parseTagsFromMarkdown(markdown) };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientSlug, groupSlug, group.notes.length, refresh]);

  const userNotes = useMemo(
    () => listUserNotes(clientSlug).filter((n) => n.group === groupSlug),
    [clientSlug, groupSlug, refresh]
  );

  const allTags = useMemo(() => {
    const set = new Set<string>();
    userNotes.forEach((n) => n.tags.forEach((t) => set.add(t)));
    fileNotes.forEach((n) => n.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [userNotes, fileNotes]);

  const visibleUserNotes = activeTag
    ? userNotes.filter((n) => n.tags.includes(activeTag))
    : userNotes;

  const visibleFileNotes = activeTag
    ? fileNotes.filter((n) => n.tags.includes(activeTag))
    : fileNotes;

  const total = fileNotes.length + userNotes.length;

  const tocItems = useMemo(
    () => [
      ...visibleUserNotes.map((n) => ({
        id: `note-user-${n.id}`,
        label: n.title,
      })),
      ...visibleFileNotes.map((n) => ({
        id: `note-${n.slug}`,
        label: getRequirementTitle(n, "note"),
      })),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleUserNotes, visibleFileNotes, titlesVersion]
  );

  const handleDeleteFile = (slug: string, title: string) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    if (fileSyncEnabled) {
      void deleteContentFile(resolveDocPath("note", clientSlug, groupSlug, slug));
    } else {
      hideNote(clientSlug, groupSlug, slug);
    }
    setRefresh((r) => r + 1);
  };

  const handleDeleteUser = (id: string) => {
    if (!window.confirm(`Delete this ${noun}?`)) return;
    deleteUserNote(clientSlug, id);
    setRefresh((r) => r + 1);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Breadcrumb */}
      <div className="px-10 pt-6">
        <Link to="/" className="text-sm text-ink-400 hover:text-ink-50 transition-colors">
          Clients
        </Link>
        <ChevronRight className="inline h-3 w-3 text-ink-500 mx-1" />
        <Link to={`/${clientSlug}`} className="text-sm text-ink-400 hover:text-ink-50 transition-colors">
          {clientName}
        </Link>
        <ChevronRight className="inline h-3 w-3 text-ink-500 mx-1" />
        <span className="text-sm text-ink-200">{group.name}</span>
      </div>

      <div className="px-10 py-8 max-w-4xl w-full">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-ink-50">{group.name}</h1>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 transition-colors"
          >
            <Plus className="h-4 w-4" /> New
          </button>
        </div>
        <p className="text-ink-400 text-sm mb-6">
          {total} {total === 1 ? noun : `${noun}s`} in this group.
          Add {noun}s, tag them, and save to a file on your computer.
        </p>

        {/* Group navigation chips */}
        <div className="flex flex-wrap gap-2 mb-8">
          {groups.map((g) => (
            <Link
              key={g.slug}
              to={`/${clientSlug}/references/${g.slug}`}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                g.slug === groupSlug
                  ? "bg-accent-500 text-white"
                  : "bg-ink-800 text-ink-300 hover:bg-ink-700"
              }`}
            >
              {g.name} ({g.notes.length})
            </Link>
          ))}
        </div>

        {showForm && (
          <NoteForm
            clientSlug={clientSlug}
            groupSlug={groupSlug}
            noun={noun}
            onClose={() => setShowForm(false)}
            onSaved={() => {
              setShowForm(false);
              setRefresh((r) => r + 1);
            }}
          />
        )}

        {/* Tag filter */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-8">
            <span className="flex items-center gap-1 text-xs uppercase tracking-wider text-ink-400 font-semibold">
              <Tag className="h-3.5 w-3.5" /> Filter
            </span>
            <button
              onClick={() => setActiveTag(null)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                activeTag === null
                  ? "bg-accent-500 text-white"
                  : "bg-ink-800 text-ink-300 hover:bg-ink-700"
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  activeTag === tag
                    ? "bg-accent-500 text-white"
                    : "bg-ink-800 text-ink-300 hover:bg-ink-700"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {total === 0 && !showForm && (
          <div className="rounded-xl border border-dashed border-ink-600 p-12 text-center">
            <p className="text-ink-300 text-lg mb-2">No {noun}s yet</p>
            <p className="text-ink-400 text-sm">
              Create a new {noun} to start capturing ideas.
            </p>
          </div>
        )}

        {total > 0 &&
          visibleUserNotes.length === 0 &&
          visibleFileNotes.length === 0 && (
            <div className="rounded-xl border border-dashed border-ink-600 p-12 text-center">
              <p className="text-ink-300 text-lg mb-2">No {noun}s with this tag</p>
              <p className="text-ink-400 text-sm">
                Try a different tag or view all {noun}s.
              </p>
            </div>
          )}

        <TableOfContents items={tocItems} title={noun === "document" ? "Documents" : "Notes"} />

        <div className="space-y-4">
          {visibleUserNotes.map((n) => (
            <UserNoteCard
              key={n.id}
              id={`note-user-${n.id}`}
              clientSlug={clientSlug}
              noteId={n.id}
              title={n.title}
              content={n.content}
              tags={n.tags}
              date={n.createdAt}
              onDelete={() => handleDeleteUser(n.id)}
              onContentSaved={() => setRefresh((r) => r + 1)}
            />
          ))}
          {visibleFileNotes.map((n) => (
            <FileNoteCard
              key={n.slug}
              id={`note-${n.slug}`}
              clientSlug={clientSlug}
              groupSlug={groupSlug}
              note={n}
              tags={n.tags}
              onDelete={() => handleDeleteFile(n.slug, getRequirementTitle(n, "note"))}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TagChips({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="text-xs text-accent-300 bg-accent-500/10 border border-accent-500/30 px-2 py-0.5 rounded-full"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

function FileNoteCard({
  id,
  clientSlug,
  groupSlug,
  note,
  tags,
  onDelete,
}: {
  id: string;
  clientSlug: string;
  groupSlug: string;
  note: { clientSlug: string; group: string; slug: string; name: string };
  tags: string[];
  onDelete: () => void;
}) {
  const slug = note.slug;
  const initial = getNoteMarkdown(clientSlug, groupSlug, slug) ?? "";
  const [markdown, setMarkdown] = useState(initial);

  const handleSave = (next: string) => {
    saveDocOverride("note", clientSlug, groupSlug, slug, next);
    setMarkdown(next);
  };

  return (
    <div
      id={id}
      className="border border-ink-700 rounded-xl bg-ink-900 overflow-hidden scroll-mt-8"
    >
      <div className="border-b border-ink-700 px-6 py-3 flex items-center justify-between bg-ink-800/50">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <CalendarDays className="h-4 w-4 shrink-0 text-ink-400" />
          <h2 className="text-lg font-semibold text-ink-50 min-w-0 flex-1">
            <EditableRequirementTitle doc={note} kind="note" />
          </h2>
        </div>
        <button
          onClick={onDelete}
          className="flex items-center gap-1 text-xs text-ink-400 hover:text-red-400 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
        <Link
          to={`/${clientSlug}/references/${groupSlug}/${slug}`}
          className="shrink-0 ml-4 text-xs text-accent-700 dark:text-accent-400 hover:text-accent-800 dark:hover:text-accent-300 transition-colors"
        >
          View →
        </Link>
      </div>
      <div className="px-6 py-3 border-b border-ink-700">
        <TagChips tags={tags} />
      </div>
      <div className="px-4 py-4">
        <InlineMarkdownEditor value={markdown} onSave={handleSave} />
      </div>
    </div>
  );
}

function UserNoteCard({
  id,
  clientSlug,
  noteId,
  title,
  content,
  tags,
  date,
  onDelete,
  onContentSaved,
}: {
  id: string;
  clientSlug: string;
  noteId: string;
  title: string;
  content: string;
  tags: string[];
  date: string;
  onDelete: () => void;
  onContentSaved: () => void;
}) {
  const [markdown, setMarkdown] = useState(content);
  const formattedDate = new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const handleSave = (next: string) => {
    updateUserNote(clientSlug, noteId, { content: next });
    setMarkdown(next);
    onContentSaved();
  };

  return (
    <div
      id={id}
      className="border border-ink-700 rounded-xl bg-ink-900 overflow-hidden scroll-mt-8"
    >
      <div className="border-b border-ink-700 px-6 py-3 flex items-center justify-between bg-ink-800/50">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-ink-400" />
          <h2 className="text-lg font-semibold text-ink-50">{title}</h2>
          <span className="text-xs text-ink-400">{formattedDate}</span>
        </div>
        <button
          onClick={onDelete}
          className="flex items-center gap-1 text-xs text-ink-400 hover:text-red-400 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </div>
      <div className="px-6 py-3 border-b border-ink-700">
        <TagChips tags={tags} />
      </div>
      <div className="px-4 py-4">
        <InlineMarkdownEditor value={markdown} onSave={handleSave} />
      </div>
    </div>
  );
}

function parseTagsInput(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

function NoteForm({
  clientSlug,
  groupSlug,
  noun,
  onClose,
  onSaved,
}: {
  clientSlug: string;
  groupSlug: string;
  noun: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const existing = loadNoteDraft(clientSlug, groupSlug);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [content, setContent] = useState(existing?.content ?? "");
  const [tagsInput, setTagsInput] = useState((existing?.tags ?? []).join(", "));
  const [error, setError] = useState("");

  const handleSave = () => {
    if (!title.trim()) {
      setError(`Please give the ${noun} a title.`);
      return;
    }
    const tags = parseTagsInput(tagsInput);

    if (fileSyncEnabled) {
      const base = slugify(title);
      let slug = base;
      for (let i = 2; contentExists(resolveDocPath("note", clientSlug, groupSlug, slug)); i++) {
        slug = `${base}-${i}`;
      }
      const fm = [`title: ${JSON.stringify(title.trim())}`];
      if (tags.length > 0) fm.push(`tags: ${tags.join(", ")}`);
      void writeContentFile(
        resolveDocPath("note", clientSlug, groupSlug, slug),
        `---\n${fm.join("\n")}\n---\n\n${content.trim()}\n`
      );
      clearNoteDraft(clientSlug, groupSlug);
      onSaved();
      return;
    }

    if (!content.trim()) {
      setError("Please add some notes before saving.");
      return;
    }

    const slug = slugify(title);
    const filename = `${slug}.md`;
    const frontmatter =
      tags.length > 0 ? `---\ntags: ${tags.join(", ")}\n---\n\n` : "";
    const markdown = `${frontmatter}# ${title.trim()}\n\n${content.trim()}\n`;

    downloadMarkdownFile(filename, markdown);

    const note: UserNote = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      group: groupSlug,
      title: title.trim(),
      content: content.trim(),
      tags,
      createdAt: new Date().toISOString(),
    };
    addUserNote(clientSlug, note);
    clearNoteDraft(clientSlug, groupSlug);
    onSaved();
  };

  const handleCancel = () => {
    saveNoteDraft(clientSlug, {
      group: groupSlug,
      title,
      content,
      tags: parseTagsInput(tagsInput),
    });
    onClose();
  };

  return (
    <div className="mb-8 border border-accent-500/40 rounded-xl bg-ink-900 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-ink-50">New</h2>
        <button
          onClick={handleCancel}
          className="text-ink-400 hover:text-ink-50 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <label className="block text-sm text-ink-300 mb-1.5">Title</label>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Weekly sync"
        className="w-full px-3 py-2 mb-4 bg-ink-950 text-ink-100 text-sm rounded-lg border border-ink-700 focus:outline-none focus:ring-1 focus:ring-accent-500"
      />

      <label className="block text-sm text-ink-300 mb-1.5">Tags</label>
      <input
        value={tagsInput}
        onChange={(e) => setTagsInput(e.target.value)}
        placeholder="e.g. design, decisions, follow-up"
        className="w-full px-3 py-2 mb-4 bg-ink-950 text-ink-100 text-sm rounded-lg border border-ink-700 focus:outline-none focus:ring-1 focus:ring-accent-500"
      />
      <p className="text-xs text-ink-500 -mt-2 mb-4">
        Separate tags with commas. Use them to find related {noun}s later.
      </p>

      <label className="block text-sm text-ink-300 mb-1.5">Content</label>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write in markdown..."
        spellCheck={false}
        className="w-full min-h-[180px] px-3 py-2 mb-4 bg-ink-950 text-ink-100 font-mono text-sm leading-relaxed rounded-lg border border-ink-700 focus:outline-none focus:ring-1 focus:ring-accent-500 resize-y"
      />

      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 transition-colors"
        >
          <Save className="h-4 w-4" /> Save
        </button>
        <button
          onClick={handleCancel}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-ink-300 hover:text-ink-50 hover:bg-ink-800 transition-colors"
        >
          Cancel
        </button>
        <span className="ml-auto flex items-center gap-1 text-xs text-ink-500">
          <FileDown className="h-3.5 w-3.5" />
          {fileSyncEnabled ? "Saves a .md file in this group's folder" : "Saving downloads a .md file"}
        </span>
      </div>
    </div>
  );
}


