import { Marp } from "@marp-team/marp-core";

// Custom theme layered on top of Marp's built-in "gaia" theme.
// "gaia" gives us directive support (background images, colors, split slides),
// and we override the colors/typography to match the app's dark aesthetic.
const clientPortalTheme = `
/* @theme client-portal */
@import 'gaia';

:root {
  --color-background: #0a0a0b;
  --color-foreground: #e4e7ec;
  --color-highlight: #1ba87c;
  --color-dimmed: #9ea3ad;
  --color-accent: #40c896;
}

section {
  background-color: var(--color-background);
  color: var(--color-foreground);
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 30px;
  padding: 60px 80px;
  justify-content: center;
}

section::after {
  font-size: 14px;
  color: #4a4d54;
  bottom: 18px;
  right: 30px;
}

section h1 {
  font-size: 64px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 20px;
}

section h2 {
  font-size: 46px;
  font-weight: 650;
  color: #ffffff;
  margin-bottom: 28px;
}

section h3 {
  font-size: 34px;
  font-weight: 600;
  color: #c8ccd4;
  margin-bottom: 16px;
}

section p {
  font-size: 28px;
  line-height: 1.5;
  color: #9ea3ad;
  margin-bottom: 16px;
}

section ul, section ol {
  font-size: 27px;
  line-height: 1.55;
  color: #c8ccd4;
  margin-bottom: 16px;
}

section li {
  margin-bottom: 12px;
}

section li::marker {
  color: var(--color-highlight);
}

section strong {
  color: #ffffff;
  font-weight: 600;
}

section a {
  color: var(--color-accent);
  text-decoration: underline;
}

section code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.78em;
  color: #7ce0b9;
  background-color: #26282d;
  padding: 2px 8px;
  border-radius: 6px;
}

section pre {
  font-family: 'JetBrains Mono', monospace;
  font-size: 21px;
  background-color: #0a0a0b;
  border: 1px solid #36393f;
  border-radius: 12px;
  padding: 20px 24px;
}

section pre code {
  background: none;
  color: #e4e7ec;
  padding: 0;
}

section blockquote {
  border-left: 4px solid var(--color-highlight);
  padding-left: 24px;
  color: #c8ccd4;
  font-style: italic;
  font-size: 30px;
  margin: 24px 0;
}

section table {
  font-size: 22px;
  border-collapse: collapse;
  width: 100%;
}

section th {
  color: #ffffff;
  border-bottom: 2px solid #36393f;
  padding: 12px 16px;
  text-align: left;
}

section td {
  border-bottom: 1px solid #26282d;
  padding: 12px 16px;
  color: #c8ccd4;
}

section img {
  max-width: 100%;
  max-height: 500px;
  border-radius: 10px;
  object-fit: contain;
}

section hr {
  border: none;
  height: 1px;
  background: #36393f;
  margin: 24px 0;
}

/* Lead slides (title + subtitle) */
section.lead {
  text-align: center;
  justify-content: center;
}

section.lead h1 {
  font-size: 72px;
  margin-bottom: 16px;
}

section.lead p {
  font-size: 30px;
  color: #9ea3ad;
}

/* Accent bar used on section dividers */
section.divider {
  text-align: center;
  justify-content: center;
}

section.divider h2 {
  font-size: 56px;
}
`;

export function renderDeck(markdown: string): { htmls: string[]; css: string } {
  const marp = new Marp({ html: true } as any);
  marp.themeSet.add(clientPortalTheme);
  marp.themeSet.default = marp.themeSet.get("client-portal") || undefined;

  const { html, css } = marp.render(markdown);

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  // Each slide is wrapped in an <svg data-marpit-svg> element. A single slide
  // can contain multiple <section> elements (background, content, pseudo), so
  // we extract whole SVGs rather than individual sections.
  const svgs = Array.from(doc.querySelectorAll("svg[data-marpit-svg]"));
  const htmls = svgs.map((s) => s.outerHTML);

  // Marp sizes slides with 100vw/100vh and expects a div.marpit wrapper. We
  // wrap each slide in that container and override the sizing so slides fill
  // their parent (the app's slide stage / thumbnails) instead of the viewport.
  const containerCss = `
div.marpit {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
div.marpit > svg[data-marpit-svg] {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
}
`;

  return { htmls, css: css + containerCss };
}
