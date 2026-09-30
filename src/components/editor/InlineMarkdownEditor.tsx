import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import Image from "@tiptap/extension-image";
import type { EditorView } from "@tiptap/pm/view";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  Quote,
  Code,
  Link2,
  Check,
  Table as TableIcon,
  TableColumnsSplit,
  TableRowsSplit,
  Trash2,
} from "lucide-react";
import { markdownToHtml, htmlToMarkdown } from "../../lib/markdownCodec";
import { imageFileToDataUrl, imageFilesFrom } from "../../lib/imageData";
import { stripFrontmatter } from "../../lib/frontmatter";

const TOOLBAR_FALLBACK_H = 42;

function insertImageFiles(view: EditorView, files: File[], pos?: number) {
  const imageType = view.state.schema.nodes.image;
  if (!imageType) return;
  files.forEach(async (file) => {
    try {
      const src = await imageFileToDataUrl(file);
      const node = imageType.create({ src, alt: file.name.replace(/\.[^.]+$/, "") });
      const at = pos ?? view.state.selection.from;
      view.dispatch(view.state.tr.insert(Math.min(at, view.state.doc.content.size), node));
    } catch {
      // Unreadable image; skip it.
    }
  });
}

type Props = {
  value: string;
  onSave: (markdown: string) => void;
  className?: string;
  /** Optional hint shown on hover in view mode */
  hint?: string;
};

function getScrollParent(el: HTMLElement | null): HTMLElement {
  let node: HTMLElement | null = el?.parentElement ?? null;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") {
      return node;
    }
    node = node.parentElement;
  }
  return (document.scrollingElement as HTMLElement) || document.documentElement;
}

export function InlineMarkdownEditor({
  value,
  onSave,
  className = "",
  hint = "Double-click to edit",
}: Props) {
  const [editing, setEditing] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        // Would re-add an empty paragraph at the end, which now persists as a blank line.
        trailingNode: false,
      }),
      Underline,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Start writing…" }),
      Table.configure({
        resizable: false,
        HTMLAttributes: { class: "editor-table" },
      }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({ inline: false, allowBase64: true }),
    ],
    editable: false,
    content: markdownToHtml(value),
    editorProps: {
      attributes: {
        class:
          "prose-doc max-w-none outline-none min-h-[4rem] focus:outline-none",
      },
      handlePaste(view, event) {
        const files = imageFilesFrom(event.clipboardData);
        if (files.length === 0) return false;
        event.preventDefault();
        insertImageFiles(view, files);
        return true;
      },
      handleDrop(view, event) {
        const files = imageFilesFrom(event.dataTransfer);
        if (files.length === 0) return false;
        event.preventDefault();
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        insertImageFiles(view, files, pos);
        return true;
      },
    },
  });

  // Keep preview in sync when not editing and parent value changes
  useEffect(() => {
    if (!editor || editing) return;
    const next = markdownToHtml(value);
    if (editor.getHTML() !== next) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [value, editor, editing]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editing);
    if (editing) {
      editor.commands.focus("end");
    }
  }, [editing, editor]);

  const finishEdit = useCallback(() => {
    if (!editor || !editing) return;
    const next = htmlToMarkdown(editor.getHTML());
    const prev = stripFrontmatter(valueRef.current).replace(/\s+$/, "");
    const normalizedNext = next.replace(/\s+$/, "");
    setEditing(false);
    if (normalizedNext !== prev) {
      onSave(normalizedNext + "\n");
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2000);
    }
  }, [editor, editing, onSave]);

  // Click outside to save
  useEffect(() => {
    if (!editing) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = wrapRef.current;
      if (el && !el.contains(e.target as Node)) {
        finishEdit();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Revert and exit
        if (editor) {
          editor.commands.setContent(markdownToHtml(valueRef.current), {
            emitUpdate: false,
          });
        }
        setEditing(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [editing, finishEdit, editor]);

  if (!editor) return null;

  return (
    <div
      ref={wrapRef}
      className={`relative rounded-lg transition-shadow p-3 ${
        editing
          ? "ring-2 ring-accent-500/50 bg-ink-950/40 shadow-sm"
          : "hover:ring-1 hover:ring-ink-600 cursor-text"
      } ${className}`}
      onDoubleClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!editing) setEditing(true);
      }}
      title={editing ? undefined : hint}
    >
      {editing && <EditorToolbar editor={editor} anchorRef={wrapRef} />}
      <div className={editing ? "pt-1" : ""}>
        <EditorContent editor={editor} />
      </div>

      {!editing && (
        <div className="pointer-events-none absolute inset-0 rounded-lg opacity-0 hover:opacity-100 transition-opacity">
          <span className="absolute top-2 right-2 text-[11px] font-medium text-ink-400 bg-ink-900/90 border border-ink-700 px-2 py-0.5 rounded">
            {hint}
          </span>
        </div>
      )}

      {savedFlash && (
        <div
          role="status"
          className="absolute -top-3 right-3 flex items-center gap-1.5 rounded-full bg-accent-500 text-white text-xs font-medium px-2.5 py-1 shadow-lg animate-pulse"
        >
          <Check className="h-3.5 w-3.5" />
          Saved
        </div>
      )}
    </div>
  );
}

function EditorToolbar({
  editor,
  anchorRef,
}: {
  editor: Editor;
  anchorRef: React.RefObject<HTMLDivElement | null>;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [, rerender] = useState(0);

  const syncPin = useCallback(() => {
    const sentinel = sentinelRef.current;
    const root = anchorRef.current;
    if (!sentinel || !root) return;

    const scrollParent = getScrollParent(root);
    const parentRect =
      scrollParent === document.documentElement ||
      scrollParent === document.body
        ? { top: 0, bottom: window.innerHeight }
        : scrollParent.getBoundingClientRect();

    const sentinelRect = sentinel.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    const barH = barRef.current?.offsetHeight ?? TOOLBAR_FALLBACK_H;

    // Stick only after the in-flow toolbar header has scrolled out of view,
    // and while the editor itself is still on screen.
    const headerOutOfView = sentinelRect.top < parentRect.top;
    const editorStillVisible = rootRect.bottom > parentRect.top + barH;

    if (headerOutOfView && editorStillVisible) {
      setPinned({
        top: parentRect.top,
        left: rootRect.left,
        width: rootRect.width,
      });
    } else {
      setPinned(null);
    }
  }, [anchorRef]);

  useLayoutEffect(() => {
    syncPin();
    const root = anchorRef.current;
    const scrollParent = root ? getScrollParent(root) : null;
    scrollParent?.addEventListener("scroll", syncPin, { passive: true });
    window.addEventListener("resize", syncPin);
    const onTxn = () => rerender((n) => n + 1);
    editor.on("transaction", onTxn);
    return () => {
      scrollParent?.removeEventListener("scroll", syncPin);
      window.removeEventListener("resize", syncPin);
      editor.off("transaction", onTxn);
    };
  }, [anchorRef, editor, syncPin]);

  const btn = (active: boolean) =>
    `p-1.5 rounded transition-colors ${
      active
        ? "bg-accent-500/20 text-accent-700 dark:text-accent-300"
        : "text-ink-400 hover:bg-ink-800 hover:text-ink-50"
    }`;

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const barClass =
    "flex flex-wrap items-center gap-0.5 border-b border-ink-700 bg-ink-900/95 backdrop-blur px-2 py-1.5 rounded-t-lg";

  return (
    <>
      {/* In-flow header + sentinel: used to detect when the top bar leaves view */}
      <div ref={sentinelRef} className={pinned ? "invisible" : undefined} aria-hidden={!!pinned}>
        <div
          ref={pinned ? undefined : barRef}
          className={`${barClass} ${pinned ? "pointer-events-none" : ""}`}
          onMouseDown={(e) => e.preventDefault()}
        >
          <ToolbarButtons editor={editor} btn={btn} setLink={setLink} />
        </div>
      </div>

      {pinned && (
        <div
          ref={barRef}
          className={`${barClass} fixed z-50 rounded-lg border border-ink-700 shadow-lg`}
          style={{
            top: pinned.top,
            left: pinned.left,
            width: pinned.width,
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <ToolbarButtons editor={editor} btn={btn} setLink={setLink} />
        </div>
      )}
    </>
  );
}

function ToolbarButtons({
  editor,
  btn,
  setLink,
}: {
  editor: Editor;
  btn: (active: boolean) => string;
  setLink: () => void;
}) {
  const inTable = editor.isActive("table");

  return (
    <>
      <button type="button" className={btn(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()} aria-label="Bold">
        <Bold className="h-4 w-4" />
      </button>
      <button type="button" className={btn(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()} aria-label="Italic">
        <Italic className="h-4 w-4" />
      </button>
      <button type="button" className={btn(editor.isActive("underline"))} onClick={() => editor.chain().focus().toggleUnderline().run()} aria-label="Underline">
        <UnderlineIcon className="h-4 w-4" />
      </button>
      <span className="w-px h-4 bg-ink-700 mx-1" />
      <button type="button" className={btn(editor.isActive("heading", { level: 1 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} aria-label="Heading 1">
        <Heading1 className="h-4 w-4" />
      </button>
      <button type="button" className={btn(editor.isActive("heading", { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} aria-label="Heading 2">
        <Heading2 className="h-4 w-4" />
      </button>
      <button type="button" className={btn(editor.isActive("heading", { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} aria-label="Heading 3">
        <Heading3 className="h-4 w-4" />
      </button>
      <button type="button" className={btn(editor.isActive("heading", { level: 4 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()} aria-label="Heading 4">
        <Heading4 className="h-4 w-4" />
      </button>
      <span className="w-px h-4 bg-ink-700 mx-1" />
      <button type="button" className={btn(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()} aria-label="Bullet list">
        <List className="h-4 w-4" />
      </button>
      <button type="button" className={btn(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()} aria-label="Ordered list">
        <ListOrdered className="h-4 w-4" />
      </button>
      <button type="button" className={btn(editor.isActive("blockquote"))} onClick={() => editor.chain().focus().toggleBlockquote().run()} aria-label="Quote">
        <Quote className="h-4 w-4" />
      </button>
      <button type="button" className={btn(editor.isActive("code"))} onClick={() => editor.chain().focus().toggleCode().run()} aria-label="Inline code">
        <Code className="h-4 w-4" />
      </button>
      <button type="button" className={btn(editor.isActive("link"))} onClick={setLink} aria-label="Link">
        <Link2 className="h-4 w-4" />
      </button>
      <span className="w-px h-4 bg-ink-700 mx-1" />
      <button
        type="button"
        className={btn(inTable)}
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
        aria-label="Insert table"
        title="Insert table"
      >
        <TableIcon className="h-4 w-4" />
      </button>
      {inTable && (
        <>
          <button
            type="button"
            className={btn(false)}
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            aria-label="Add column"
            title="Add column"
          >
            <TableColumnsSplit className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={btn(false)}
            onClick={() => editor.chain().focus().addRowAfter().run()}
            aria-label="Add row"
            title="Add row"
          >
            <TableRowsSplit className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={btn(false)}
            onClick={() => editor.chain().focus().deleteColumn().run()}
            aria-label="Delete column"
            title="Delete column"
          >
            <span className="text-[11px] font-semibold tabular-nums leading-none px-0.5">
              −col
            </span>
          </button>
          <button
            type="button"
            className={btn(false)}
            onClick={() => editor.chain().focus().deleteRow().run()}
            aria-label="Delete row"
            title="Delete row"
          >
            <span className="text-[11px] font-semibold tabular-nums leading-none px-0.5">
              −row
            </span>
          </button>
          <button
            type="button"
            className={btn(false)}
            onClick={() => editor.chain().focus().deleteTable().run()}
            aria-label="Delete table"
            title="Delete table"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </>
      )}
      <span className="ml-auto text-[11px] text-ink-500 px-2">
        Click outside to save · Esc to cancel
      </span>
    </>
  );
}
