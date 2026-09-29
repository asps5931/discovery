import React, { useState, useEffect, Suspense } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronRight, FileText } from "lucide-react";
import {
  getClient,
  getRequirementGroupsForClient,
  getRequirementDocModule,
} from "../lib/discovery";
import { DocMDXProvider } from "../components/docs/DocMDXProvider";

export function RequirementsView() {
  const { clientSlug, groupSlug, docSlug } = useParams<{
    clientSlug: string;
    groupSlug?: string;
    docSlug?: string;
  }>();

  const client = clientSlug ? getClient(clientSlug) : undefined;
  const groups = clientSlug ? getRequirementGroupsForClient(clientSlug) : [];

  if (!client) {
    return (
      <div className="flex items-center justify-center h-full text-ink-400">
        Client not found.
      </div>
    );
  }

  // If we have groupSlug + docSlug, show individual doc
  if (groupSlug && docSlug) {
    return (
      <RequirementDocView
        clientName={client.name}
        clientSlug={client.slug}
        groupSlug={groupSlug}
        docSlug={docSlug}
        groups={groups}
      />
    );
  }

  // If we have groupSlug, show all docs in that group
  if (groupSlug) {
    const group = groups.find((g) => g.slug === groupSlug);
    if (!group) {
      return (
        <div className="flex items-center justify-center h-full text-ink-400">
          Requirements group not found.
        </div>
      );
    }
    return (
      <RequirementGroupView
        clientName={client.name}
        clientSlug={client.slug}
        groupSlug={groupSlug}
        groups={groups}
      />
    );
  }

  return (
    <div className="flex items-center justify-center h-full text-ink-400">
      Select a requirements group from the sidebar.
    </div>
  );
}

function RequirementGroupView({
  clientName,
  clientSlug,
  groupSlug,
  groups,
}: {
  clientName: string;
  clientSlug: string;
  groupSlug: string;
  groups: ReturnType<typeof getRequirementGroupsForClient>;
}) {
  const group = groups.find((g) => g.slug === groupSlug)!;
  const groupName = group.name;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Breadcrumb */}
      <div className="px-10 pt-6">
        <Link to="/" className="text-sm text-ink-400 hover:text-white transition-colors">
          Clients
        </Link>
        <ChevronRight className="inline h-3 w-3 text-ink-500 mx-1" />
        <Link to={`/${clientSlug}`} className="text-sm text-ink-400 hover:text-white transition-colors">
          {clientName}
        </Link>
        <ChevronRight className="inline h-3 w-3 text-ink-500 mx-1" />
        <span className="text-sm text-ink-200">{groupName}</span>
      </div>

      <div className="px-10 py-8 max-w-4xl w-full">
        <h1 className="text-2xl font-bold text-white mb-2">{groupName} Requirements</h1>
        <p className="text-ink-400 text-sm mb-10">
          {group.docs.length} {group.docs.length === 1 ? "document" : "documents"} in this group.
          Click any document to read it individually.
        </p>

        {/* Group navigation chips */}
        <div className="flex flex-wrap gap-2 mb-8">
          {groups.map((g) => (
            <Link
              key={g.slug}
              to={`/${clientSlug}/requirements/${g.slug}`}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                g.slug === groupSlug
                  ? "bg-accent-500 text-white"
                  : "bg-ink-800 text-ink-300 hover:bg-ink-700"
              }`}
            >
              {g.name} ({g.docs.length})
            </Link>
          ))}
        </div>

        {/* All docs in this group, rendered inline */}
        <div className="space-y-12">
          {group.docs.map((doc) => (
            <RequirementDocSection
              key={doc.slug}
              clientSlug={clientSlug}
              groupSlug={groupSlug}
              docSlug={doc.slug}
              docName={doc.name}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function RequirementDocSection({
  clientSlug,
  groupSlug,
  docSlug,
  docName,
}: {
  clientSlug: string;
  groupSlug: string;
  docSlug: string;
  docName: string;
}) {
  const [Comp, setComp] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    const loader = getRequirementDocModule(clientSlug, groupSlug, docSlug);
    if (loader) {
      loader().then((m) => setComp(() => m.default));
    }
  }, [clientSlug, groupSlug, docSlug]);

  return (
    <div className="border border-ink-700 rounded-xl bg-ink-900 overflow-hidden">
      <div className="border-b border-ink-700 px-6 py-3 flex items-center justify-between bg-ink-800/50">
        <h2 className="text-lg font-semibold text-white">{docName}</h2>
        <Link
          to={`/${clientSlug}/requirements/${groupSlug}/${docSlug}`}
          className="text-xs text-accent-400 hover:text-accent-300 transition-colors"
        >
          View →
        </Link>
      </div>
      <div className="prose-doc px-6 py-6">
        {Comp ? (
          <DocMDXProvider>
            <Comp />
          </DocMDXProvider>
        ) : (
          <div className="text-ink-400 text-sm">Loading...</div>
        )}
      </div>
    </div>
  );
}

function RequirementDocView({
  clientName,
  clientSlug,
  groupSlug,
  docSlug,
  groups,
}: {
  clientName: string;
  clientSlug: string;
  groupSlug: string;
  docSlug: string;
  groups: ReturnType<typeof getRequirementGroupsForClient>;
}) {
  const [Comp, setComp] = useState<React.ComponentType<any> | null>(null);
  const group = groups.find((g) => g.slug === groupSlug);
  const doc = group?.docs.find((d) => d.slug === docSlug);

  useEffect(() => {
    const loader = getRequirementDocModule(clientSlug, groupSlug, docSlug);
    if (loader) {
      loader().then((m) => setComp(() => m.default));
    }
  }, [clientSlug, groupSlug, docSlug]);

  if (!doc) {
    return (
      <div className="flex items-center justify-center h-full text-ink-400">
        Document not found.
      </div>
    );
  }

  // Find prev/next docs in the same group
  const docIndex = group!.docs.findIndex((d) => d.slug === docSlug);
  const prevDoc = docIndex > 0 ? group!.docs[docIndex - 1] : null;
  const nextDoc = docIndex < group!.docs.length - 1 ? group!.docs[docIndex + 1] : null;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Breadcrumb */}
      <div className="px-10 pt-6">
        <Link to="/" className="text-sm text-ink-400 hover:text-white transition-colors">
          Clients
        </Link>
        <ChevronRight className="inline h-3 w-3 text-ink-500 mx-1" />
        <Link to={`/${clientSlug}`} className="text-sm text-ink-400 hover:text-white transition-colors">
          {clientName}
        </Link>
        <ChevronRight className="inline h-3 w-3 text-ink-500 mx-1" />
        <Link
          to={`/${clientSlug}/requirements/${groupSlug}`}
          className="text-sm text-ink-400 hover:text-white transition-colors"
        >
          {group!.name}
        </Link>
        <ChevronRight className="inline h-3 w-3 text-ink-500 mx-1" />
        <span className="text-sm text-ink-200">{doc.name}</span>
      </div>

      <div className="px-10 py-8 max-w-4xl w-full">
        {/* Back to group */}
        <Link
          to={`/${clientSlug}/requirements/${groupSlug}`}
          className="inline-flex items-center gap-1 text-sm text-ink-400 hover:text-white transition-colors mb-6"
        >
          ← Back to {group!.name}
        </Link>

        <div className="prose-doc">
          {Comp ? (
            <DocMDXProvider>
              <Comp />
            </DocMDXProvider>
          ) : (
            <div className="text-ink-400">Loading...</div>
          )}
        </div>

        {/* Prev/Next navigation */}
        <div className="flex items-center justify-between mt-12 pt-6 border-t border-ink-700">
          {prevDoc ? (
            <Link
              to={`/${clientSlug}/requirements/${groupSlug}/${prevDoc.slug}`}
              className="text-sm text-ink-300 hover:text-white transition-colors"
            >
              ← {prevDoc.name}
            </Link>
          ) : (
            <span />
          )}
          {nextDoc ? (
            <Link
              to={`/${clientSlug}/requirements/${groupSlug}/${nextDoc.slug}`}
              className="text-sm text-ink-300 hover:text-white transition-colors"
            >
              {nextDoc.name} →
            </Link>
          ) : (
            <span />
          )}
        </div>
      </div>
    </div>
  );
}
