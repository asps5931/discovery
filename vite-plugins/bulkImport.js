import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const DATA = "data/bulk-import";
const MAX_BYTES = 100 * 1024 * 1024;
const MUTATIONS = [
    {
        id: "product-set",
        name: "productSet",
        description: "Create products, including options, variants, and stock",
        file: "luxury-bags-10000.graphql",
    },
    {
        id: "inventory",
        name: "inventorySetQuantities",
        description: "Set how many are in stock",
        file: "luxury-bags-inventory.graphql",
    },
    {
        id: "product-update",
        name: "productUpdate",
        description: "Update product details, such as the title and description",
        file: "luxury-bags-titles.graphql",
    },
    {
        id: "price",
        name: "productVariantsBulkUpdate",
        description: "Update the price",
        file: "luxury-bags-prices.graphql",
    },
];
// ponytail: one job in this Vite process. Restarting dev drops the bar; Shopify keeps going.
// Reattach with `node scripts/bulk-import.mjs status`.
let job = null;
let child = null;
function percent(current) {
    if (current.status === "COMPLETED")
        return 100;
    if (current.total <= 0)
        return 0;
    return Math.min(100, Math.round((current.processed / current.total) * 100));
}
function view() {
    return job ? { ...job, percent: percent(job) } : null;
}
function applyLine(line) {
    if (!job)
        return;
    if (line.startsWith("gid://") || line.startsWith("created "))
        job.status = "RUNNING";
    const progress = line.match(/\[.*\]\s+(\d+)\/(\d+)/);
    if (progress) {
        job.status = "RUNNING";
        job.processed = Number(progress[1]);
        job.total = Number(progress[2]);
    }
    const duration = line.match(/Total Duration:\s*(.+)/);
    if (duration)
        job.duration = duration[1].trim();
}
function readBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        req.on("data", (chunk) => {
            size += chunk.length;
            if (size > MAX_BYTES) {
                reject(new Error("File is over 100MB"));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });
        req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        req.on("error", reject);
    });
}
function safeJsonl(name) {
    const base = path.basename(name);
    if (base !== name || !/^[\w.-]+\.jsonl$/.test(base)) {
        throw new Error("File name must end in .jsonl");
    }
    return base;
}
export function bulkImportPlugin() {
    let root = "";
    return {
        name: "bulk-import",
        apply: "serve",
        configResolved(config) {
            root = config.root;
        },
        configureServer(server) {
            const dir = () => path.join(root, DATA);
            const reply = (res, status, payload) => {
                res.statusCode = status;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(payload));
            };
            server.middlewares.use("/__bulk", async (req, res) => {
                const route = (req.url || "/").split("?")[0];
                try {
                    if (req.method === "GET" && (route === "/" || route === "")) {
                        const folder = dir();
                        const bodies = new Map(MUTATIONS.map((mutation) => {
                            const file = path.join(folder, mutation.file);
                            return [mutation.id, fs.existsSync(file) ? fs.readFileSync(file, "utf8").trim() : ""];
                        }));
                        const files = fs.existsSync(folder)
                            ? fs
                                .readdirSync(folder)
                                .filter((name) => name.endsWith(".jsonl"))
                                .sort()
                                .map((name) => {
                                const sibling = path.join(folder, name.replace(/\.jsonl$/, ".graphql"));
                                const text = fs.existsSync(sibling) ? fs.readFileSync(sibling, "utf8").trim() : "";
                                const mutation = [...bodies.entries()].find(([, body]) => body && body === text)?.[0] || "";
                                return { name, mutation };
                            })
                            : [];
                        return reply(res, 200, {
                            files,
                            mutations: MUTATIONS.map(({ id, name, description }) => ({ id, name, description })),
                            job: view(),
                        });
                    }
                    if (req.method === "POST" && route === "/upload") {
                        const body = JSON.parse(await readBody(req));
                        const filename = safeJsonl(body.filename || "");
                        if (typeof body.content !== "string" || !body.content.trim()) {
                            return reply(res, 400, { error: "JSONL file is empty" });
                        }
                        fs.mkdirSync(dir(), { recursive: true });
                        fs.writeFileSync(path.join(dir(), filename), body.content);
                        return reply(res, 200, { ok: true, file: filename });
                    }
                    if (req.method === "POST" && route === "/run") {
                        if (child)
                            return reply(res, 409, { error: "A bulk import is already running" });
                        const body = JSON.parse(await readBody(req));
                        const filename = safeJsonl(body.file || "");
                        const file = path.join(dir(), filename);
                        const mutation = MUTATIONS.find((entry) => entry.id === body.mutation);
                        const mutationPath = mutation ? path.join(dir(), mutation.file) : "";
                        if (!fs.existsSync(file))
                            return reply(res, 404, { error: "File not found" });
                        if (!mutation || !fs.existsSync(mutationPath)) {
                            return reply(res, 400, { error: "Choose a mutation" });
                        }
                        const total = fs.readFileSync(file, "utf8").split("\n").filter(Boolean).length;
                        job = {
                            file: filename,
                            status: "UPLOADING",
                            processed: 0,
                            total,
                            duration: "",
                            error: "",
                            finished: false,
                        };
                        let pending = "";
                        const proc = spawn(process.execPath, ["scripts/bulk-import.mjs", file, mutationPath], {
                            cwd: root,
                            stdio: ["ignore", "pipe", "pipe"],
                        });
                        child = proc;
                        const take = (chunk) => {
                            pending += chunk.toString();
                            const lines = pending.split(/\r?\n/);
                            pending = lines.pop() || "";
                            for (const line of lines)
                                applyLine(line);
                        };
                        proc.stdout?.on("data", take);
                        proc.stderr?.on("data", (chunk) => {
                            if (job)
                                job.error = `${job.error}\n${chunk.toString()}`.trim();
                        });
                        proc.on("close", (code) => {
                            if (pending)
                                applyLine(pending);
                            if (job) {
                                job.finished = true;
                                job.status = code === 0 ? "COMPLETED" : "FAILED";
                                if (code === 0 && job.total > 0)
                                    job.processed = job.total;
                            }
                            if (child === proc)
                                child = null;
                        });
                        return reply(res, 200, { ok: true, job: view() });
                    }
                    reply(res, 404, { error: "Not found" });
                }
                catch (err) {
                    reply(res, 500, { error: err instanceof Error ? err.message : String(err) });
                }
            });
        },
    };
}
