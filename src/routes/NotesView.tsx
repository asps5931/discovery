import React, { useMemo, useState } from "react";
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
import { renderNoteMarkdown } from "../lib/noteMarkdown";
import {
  listUserNotes,
  addUserNote,
  deleteUserNote,
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

export function NotesView() {
  const { clientSlug, groupSlug } = useParams<{
    clientSlug: string;
    groupSlug?: string;
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
    return (
      <NoteGroupView
        clientName={client.name}
        clientSlug={client.slug}
        groupSlug={groupSlug}
        groups={groups}
      />
    );
  }

  return (
    <div className="flex items-center justify-center h-full text-ink-400">
      Select a notes group from the sidebar.
    </div>
  );
}

function NoteGroupView({
  clientName,
  clientSlug,
  groupSlug,
  groups,
}: {
  clientName: string;
  clientSlug: string;
  groupSlug: string;
  groups: ReturnType<typeof getNoteGroupsForClient>;
}) {
  const group = groups.find((g) => g.slug === groupSlug)!;
  const [showForm, setShowForm] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const fileNotes = useMemo(() => {
    const hidden = listHiddenNotes(clientSlug, groupSlug);
    return group.notes
      .filter((n) => !hidden.includes(n.slug))
      .map((n) => {
        const markdown = getNoteMarkdown(clientSlug, groupSlug, n.slug) ?? "";
        return { ...n, tags: parseTagsFromMarkdown(markdown) };
      });
  }, [clientSlug, groupSlug, group, refresh]);

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

  const handleDeleteFile = (slug: string) => {
    hideNote(clientSlug, groupSlug, slug);
    setRefresh((r) => r + 1);
  };

  const handleDeleteUser = (id: string) => {
    deleteUserNote(clientSlug, id);
    setRefresh((r) => r + 1);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Breadcrumb */}
      <div className="px-10 pt-6">
        <Link to="/" className="text-sm text-ink-400 hover:text-white transition-colors">
          Clients
        </Link>
        <ChevronRight className="inline h-3 w-3 text-ink-500 mx-1" />
        <Link to={`/${clientSlug}`} className="text-sm text-ink-400 hover:text-white transition-colors">
          {clientName}
        </Link>
        <ChevronRight className="inline h-3 w-3 text-ink-500 mx-1" />
        <span className="text-sm text-ink-200">{group.name}</span>
      </div>

      <div className="px-10 py-8 max-w-4xl w-full">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-white">{group.name}</h1>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 transition-colors"
          >
            <Plus className="h-4 w-4" /> New note
          </button>
        </div>
        <p className="text-ink-400 text-sm mb-6">
          {total} {total === 1 ? "note" : "notes"} in this group.
          Add notes, tag them, and save to a file on your computer.
        </p>

        {/* Group navigation chips */}
        <div className="flex flex-wrap gap-2 mb-8">
          {groups.map((g) => (
            <Link
              key={g.slug}
              to={`/${clientSlug}/notes/${g.slug}`}
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
            <p className="text-ink-300 text-lg mb-2">No notes yet</p>
            <p className="text-ink-400 text-sm">
              Create a new note to start capturing ideas.
            </p>
          </div>
        )}

        {total > 0 &&
          visibleUserNotes.length === 0 &&
          visibleFileNotes.length === 0 && (
            <div className="rounded-xl border border-dashed border-ink-600 p-12 text-center">
              <p className="text-ink-300 text-lg mb-2">No notes with this tag</p>
              <p className="text-ink-400 text-sm">
                Try a different tag or view all notes.
              </p>
            </div>
          )}

        <div className="space-y-4">
          {visibleUserNotes.map((n) => (
            <UserNoteCard
              key={n.id}
              title={n.title}
              content={n.content}
              tags={n.tags}
              date={n.createdAt}
              onDelete={() => handleDeleteUser(n.id)}
            />
          ))}
          {visibleFileNotes.map((n) => (
            <FileNoteCard
              key={n.slug}
              clientSlug={clientSlug}
              groupSlug={groupSlug}
              slug={n.slug}
              name={n.name}
              tags={n.tags}
              onDelete={() => handleDeleteFile(n.slug)}
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
  clientSlug,
  groupSlug,
  slug,
  name,
  tags,
  onDelete,
}: {
  clientSlug: string;
  groupSlug: string;
  slug: string;
  name: string;
  tags: string[];
  onDelete: () => void;
}) {
  const html = useMemo(() => {
    const markdown = getNoteMarkdown(clientSlug, groupSlug, slug);
    return markdown ? renderNoteMarkdown(markdown) : "";
  }, [clientSlug, groupSlug, slug]);

  return (
    <div className="border border-ink-700 rounded-xl bg-ink-900 overflow-hidden">
      <div className="border-b border-ink-700 px-6 py-3 flex items-center justify-between bg-ink-800/50">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-ink-400" />
          <h2 className="text-lg font-semibold text-white">{name}</h2>
        </div>
        <button
          onClick={onDelete}
          className="flex items-center gap-1 text-xs text-ink-400 hover:text-red-400 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" /> Remove
        </button>
      </div>
      <div className="px-6 py-3 border-b border-ink-700">
        <TagChips tags={tags} />
      </div>
      <div
        className="prose-doc px-6 py-6"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

function UserNoteCard({
  title,
  content,
  tags,
  date,
  onDelete,
}: {
  title: string;
  content: string;
  tags: string[];
  date: string;
  onDelete: () => void;
}) {
  const html = useMemo(() => renderNoteMarkdown(content), [content]);
  const formattedDate = new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="border border-ink-700 rounded-xl bg-ink-900 overflow-hidden">
      <div className="border-b border-ink-700 px-6 py-3 flex items-center justify-between bg-ink-800/50">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-ink-400" />
          <h2 className="text-lg font-semibold text-white">{title}</h2>
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
      <div
        className="prose-doc px-6 py-6"
        dangerouslySetInnerHTML={{ __html: html }}
      />
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
  onClose,
  onSaved,
}: {
  clientSlug: string;
  groupSlug: string;
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
      setError("Please give the note a title.");
      return;
    }
    if (!content.trim()) {
      setError("Please add some notes before saving.");
      return;
    }

    const tags = parseTagsInput(tagsInput);
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
        <h2 className="text-lg font-semibold text-white">New note</h2>
        <button
          onClick={handleCancel}
          className="text-ink-400 hover:text-white transition-colors"
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
        Separate tags with commas. Use them to find related notes later.
      </p>

      <label className="block text-sm text-ink-300 mb-1.5">Notes</label>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your notes in markdown..."
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
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-ink-300 hover:text-white hover:bg-ink-800 transition-colors"
        >
          Cancel
        </button>
        <span className="ml-auto flex items-center gap-1 text-xs text-ink-500">
          <FileDown className="h-3.5 w-3.5" /> Saving downloads a .md file
        </span>
      </div>
    </div>
  );
}


