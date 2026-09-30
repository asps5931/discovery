import React from "react";

export type TocItem = {
  id: string;
  label: string;
  level?: 2 | 3;
};

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function TableOfContents({
  items,
  title = "On this page",
}: {
  items: TocItem[];
  title?: string;
}) {
  if (items.length === 0) return null;

  type TocNode = { item: TocItem; children: TocItem[] };
  const tree: TocNode[] = [];
  for (const item of items) {
    if (item.level === 3 && tree.length > 0) {
      tree[tree.length - 1].children.push(item);
    } else {
      tree.push({ item, children: [] });
    }
  }

  return (
    <nav
      aria-label="Table of contents"
      className="mb-8 rounded-xl border border-ink-700 bg-ink-900 p-5"
    >
      <h2 className="text-xs uppercase tracking-wider text-ink-400 font-semibold mb-3">
        {title}
      </h2>
      <ol className="list-decimal list-outside ml-5 space-y-1.5 text-ink-400">
        {tree.map(({ item, children }) => (
          <li key={item.id} className="pl-1">
            <a
              href={`#${item.id}`}
              className="text-sm text-ink-300 hover:text-accent-700 dark:hover:text-accent-400 transition-colors"
            >
              {item.label}
            </a>
            {children.length > 0 && (
              <ol className="list-[lower-alpha] list-outside ml-5 mt-1.5 space-y-1">
                {children.map((child) => (
                  <li key={child.id} className="pl-1">
                    <a
                      href={`#${child.id}`}
                      className="text-sm text-ink-300 hover:text-accent-700 dark:hover:text-accent-400 transition-colors"
                    >
                      {child.label}
                    </a>
                  </li>
                ))}
              </ol>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Builds a TOC from h2–h5 elements inside a container after content mounts. */
export function useHeadingToc(containerRef: React.RefObject<HTMLElement | null>, deps: unknown[] = []) {
  const [items, setItems] = React.useState<TocItem[]>([]);

  React.useEffect(() => {
    const root = containerRef.current;
    if (!root) {
      setItems([]);
      return;
    }

    const collect = () => {
      const headings = root.querySelectorAll("h2, h3, h4, h5");
      const next: TocItem[] = [];
      const used = new Set<string>();

      headings.forEach((el) => {
        const label = (el.textContent ?? "").trim();
        if (!label) return;
        let id = el.id || slugifyHeading(label);
        if (!id) return;
        if (used.has(id)) {
          let i = 2;
          while (used.has(`${id}-${i}`)) i += 1;
          id = `${id}-${i}`;
        }
        used.add(id);
        if (!el.id) el.id = id;
        // Numbered parents: h2/h4 · lettered children: h3/h5
        const level: 2 | 3 =
          el.tagName === "H3" || el.tagName === "H5" ? 3 : 2;
        next.push({ id, label, level });
      });

      setItems(next);
    };

    collect();
    const observer = new MutationObserver(collect);
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, ...deps]);

  return items;
}
