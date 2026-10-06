import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { ActionItemList } from "../components/ActionItemList";
import { getActionItemsMarkdown, getClient, saveActionItems } from "../lib/discovery";
import { parseActionItems, serializeActionItems, type ActionItem } from "../lib/actionItems";

export function ActionItemsView() {
  const { clientSlug = "" } = useParams<{ clientSlug: string }>();
  const client = getClient(clientSlug);
  const [items, setItems] = useState<ActionItem[]>(() =>
    parseActionItems(getActionItemsMarkdown(clientSlug))
  );

  const update = (next: ActionItem[]) => {
    setItems(next);
    saveActionItems(clientSlug, serializeActionItems(next));
  };

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
        <span className="text-sm text-ink-200">Action Items</span>
      </div>

      <div className="px-10 py-8 max-w-4xl w-full">
        <h1 className="text-2xl font-bold text-ink-50 mb-2">Action Items</h1>
        <ActionItemList items={items} onChange={update} />
      </div>
    </div>
  );
}
