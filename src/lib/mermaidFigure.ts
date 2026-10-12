import { Node, mergeAttributes } from "@tiptap/core";

/**
 * ADA-oriented Mermaid config: black text on light panels.
 * htmlLabels:false avoids foreignObject inheriting .prose-doc light text colors.
 */
const ACCESSIBLE_THEME = {
  startOnLoad: false,
  securityLevel: "strict" as const,
  theme: "base" as const,
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
  themeVariables: {
    darkMode: false,
    background: "#ffffff",
    primaryColor: "#c5d4e8",
    primaryTextColor: "#000000",
    primaryBorderColor: "#000000",
    secondaryColor: "#e5e7eb",
    secondaryTextColor: "#000000",
    secondaryBorderColor: "#000000",
    tertiaryColor: "#ffffff",
    tertiaryTextColor: "#000000",
    tertiaryBorderColor: "#000000",
    lineColor: "#000000",
    textColor: "#000000",
    mainBkg: "#c5d4e8",
    nodeBorder: "#000000",
    clusterBkg: "#e5e7eb",
    clusterBorder: "#000000",
    titleColor: "#000000",
    edgeLabelBackground: "#ffffff",
    actorBorder: "#000000",
    actorBkg: "#c5d4e8",
    actorTextColor: "#000000",
    actorLineColor: "#000000",
    signalColor: "#000000",
    signalTextColor: "#000000",
    labelBoxBkgColor: "#ffffff",
    labelBoxBorderColor: "#000000",
    labelTextColor: "#000000",
    loopTextColor: "#000000",
    noteBorderColor: "#000000",
    noteBkgColor: "#fff3b0",
    noteTextColor: "#000000",
    activationBorderColor: "#000000",
    activationBkgColor: "#d1d5db",
    sequenceNumberColor: "#ffffff",
    sectionBkgColor: "#c5d4e8",
    altSectionBkgColor: "#e5e7eb",
    sectionBkgColor2: "#d1d5db",
    excludeBkgColor: "#eeeeee",
    fontSize: "16px",
  },
  flowchart: {
    // Critical: HTML labels inherit light prose text in dark mode → fail contrast.
    htmlLabels: false,
    curve: "basis" as const,
    padding: 14,
    nodeSpacing: 48,
    rankSpacing: 48,
    useMaxWidth: true,
  },
  sequence: {
    useMaxWidth: true,
    actorMargin: 48,
    messageMargin: 36,
    boxMargin: 12,
  },
};

const TEXT_FILL = "#000000";
const LINE_STROKE = "#000000";

let mermaidInit: Promise<typeof import("mermaid").default> | null = null;

function loadMermaid() {
  if (!mermaidInit) {
    mermaidInit = import("mermaid").then(({ default: mermaid }) => {
      mermaid.initialize(ACCESSIBLE_THEME);
      return mermaid;
    });
  }
  return mermaidInit;
}

/** Force SVG paints after render — Mermaid theme alone is not enough for ADA. */
export function forceAccessibleSvgContrast(root: ParentNode) {
  const svg = root.querySelector("svg");
  if (!svg) return;

  svg.style.backgroundColor = "#ffffff";
  svg.setAttribute("color", TEXT_FILL);

  svg.querySelectorAll("text").forEach((el) => {
    el.setAttribute("fill", TEXT_FILL);
    el.style.fill = TEXT_FILL;
    el.style.color = TEXT_FILL;
  });

  svg.querySelectorAll("tspan").forEach((el) => {
    el.setAttribute("fill", TEXT_FILL);
    el.style.fill = TEXT_FILL;
  });

  // Edge / cluster labels sometimes use <g> with style attributes.
  svg.querySelectorAll(".edgeLabel, .cluster-label, .nodeLabel, .label").forEach((el) => {
    (el as HTMLElement).style.color = TEXT_FILL;
    if (el instanceof SVGElement) {
      el.style.fill = TEXT_FILL;
    }
  });

  svg.querySelectorAll("path.flowchart-link, .edge-thickness-normal, .arrowheadPath").forEach((el) => {
    const stroke = el.getAttribute("stroke");
    if (stroke && stroke !== "none") {
      el.setAttribute("stroke", LINE_STROKE);
    }
  });

  // foreignObject fallback if a diagram type still emits HTML labels
  svg.querySelectorAll("foreignObject, foreignObject *").forEach((el) => {
    (el as HTMLElement).style.color = TEXT_FILL;
    (el as HTMLElement).style.setProperty("color", TEXT_FILL, "important");
  });
}

/** Short label for screen readers from the diagram source. */
export function mermaidAriaLabel(source: string): string {
  const lines = source.split(/\r?\n/).map((l) => l.trim());
  const metaTitle = lines
    .find((l) => /^%%\s*title:\s*.+/i.test(l))
    ?.replace(/^%%\s*title:\s*/i, "")
    .trim();
  if (metaTitle) return `Diagram: ${metaTitle}`;

  const codeLines = lines.filter((l) => l && !l.startsWith("%%"));
  const titled = codeLines.find((l) => /^title\s+/i.test(l));
  if (titled) {
    return `Diagram: ${titled.replace(/^title\s+/i, "").trim()}`;
  }
  const kind = codeLines[0]?.split(/\s+/)[0] ?? "chart";
  return `Diagram (${kind})`;
}

export function encodeMermaidSource(source: string): string {
  const bytes = new TextEncoder().encode(source);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function decodeMermaidSource(encoded: string): string {
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Turn ```mermaid fences into <figure data-mermaid="…"> before markdown-it. */
export function mermaidFencesToFigures(markdown: string): string {
  return markdown.replace(/```mermaid\r?\n([\s\S]*?)```/g, (_m, body: string) => {
    const source = body.replace(/\s+$/, "");
    const encoded = encodeMermaidSource(source);
    // Non-empty body so turndown keeps the figure for markdown round-trip.
    return `\n\n<figure class="mermaid-diagram" data-mermaid="${encoded}">&#8203;</figure>\n\n`;
  });
}

function mountAccessibleDiagram(dom: HTMLElement, source: string) {
  const label = mermaidAriaLabel(source);
  const descId = `mermaid-desc-${Math.random().toString(36).slice(2, 10)}`;

  dom.setAttribute("role", "img");
  dom.setAttribute("aria-label", label);
  dom.setAttribute("aria-describedby", descId);

  const caption = document.createElement("figcaption");
  caption.id = descId;
  caption.className = "sr-only";
  caption.textContent = `Diagram source:\n${source}`;

  void loadMermaid().then(async (mermaid) => {
    const id = `mmd-${Math.random().toString(36).slice(2, 10)}`;
    try {
      const { svg } = await mermaid.render(id, source);
      const wrap = document.createElement("div");
      wrap.className = "mermaid-diagram-svg";
      wrap.setAttribute("aria-hidden", "true");
      wrap.innerHTML = svg;
      forceAccessibleSvgContrast(wrap);
      wrap.querySelector("svg")?.setAttribute("aria-hidden", "true");
      wrap.querySelector("svg")?.setAttribute("focusable", "false");
      dom.replaceChildren(wrap, caption);
    } catch {
      const pre = document.createElement("pre");
      pre.className = "mermaid-diagram-fallback";
      pre.textContent = source;
      dom.replaceChildren(pre, caption);
    }
  });
}

export const MermaidFigure = Node.create({
  name: "mermaidFigure",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      source: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-mermaid") || "",
        renderHTML: (attributes) =>
          attributes.source ? { "data-mermaid": attributes.source } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "figure.mermaid-diagram[data-mermaid]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "figure",
      mergeAttributes(HTMLAttributes, {
        class: "mermaid-diagram",
        role: "img",
      }),
      "\u200b",
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("figure");
      dom.className = "mermaid-diagram";
      dom.setAttribute("data-mermaid", node.attrs.source || "");
      dom.setAttribute("contenteditable", "false");

      const source = node.attrs.source
        ? decodeMermaidSource(node.attrs.source)
        : "";

      if (!source) {
        dom.textContent = "(empty mermaid diagram)";
        return { dom };
      }

      mountAccessibleDiagram(dom, source);

      return { dom };
    };
  },
});
