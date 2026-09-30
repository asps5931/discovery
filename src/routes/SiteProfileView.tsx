import React, { useCallback, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { getClient, getSiteProfileMarkdown, saveSiteProfile } from "../lib/discovery";
import { InlineMarkdownEditor } from "../components/editor/InlineMarkdownEditor";

export function SiteProfileView() {
  const { clientSlug = "" } = useParams<{ clientSlug: string }>();
  const client = getClient(clientSlug);
  const [markdown, setMarkdown] = useState(() => getSiteProfileMarkdown(clientSlug));

  const handleSave = useCallback(
    (next: string) => {
      saveSiteProfile(clientSlug, next);
      setMarkdown(next);
    },
    [clientSlug]
  );

  if (!client) {
    return (
      <div className="flex items-center justify-center h-full text-ink-400">
        Client not found.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-10 pt-6">
        <Link to="/" className="text-sm text-ink-400 hover:text-ink-50 transition-colors">
          Clients
        </Link>
        <ChevronRight className="inline h-3 w-3 text-ink-500 mx-1" />
        <Link to={`/${client.slug}`} className="text-sm text-ink-400 hover:text-ink-50 transition-colors">
          {client.name}
        </Link>
        <ChevronRight className="inline h-3 w-3 text-ink-500 mx-1" />
        <span className="text-sm text-ink-200">Site Profile</span>
      </div>

      <div className="px-10 py-8 max-w-4xl w-full">
        <h1 className="text-2xl font-bold text-ink-50 mb-2">Site Profile</h1>
        <p className="text-ink-400 text-sm mb-8">
          General information about the {client.name} website. Double-click to edit.
        </p>

        <InlineMarkdownEditor value={markdown} onSave={handleSave} />
      </div>
    </div>
  );
}
