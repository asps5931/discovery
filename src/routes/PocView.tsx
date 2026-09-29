import React, { useState, useEffect, Suspense } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getClient, getPocModule, titleFromSlug } from "../lib/discovery";

export function PocView() {
  const { clientSlug, pocSlug } = useParams<{ clientSlug: string; pocSlug: string }>();
  const client = clientSlug ? getClient(clientSlug) : undefined;
  const [Comp, setComp] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    if (clientSlug && pocSlug) {
      const loader = getPocModule(clientSlug, pocSlug);
      if (loader) {
        loader().then((m) => setComp(() => m.default));
      }
    }
  }, [clientSlug, pocSlug]);

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-950 text-ink-400">
        Client not found.
      </div>
    );
  }

  const pocName = titleFromSlug(pocSlug || "");

  return (
    <div className="min-h-screen">
      {/* Floating link back to the portal, kept above POC content */}
      <div className="fixed top-4 left-4 z-[60]">
        <Link
          to={`/${client.slug}`}
          className="inline-flex items-center gap-2 rounded-lg bg-ink-900/90 border border-ink-700 px-3 py-2 text-sm text-ink-200 hover:text-white hover:bg-ink-800 backdrop-blur transition-colors shadow-lg"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to portal
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center text-ink-400">
            Loading {pocName}...
          </div>
        }
      >
        {Comp ? (
          <Comp />
        ) : (
          <div className="min-h-screen flex items-center justify-center text-ink-400">
            Prototype not found.
          </div>
        )}
      </Suspense>
    </div>
  );
}
