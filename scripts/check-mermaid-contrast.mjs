/**
 * ponytail: smoke-check forceAccessibleSvgContrast sets text fills to #000000.
 * Run: npx tsx scripts/check-mermaid-contrast.mjs
 */
import { Window } from "happy-dom";
import { forceAccessibleSvgContrast } from "../src/lib/mermaidFigure.ts";

const window = new Window();
const doc = window.document;
doc.body.innerHTML = `
<div id="r">
  <svg>
    <text fill="#9ca3af">dim</text>
    <text style="fill: #e5e7eb">lighter</text>
    <tspan fill="#ffffff">white</tspan>
    <foreignObject><div style="color:#f3f4f6">html</div></foreignObject>
  </svg>
</div>`;
const root = doc.getElementById("r");
forceAccessibleSvgContrast(root);

const texts = [...root.querySelectorAll("text, tspan")];
const bad = texts.filter((el) => {
  const fill = (el.getAttribute("fill") || "").toLowerCase();
  return fill !== "#000000";
});
const foColor = root.querySelector("foreignObject div")?.style.color?.toLowerCase();

if (bad.length || foColor !== "rgb(0, 0, 0)" && foColor !== "#000000") {
  console.error("FAIL", {
    badFills: bad.map((el) => el.getAttribute("fill")),
    foColor,
  });
  process.exit(1);
}
console.log("ok: forced #000000 on", texts.length, "text nodes + foreignObject");
window.close();
