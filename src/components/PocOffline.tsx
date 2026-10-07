export function PocOffline({
  title,
  detail,
  command,
  onRetry,
}: {
  title: string;
  detail: string;
  command: string;
  onRetry: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-50 px-6 py-20 text-gray-900">
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-gray-600">{detail}</p>
        <pre className="overflow-x-auto rounded bg-gray-900 p-4 text-sm text-gray-100">{command}</pre>
        <button className="rounded bg-gray-900 px-4 py-2 text-sm text-white" type="button" onClick={onRetry}>
          Check again
        </button>
      </div>
    </div>
  );
}

export async function serviceUp(url: string) {
  try {
    await fetch(url, { mode: "no-cors", cache: "no-store", signal: AbortSignal.timeout(4000) });
    return true;
  } catch {
    return false;
  }
}
