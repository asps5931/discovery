import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  FilePlus,
  FileText,
  Folder,
  FolderPlus,
} from "lucide-react";
import { CONTENT_CHANGED_EVENT } from "../../lib/contentSync";
import {
  createDocumentFile,
  createDocumentFolder,
  dropDocumentItem,
  getDocumentTree,
  type DocTreeNode,
} from "../../lib/documentTree";
import { getRequirementTitle } from "./EditableTitle";

const FOLDER_OPEN_KEY = "discovery-document-folders";
const DRAG_MIME = "application/x-discovery-doc";

type DragPayload = { kind: "file" | "folder"; path: string };

function loadFolderOpen(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(FOLDER_OPEN_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveFolderOpen(state: Record<string, boolean>) {
  try {
    localStorage.setItem(FOLDER_OPEN_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function DocumentTree({
  clientSlug,
  activeSlug,
  compact = false,
  heading = "Files",
  className = "",
}: {
  clientSlug: string;
  activeSlug?: string;
  compact?: boolean;
  /** Pass null to hide the section title (toolbar buttons stay). */
  heading?: string | null;
  className?: string;
}) {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const [folderOpen, setFolderOpen] = useState(loadFolderOpen);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [creating, setCreating] = useState<null | "file" | "folder">(null);
  const [createName, setCreateName] = useState("");
  const [createError, setCreateError] = useState("");
  const createInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener(CONTENT_CHANGED_EVENT, bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener(CONTENT_CHANGED_EVENT, bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  useEffect(() => {
    if (creating) {
      setCreateName("");
      setCreateError("");
      createInputRef.current?.focus();
    }
  }, [creating]);

  void tick;
  const tree = getDocumentTree(clientSlug);
  const base = `/${clientSlug}/references/documents`;

  const toggleFolder = (path: string) => {
    setFolderOpen((prev) => {
      const next = { ...prev, [path]: !(prev[path] ?? true) };
      saveFolderOpen(next);
      return next;
    });
  };

  const cancelCreate = () => {
    setCreating(null);
    setCreateName("");
    setCreateError("");
  };

  const submitCreate = async () => {
    const name = createName.trim();
    if (!name) {
      setCreateError(creating === "folder" ? "Enter a folder name." : "Enter a document title.");
      return;
    }
    if (creating === "folder") {
      const path = await createDocumentFolder(clientSlug, selectedFolder, name);
      if (!path) {
        setCreateError("Couldn't create the folder.");
        return;
      }
      setFolderOpen((prev) => {
        const next = { ...prev, [path]: true };
        saveFolderOpen(next);
        return next;
      });
      setTick((t) => t + 1);
      cancelCreate();
      return;
    }
    if (creating === "file") {
      const slug = await createDocumentFile(clientSlug, selectedFolder, name);
      if (!slug) {
        setCreateError("Couldn't create the document.");
        return;
      }
      setTick((t) => t + 1);
      cancelCreate();
      navigate(`${base}/${slug}`);
    }
  };

  const handleDrop = useCallback(
    async (targetFolder: string, data: DragPayload) => {
      setDropTarget(null);
      const next = await dropDocumentItem(clientSlug, data, targetFolder);
      if (!next) return;
      setTick((t) => t + 1);
      if (data.kind === "file" && activeSlug === data.path) {
        navigate(`${base}/${next}`);
      }
    },
    [activeSlug, base, clientSlug, navigate]
  );

  const rootDrop =
    dropTarget === ""
      ? "bg-accent-500/10 ring-1 ring-inset ring-accent-500/40"
      : "";

  return (
    <div
      className={`${compact ? "" : "rounded-xl border border-ink-700 bg-ink-900 p-3"} ${className}`}
    >
      {!compact && (
        <div className="mb-2 flex items-center gap-1">
          {heading ? (
            <p className="min-w-0 flex-1 text-[11px] uppercase tracking-wider text-ink-500 font-semibold">
              {heading}
            </p>
          ) : (
            <span className="min-w-0 flex-1" />
          )}
          <button
            type="button"
            onClick={() => setCreating("file")}
            title="New document"
            aria-label="New document"
            className="rounded p-1 text-ink-400 hover:bg-ink-800 hover:text-ink-50"
          >
            <FilePlus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setCreating("folder")}
            title="New folder"
            aria-label="New folder"
            className="rounded p-1 text-ink-400 hover:bg-ink-800 hover:text-ink-50"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {!compact && creating && (
        <form
          className="mb-2 flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void submitCreate();
          }}
        >
          <input
            ref={createInputRef}
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder={creating === "folder" ? "Folder name" : "Document title"}
            className="min-w-0 flex-1 px-2.5 py-1.5 bg-ink-950 text-ink-100 text-sm rounded-md border border-ink-700 focus:outline-none focus:ring-1 focus:ring-accent-500"
          />
          <button
            type="submit"
            className="px-2.5 py-1.5 rounded-md bg-accent-500 text-white text-sm hover:bg-accent-600"
          >
            Create
          </button>
          <button
            type="button"
            onClick={cancelCreate}
            className="px-2.5 py-1.5 rounded-md text-sm text-ink-300 hover:bg-ink-800 hover:text-ink-50"
          >
            Cancel
          </button>
          {createError && (
            <p className="w-full text-xs text-red-400">{createError}</p>
          )}
        </form>
      )}

      <div
        className={`min-h-[2rem] rounded-md ${
          compact ? "" : "bg-ink-800 p-1.5"
        } ${rootDrop}`}
        onDragOver={(e) => {
          if (![...e.dataTransfer.types].includes(DRAG_MIME)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setDropTarget("");
        }}
        onDragLeave={() => setDropTarget((t) => (t === "" ? null : t))}
        onDrop={(e) => {
          const raw = e.dataTransfer.getData(DRAG_MIME);
          if (!raw) return;
          e.preventDefault();
          try {
            void handleDrop("", JSON.parse(raw) as DragPayload);
          } catch {
            /* ignore */
          }
        }}
        onClick={() => setSelectedFolder("")}
      >
        {tree.length === 0 ? (
          <p className={`px-1.5 py-2 text-ink-500 ${compact ? "text-xs" : "text-sm"}`}>
            No files yet. Use + to add a document or folder.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {tree.map((node) => (
              <TreeNodeView
                key={`${node.kind}:${node.path}`}
                node={node}
                clientSlug={clientSlug}
                base={base}
                activeSlug={activeSlug}
                compact={compact}
                depth={0}
                folderOpen={folderOpen}
                dropTarget={dropTarget}
                selectedFolder={selectedFolder}
                onToggleFolder={toggleFolder}
                onSelectFolder={setSelectedFolder}
                onDropTarget={setDropTarget}
                onDrop={handleDrop}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TreeNodeView({
  node,
  clientSlug,
  base,
  activeSlug,
  compact,
  depth,
  folderOpen,
  dropTarget,
  selectedFolder,
  onToggleFolder,
  onSelectFolder,
  onDropTarget,
  onDrop,
}: {
  node: DocTreeNode;
  clientSlug: string;
  base: string;
  activeSlug?: string;
  compact: boolean;
  depth: number;
  folderOpen: Record<string, boolean>;
  dropTarget: string | null;
  selectedFolder: string;
  onToggleFolder: (path: string) => void;
  onSelectFolder: (path: string) => void;
  onDropTarget: (path: string | null) => void;
  onDrop: (targetFolder: string, data: DragPayload) => void;
}) {
  const pad = { paddingLeft: `${depth * (compact ? 10 : 14)}px` };

  if (node.kind === "folder") {
    const open = folderOpen[node.path] ?? true;
    const isDrop = dropTarget === node.path;
    const isSelected = selectedFolder === node.path;
    return (
      <li>
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData(
              DRAG_MIME,
              JSON.stringify({ kind: "folder", path: node.path } satisfies DragPayload)
            );
            e.dataTransfer.effectAllowed = "move";
          }}
          onDragOver={(e) => {
            if (![...e.dataTransfer.types].includes(DRAG_MIME)) return;
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = "move";
            onDropTarget(node.path);
          }}
          onDragLeave={(e) => {
            e.stopPropagation();
            onDropTarget(null);
          }}
          onDrop={(e) => {
            const raw = e.dataTransfer.getData(DRAG_MIME);
            if (!raw) return;
            e.preventDefault();
            e.stopPropagation();
            try {
              onDrop(node.path, JSON.parse(raw) as DragPayload);
            } catch {
              /* ignore */
            }
          }}
          className={`flex items-center gap-1 rounded-md py-1 pr-1 text-sm transition-colors ${
            isDrop
              ? "bg-accent-500/15 ring-1 ring-inset ring-accent-500/40"
              : isSelected
                ? compact
                  ? "bg-ink-800 text-ink-50"
                  : "bg-ink-950/45 text-ink-50"
                : compact
                  ? "text-ink-300 hover:bg-ink-800/60 hover:text-ink-50"
                  : "text-ink-300 hover:bg-ink-950/35 hover:text-ink-50"
          }`}
          style={pad}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFolder(node.path);
            }}
            aria-expanded={open}
            aria-label={`${open ? "Collapse" : "Expand"} ${node.name}`}
            className="rounded p-0.5 text-ink-500 hover:text-ink-200"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${open ? "" : "-rotate-90"}`}
            />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectFolder(node.path);
            }}
            className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          >
            {!compact && <Folder className="h-3.5 w-3.5 shrink-0 text-ink-500" />}
            <span className="truncate">{labelFromFolder(node.name)}</span>
          </button>
        </div>
        {open && node.children.length > 0 && (
          <ul className="space-y-0.5">
            {node.children.map((child) => (
              <TreeNodeView
                key={`${child.kind}:${child.path}`}
                node={child}
                clientSlug={clientSlug}
                base={base}
                activeSlug={activeSlug}
                compact={compact}
                depth={depth + 1}
                folderOpen={folderOpen}
                dropTarget={dropTarget}
                selectedFolder={selectedFolder}
                onToggleFolder={onToggleFolder}
                onSelectFolder={onSelectFolder}
                onDropTarget={onDropTarget}
                onDrop={onDrop}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  const active = activeSlug === node.path;
  const label = getRequirementTitle(
    {
      clientSlug,
      group: "documents",
      slug: node.path,
      name: node.label,
    },
    "note"
  );

  return (
    <li>
      <Link
        to={`${base}/${node.path}`}
        draggable
        onClick={(e) => e.stopPropagation()}
        onDragStart={(e) => {
          e.dataTransfer.setData(
            DRAG_MIME,
            JSON.stringify({ kind: "file", path: node.path } satisfies DragPayload)
          );
          e.dataTransfer.effectAllowed = "move";
        }}
        className={`flex items-center gap-1.5 rounded-md py-1 pr-1.5 text-sm transition-colors ${
          active
            ? "bg-accent-500/10 text-accent-800 dark:text-accent-300 font-medium"
            : compact
              ? "text-ink-300 hover:bg-ink-800/50 hover:text-ink-50"
              : "text-ink-300 hover:bg-ink-950/35 hover:text-ink-50"
        }`}
        style={pad}
        aria-current={active ? "page" : undefined}
      >
        {!compact && <FileText className="h-3.5 w-3.5 shrink-0 text-ink-500" />}
        <span className={`truncate ${compact ? "ml-5" : ""}`}>{label}</span>
      </Link>
    </li>
  );
}

function labelFromFolder(name: string): string {
  return name
    .split("-")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}
