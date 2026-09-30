import fs from "node:fs/promises";
import path from "node:path";
import type { IncomingMessage } from "node:http";
import type { Plugin } from "vite";

const ENDPOINT = "/__content";
// Writes made through the endpoint skip HMR so the page doesn't reload mid-edit.
const HMR_SUPPRESS_MS = 3000;

type ContentRequest = { action?: "write" | "delete"; path?: string; content?: string };

function readJson(req: IncomingMessage): Promise<ContentRequest> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

/** Dev-only endpoint that persists in-app edits to markdown under src/content/clients. */
export function contentFilesPlugin(): Plugin {
  let clientsRoot = "";
  const recentWrites = new Map<string, number>();

  return {
    name: "content-files",
    apply: "serve",
    configResolved(config) {
      clientsRoot = path.resolve(config.root, "src/content/clients");
    },
    configureServer(server) {
      server.middlewares.use(ENDPOINT, async (req, res) => {
        const reply = (status: number, payload: object) => {
          res.statusCode = status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(payload));
        };

        if (req.method !== "POST") return reply(405, { error: "POST only" });

        try {
          const { action = "write", path: rel, content } = await readJson(req);
          if (!rel) return reply(400, { error: "Missing path" });

          const abs = path.resolve(clientsRoot, path.relative("clients", rel));
          if (!abs.startsWith(clientsRoot + path.sep) || !abs.endsWith(".md")) {
            return reply(400, { error: "Path must be a .md file under src/content/clients" });
          }

          recentWrites.set(abs, Date.now());
          if (action === "delete") {
            await fs.rm(abs, { force: true });
          } else {
            if (typeof content !== "string") return reply(400, { error: "Missing content" });
            await fs.mkdir(path.dirname(abs), { recursive: true });
            await fs.writeFile(abs, content, "utf8");
          }
          reply(200, { ok: true });
        } catch (err) {
          reply(500, { error: String(err) });
        }
      });
    },
    handleHotUpdate({ file }) {
      const writtenAt = recentWrites.get(path.resolve(file));
      if (writtenAt && Date.now() - writtenAt < HMR_SUPPRESS_MS) return [];
    },
  };
}
