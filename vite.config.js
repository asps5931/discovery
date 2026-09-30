import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mdx from "@mdx-js/rollup";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import fs from "node:fs";
import { contentFilesPlugin } from "./vite-plugins/contentFiles";
export default defineConfig({
    plugins: [
        contentFilesPlugin(),
        {
            // Serve .mdx?raw as plain text so MDX transform does not compile it.
            name: "mdx-as-raw-text",
            enforce: "pre",
            load(id) {
                const clean = id.split("\0").pop() || id;
                if (!clean.includes(".mdx") || !clean.includes("raw"))
                    return null;
                const filePath = clean
                    .replace(/\?.*$/, "")
                    .replace(/^\/@fs/, "");
                if (!filePath.endsWith(".mdx") || !fs.existsSync(filePath))
                    return null;
                const source = fs.readFileSync(filePath, "utf-8");
                return {
                    code: `export default ${JSON.stringify(source)};`,
                    map: null,
                };
            },
        },
        react(),
        mdx({
            remarkPlugins: [remarkFrontmatter, remarkGfm],
            include: /\.mdx$/,
            exclude: /\?/,
        }),
    ],
    optimizeDeps: {
        include: [
            "react",
            "react-dom",
            "react-router-dom",
            "markdown-it",
            "markdown-it-front-matter",
            "turndown",
            "turndown-plugin-gfm",
        ],
    },
});
