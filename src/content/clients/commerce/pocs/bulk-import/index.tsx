import { useEffect, useRef, useState } from "react";
import { PocOffline } from "../../../../../components/PocOffline";

type BulkFile = { name: string; mutation: string };
type Mutation = { id: string; name: string; description: string };

type Job = {
  file: string;
  status: "UPLOADING" | "RUNNING" | "COMPLETED" | "FAILED";
  processed: number;
  total: number;
  percent: number;
  duration: string;
  error: string;
  finished: boolean;
};

const STATUS_LABEL = {
  UPLOADING: "Uploading to Shopify",
  RUNNING: "Running",
  COMPLETED: "Completed",
  FAILED: "Failed",
};

async function post(url: string, body: object) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

export default function BulkImportPoc() {
  const [files, setFiles] = useState<BulkFile[]>([]);
  const [mutations, setMutations] = useState<Mutation[]>([]);
  const [selected, setSelected] = useState("");
  const [mutation, setMutation] = useState("");
  const [jsonlFile, setJsonlFile] = useState<File | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const [runId, setRunId] = useState(0);
  const jsonlRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let stop = false;
    let timer = 0;
    async function load() {
      try {
        const response = await fetch("/__bulk");
        if (!response.ok) throw new Error(String(response.status));
        const data = await response.json();
        if (stop) return;
        setOffline(false);
        setFiles(data.files || []);
        setMutations(data.mutations || []);
        setJob(data.job);
        if (data.job && !data.job.finished) timer = window.setTimeout(load, 2000);
      } catch {
        if (!stop) setOffline(true);
      }
    }
    void load();
    return () => {
      stop = true;
      window.clearTimeout(timer);
    };
  }, [runId]);

  const running = busy || (!!job && !job.finished);

  if (offline) {
    return (
      <PocOffline
        title="Bulk import"
        detail="The bulk import service is not running. From the discovery project root:"
        command="npm run dev"
        onRetry={() => setRunId((value) => value + 1)}
      />
    );
  }

  async function onRun() {
    setError("");
    setBusy(true);
    try {
      let name = selected;
      if (jsonlFile) {
        const uploaded = await post("/__bulk/upload", {
          filename: jsonlFile.name,
          content: await jsonlFile.text(),
        });
        name = uploaded.file;
        setSelected(name);
        setJsonlFile(null);
        if (jsonlRef.current) jsonlRef.current.value = "";
      }
      if (!name) throw new Error("Choose a JSONL file");
      if (!mutation) throw new Error("Choose what this import should do");
      const started = await post("/__bulk/run", { file: name, mutation });
      setJob(started.job);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      setRunId((value) => value + 1);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-20 text-gray-900">
      <div className="mx-auto max-w-xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Bulk import</h1>
          <p className="mt-2 text-sm text-gray-600">
            Choose what the import should do. A matching file in <code>data/bulk-import/</code> is selected for you, unless you upload your own JSONL.
          </p>
        </div>

        <label className="block text-sm">
          What should this import do?
          <select
            className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2"
            value={mutation}
            onChange={(event) => {
              const id = event.target.value;
              setMutation(id);
              if (jsonlFile) return;
              const current = files.find((file) => file.name === selected);
              if (current?.mutation === id) return;
              const match = files.find((file) => file.mutation === id);
              setSelected(match?.name || "");
            }}
            disabled={running}
          >
            <option value="">Select an action</option>
            {mutations.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.description} ({entry.name})
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          Existing file
          <select
            className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2"
            value={selected}
            onChange={(event) => {
              const name = event.target.value;
              setSelected(name);
              const match = files.find((file) => file.name === name);
              if (match?.mutation) setMutation(match.mutation);
            }}
            disabled={running || !!jsonlFile}
          >
            <option value="">Select a file</option>
            {files.map((file) => (
              <option key={file.name} value={file.name}>
                {file.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          JSONL file
          <input
            className="mt-1 block w-full text-sm"
            type="file"
            accept=".jsonl,application/jsonl,application/x-ndjson"
            disabled={running}
            ref={jsonlRef}
            onChange={(event) => setJsonlFile(event.target.files?.[0] || null)}
          />
        </label>

        <button
          className="rounded bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50"
          type="button"
          onClick={() => void onRun()}
          disabled={running}
        >
          {running ? "Running" : "Run bulk import"}
        </button>

        {error && <p className="text-sm text-red-700">{error}</p>}

        {job && (
          <div className="space-y-2 rounded border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium">
              {STATUS_LABEL[job.status]} · {job.file}
            </p>
            <div className="h-3 overflow-hidden rounded bg-gray-200">
              <div className="h-full bg-gray-900" style={{ width: `${job.percent}%` }} />
            </div>
            <p className="text-sm text-gray-600">
              {job.percent}% · {job.processed}/{job.total}
            </p>
            {job.duration && <p className="text-sm font-medium">Total Duration: {job.duration}</p>}
            {job.error && <p className="text-sm text-red-700">{job.error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
