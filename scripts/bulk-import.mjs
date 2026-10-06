import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runPath = path.join(root, "data/luxury-bags-bulk.json");
const apiVersion = "2026-07";

function stagedUpload(filename) {
  return `mutation {
  stagedUploadsCreate(input: [{
    resource: BULK_MUTATION_VARIABLES
    filename: "${filename}"
    mimeType: "text/jsonl"
    httpMethod: POST
  }]) {
    userErrors { field message }
    stagedTargets { url parameters { name value } }
  }
}`;
}

function envValue(name) {
  const line = fs
    .readFileSync(path.join(root, ".env"), "utf8")
    .split("\n")
    .find((entry) => entry.startsWith(`${name}=`));
  if (!line) throw new Error(`Missing ${name} in .env`);
  return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
}

function shopDomain() {
  const shop = envValue("SHOPIFY_SHOP").replace(/^https?:\/\//, "").replace(/\/$/, "");
  return shop.includes(".") ? shop : `${shop}.myshopify.com`;
}

async function token() {
  const response = await fetch(`https://${shopDomain()}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: envValue("SHOPIFY_CLIENT_ID"),
      client_secret: envValue("SHOPIFY_CLIENT_SECRET"),
    }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error_description || body.error || `Token request failed (${response.status})`);
  return body.access_token;
}

async function graphql(accessToken, query, variables) {
  const response = await fetch(`https://${shopDomain()}/admin/api/${apiVersion}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await response.json();
  if (body.errors?.length) throw new Error(body.errors.map((error) => error.message).join("\n"));
  return body.data;
}

function failOn(errors, label) {
  if (errors?.length) {
    throw new Error(errors.map((error) => `${label}: ${error.message}`).join("\n"));
  }
}

async function start(accessToken, jsonlPath) {
  const mutationPath = jsonlPath.replace(/\.jsonl$/, ".graphql");
  if (!fs.existsSync(mutationPath)) throw new Error(`Missing mutation file ${mutationPath}`);
  const filename = path.basename(jsonlPath);
  const staged = await graphql(accessToken, stagedUpload(filename));
  failOn(staged.stagedUploadsCreate.userErrors, "Upload");
  const target = staged.stagedUploadsCreate.stagedTargets[0];
  const form = new FormData();
  for (const parameter of target.parameters) form.append(parameter.name, parameter.value);
  form.append("file", new Blob([fs.readFileSync(jsonlPath)], { type: "text/jsonl" }), filename);
  const upload = await fetch(target.url, { method: "POST", body: form });
  if (!upload.ok) throw new Error(`File upload failed (${upload.status})`);

  const key = target.parameters.find((parameter) => parameter.name === "key")?.value;
  const started = await graphql(
    accessToken,
    `mutation bulk($mutation: String!, $stagedUploadPath: String!) {
      bulkOperationRunMutation(mutation: $mutation, stagedUploadPath: $stagedUploadPath) {
        bulkOperation { id status }
        userErrors { field message }
      }
    }`,
    { mutation: fs.readFileSync(mutationPath, "utf8"), stagedUploadPath: key },
  );
  failOn(started.bulkOperationRunMutation.userErrors, "Bulk import");
  const id = started.bulkOperationRunMutation.bulkOperation.id;
  fs.writeFileSync(runPath, JSON.stringify({ id, file: jsonlPath }));
  console.log(id);
  console.log(jsonlPath);
  console.log("Progress keeps running on Shopify if you stop this command.");
  console.log("Reattach with: node scripts/bulk-import.mjs status");
  return { id, file: jsonlPath };
}

async function operation(accessToken, id) {
  const data = await graphql(
    accessToken,
    `query bulk($id: ID!) {
      bulkOperation(id: $id) {
        id
        status
        errorCode
        objectCount
        createdAt
        completedAt
      }
    }`,
    { id },
  );
  return data.bulkOperation;
}

function lineCount(jsonlPath) {
  return fs.readFileSync(jsonlPath, "utf8").split("\n").filter(Boolean).length;
}

function clock(ms) {
  const seconds = Math.max(0, Math.round(ms / 1000));
  const parts = [
    [Math.floor(seconds / 3600), "hour"],
    [Math.floor((seconds % 3600) / 60), "minute"],
    [seconds % 60, "second"],
  ];
  const shown = parts.filter(([value], index) => value || (index === 2 && seconds === 0));
  return shown.map(([value, unit]) => `${value} ${unit}${value === 1 ? "" : "s"}`).join(" ");
}

function timeOfDay(iso) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

function writeLog(current, jsonlPath, total) {
  const logsDir = path.join(root, "data/logs");
  fs.mkdirSync(logsDir, { recursive: true });
  const numericId = String(current.id).split("/").pop();
  const logPath = path.join(logsDir, `${path.basename(jsonlPath, ".jsonl")}-${numericId}.log`);
  const totalTime =
    current.createdAt && current.completedAt
      ? clock(Date.parse(current.completedAt) - Date.parse(current.createdAt))
      : "";
  const lines = [
    `file: ${jsonlPath}`,
    `id: ${current.id}`,
    `status: ${current.status}`,
    `processed: ${current.objectCount ?? "0"}/${total}`,
    `created: ${timeOfDay(current.createdAt)}`,
    `completed: ${timeOfDay(current.completedAt)}`,
    `Total Duration: ${totalTime}`,
  ];
  if (current.errorCode) lines.push(`error: ${current.errorCode}`);
  fs.writeFileSync(logPath, `${lines.join("\n")}\n`);
  return logPath;
}

function terminalLink(filePath) {
  const shown = `${filePath}:1`;
  if (!process.stdout.isTTY) return shown;
  return `\x1b]8;;file://${filePath}\x1b\\${shown}\x1b]8;;\x1b\\`;
}

function progressBar(done, total, errorCode) {
  const width = 30;
  const n = Number(done) || 0;
  const filled = total > 0 ? Math.min(width, Math.round((n / total) * width)) : 0;
  const bar = `${"█".repeat(filled)}${"░".repeat(width - filled)}`;
  return `[${bar}] ${n}/${total}${errorCode ? `  ${errorCode}` : ""}`;
}

function renderProgress(done, total, errorCode, finished) {
  const line = progressBar(done, total, errorCode);
  if (!process.stdout.isTTY) {
    console.log(line);
    return;
  }
  process.stdout.write(`\r${line}\x1b[K${finished ? "\n" : ""}`);
}

async function watch(accessToken, id, jsonlPath) {
  const total = lineCount(jsonlPath);
  const terminal = new Set(["COMPLETED", "FAILED", "CANCELED", "EXPIRED"]);
  let announced = false;
  for (;;) {
    const current = await operation(accessToken, id);
    if (!announced && current.createdAt) {
      console.log(`created ${timeOfDay(current.createdAt)}`);
      announced = true;
    }
    const done = current.objectCount ?? "0";
    const finished = terminal.has(current.status);
    renderProgress(done, total, current.errorCode, finished);
    if (finished) {
      if (current.completedAt) console.log(`completed ${timeOfDay(current.completedAt)}`);
      if (current.createdAt && current.completedAt) {
        const totalTime = clock(Date.parse(current.completedAt) - Date.parse(current.createdAt));
        console.log(process.stdout.isTTY ? `\x1b[1;33mTotal Duration: ${totalTime}\x1b[0m` : `Total Duration: ${totalTime}`);
      }
      console.log(`log ${terminalLink(writeLog(current, jsonlPath, total))}`);
      process.exit(current.status === "COMPLETED" ? 0 : 1);
    }
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
}

function runFile() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: node scripts/bulk-import.mjs <file.jsonl>");
    console.error("       node scripts/bulk-import.mjs status");
    process.exit(1);
  }
  if (arg === "status") return JSON.parse(fs.readFileSync(runPath, "utf8"));
  return { file: path.resolve(arg) };
}

const accessToken = await token();
const run = runFile();
const started = run.id ? run : await start(accessToken, run.file);
await watch(accessToken, started.id, started.file);
