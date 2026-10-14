import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, FileDown, Maximize2, Minimize2 } from "lucide-react";
import { UniverSheetsCorePreset } from "@univerjs/preset-sheets-core";
import UniverPresetSheetsCoreEnUS from "@univerjs/preset-sheets-core/locales/en-US";
import { createUniver, LocaleType, mergeLocales, type FUniver } from "@univerjs/presets";
import "@univerjs/preset-sheets-core/lib/index.css";
import {
  getFeaturesSheet,
  getFeaturesWorkbook,
  saveFeaturesWorkbook,
  slugifyTabName,
} from "../../lib/featuresSheet";
import {
  downloadFeaturesExport,
  featuresSheetToCsv,
  featuresSheetToXlsx,
} from "../../lib/featuresSheetExport";
import {
  loadWorkbookIntoUniver,
  readSheetFromUniver,
  readWorkbookFromUniver,
} from "../../lib/featuresSheetUniver";

export const FEATURES_LIST_GROUP = "features-list";

const zoomKey = (clientSlug: string) => `discovery:features-sheet-zoom:${clientSlug}`;
const activeTabKey = (clientSlug: string) => `discovery:features-sheet-tab:${clientSlug}`;

function readStoredZoom(clientSlug: string): number | null {
  const n = Number(localStorage.getItem(zoomKey(clientSlug)));
  return Number.isFinite(n) && n >= 0.1 && n <= 4 ? n : null;
}

function readStoredActiveTab(clientSlug: string): string | null {
  const slug = localStorage.getItem(activeTabKey(clientSlug));
  return slug && slug.trim() ? slug : null;
}

function writeStoredActiveTab(clientSlug: string, slug: string): void {
  if (!slug) return;
  localStorage.setItem(activeTabKey(clientSlug), slug);
}

/** Row/col insert/delete and col-width do not always emit SheetValueChanged. */
function shouldPersistCommand(id: string): boolean {
  return (
    /sheet\.command\.(insert|remove)-(row|col)/.test(id) ||
    id.includes("col-width")
  );
}

export function FeaturesList({ clientSlug }: { clientSlug: string }) {
  const shellRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<FUniver | null>(null);
  const sheetIdToSlugRef = useRef<Map<string, string>>(new Map());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [status, setStatus] = useState<"ready" | "saving" | "saved" | "error">("ready");
  const [fullscreen, setFullscreen] = useState(false);

  const flushPersist = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = undefined;
    setStatus("saving");
    try {
      const { workbook, sheetIdToSlug } = readWorkbookFromUniver(api, sheetIdToSlugRef.current);
      sheetIdToSlugRef.current = sheetIdToSlug;
      saveFeaturesWorkbook(clientSlug, workbook);
      setStatus("saved");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }, [clientSlug]);

  const persist = useCallback(() => {
    if (!apiRef.current) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => flushPersist(), 500);
  }, [flushPersist]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const container = document.createElement("div");
    container.className = "features-sheet-univer";
    container.style.height = "100%";
    container.style.width = "100%";
    host.append(container);

    const { univer, univerAPI } = createUniver({
      locale: LocaleType.EN_US,
      locales: {
        [LocaleType.EN_US]: mergeLocales(UniverPresetSheetsCoreEnUS),
      },
      presets: [
        UniverSheetsCorePreset({
          container,
          toolbar: true,
          header: true,
          contextMenu: true,
          formulaBar: false,
        }),
      ],
    });

    apiRef.current = univerAPI;
    const savedZoom = readStoredZoom(clientSlug) ?? 1;
    const savedTab = readStoredActiveTab(clientSlug);
    sheetIdToSlugRef.current = loadWorkbookIntoUniver(
      univerAPI,
      getFeaturesWorkbook(clientSlug),
      savedZoom,
      savedTab,
    );

    // Re-apply after render mounts; create-time zoomRatio alone can be overwritten.
    const zoomTimers = [50, 200, 500].map((ms) =>
      window.setTimeout(() => {
        try {
          const wb = univerAPI.getActiveWorkbook();
          const sheet =
            (savedTab && wb?.getSheetBySheetId?.(savedTab)) || wb?.getActiveSheet();
          if (!sheet) return;
          if (wb && typeof wb.setActiveSheet === "function") wb.setActiveSheet(sheet);
          if (Math.abs(sheet.getZoom() - savedZoom) > 0.001) sheet.zoom(savedZoom);
        } catch {
          /* disposed */
        }
      }, ms),
    );

    const valueSub = univerAPI.addEvent(univerAPI.Event.SheetValueChanged, (params) => {
      persist();
      try {
        const sheet = univerAPI.getActiveWorkbook()?.getActiveSheet();
        const ranges = (params as { effectedRanges?: Array<{ startRow?: number; endRow?: number }> })
          ?.effectedRanges;
        if (!sheet || !ranges?.length) return;
        for (const range of ranges) {
          const start = range.startRow ?? 0;
          const end = range.endRow ?? start;
          sheet.setRowAutoHeight?.(start, end - start + 1);
          for (let r = start; r <= end; r++) sheet.autoFitRow?.(r);
        }
      } catch {
        /* ignore */
      }
    });

    const rememberActiveTab = () => {
      try {
        const sheet = univerAPI.getActiveWorkbook()?.getActiveSheet();
        if (!sheet) return;
        const id = typeof sheet.getSheetId === "function" ? sheet.getSheetId() : "";
        const name =
          (typeof sheet.getSheetName === "function" ? sheet.getSheetName() : null) ||
          (typeof sheet.getName === "function" ? sheet.getName() : null) ||
          "";
        const slug =
          sheetIdToSlugRef.current.get(id) ||
          (name ? slugifyTabName(String(name)) : "") ||
          id;
        if (slug) writeStoredActiveTab(clientSlug, slug);
      } catch {
        /* disposed */
      }
    };

    const structureSubs = [
      univerAPI.Event.SheetCreated,
      univerAPI.Event.SheetDeleted,
      univerAPI.Event.SheetMoved,
      univerAPI.Event.SheetNameChanged,
    ]
      .filter((ev) => ev != null)
      .map((ev) => univerAPI.addEvent(ev, () => persist()));

    const activeTabSub =
      univerAPI.Event.ActiveSheetChanged != null
        ? univerAPI.addEvent(univerAPI.Event.ActiveSheetChanged, rememberActiveTab)
        : null;

    // SheetZoomChanged misses some zoom paths; the operation always runs.
    // Row/col delete/insert also land here (not via SheetValueChanged).
    const commandSub = univerAPI.getActiveWorkbook()?.onCommandExecuted((command) => {
      if (command.id === "sheet.operation.set-zoom-ratio") {
        const zoom = (command.params as { zoomRatio?: number } | undefined)?.zoomRatio;
        if (typeof zoom === "number" && zoom >= 0.1 && zoom <= 4) {
          localStorage.setItem(zoomKey(clientSlug), String(zoom));
        }
        return;
      }
      if (shouldPersistCommand(command.id)) persist();
    });

    return () => {
      rememberActiveTab();
      if (saveTimer.current) flushPersist();
      for (const id of zoomTimers) clearTimeout(id);
      valueSub?.dispose?.();
      activeTabSub?.dispose?.();
      for (const sub of structureSubs) sub?.dispose?.();
      commandSub?.dispose?.();
      apiRef.current = null;
      queueMicrotask(() => {
        univer.dispose();
        container.remove();
      });
    };
  }, [clientSlug, persist, flushPersist]);

  // CSS fullscreen (not requestFullscreen): Univer toolbar menus portal to document.body,
  // and browser fullscreen hides anything outside the fullscreen element.
  const toggleFullscreen = useCallback(() => {
    setFullscreen((v) => !v);
  }, []);

  const liveSheet = useCallback(() => {
    const api = apiRef.current;
    return api ? readSheetFromUniver(api) : getFeaturesSheet(clientSlug);
  }, [clientSlug]);

  const exportCsv = useCallback(() => {
    downloadFeaturesExport(
      `${clientSlug}-features.csv`,
      featuresSheetToCsv(liveSheet()),
      "text/csv;charset=utf-8",
    );
  }, [clientSlug, liveSheet]);

  const exportExcel = useCallback(() => {
    downloadFeaturesExport(
      `${clientSlug}-features.xlsx`,
      featuresSheetToXlsx(liveSheet()),
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  }, [clientSlug, liveSheet]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [fullscreen]);

  return (
    <div className="flex flex-col gap-2 min-h-0 flex-1">
      {!fullscreen && (
        <div className="flex items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-ink-400">
            Source of truth: <code className="text-ink-300">features-sheet/*.md</code> (one file per tab).
            {status === "saving"
              ? " · saving…"
              : status === "saved"
                ? " · saved"
                : status === "error"
                  ? " · save failed"
                  : ""}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-ink-700 px-2.5 py-1.5 text-xs text-ink-200 hover:bg-ink-800 hover:text-ink-50 transition-colors"
            >
              <FileDown className="h-3.5 w-3.5" />
              CSV
            </button>
            <button
              type="button"
              onClick={exportExcel}
              className="inline-flex items-center gap-1.5 rounded-lg border border-ink-700 px-2.5 py-1.5 text-xs text-ink-200 hover:bg-ink-800 hover:text-ink-50 transition-colors"
            >
              <FileDown className="h-3.5 w-3.5" />
              Excel
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="inline-flex items-center gap-1.5 rounded-lg border border-ink-700 px-2.5 py-1.5 text-xs text-ink-200 hover:bg-ink-800 hover:text-ink-50 transition-colors"
              aria-label="Full screen"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Full screen
            </button>
          </div>
        </div>
      )}

      <div
        ref={shellRef}
        className={`features-sheet bg-white ${
          fullscreen
            ? "features-sheet--fs fixed inset-0 z-[200] flex flex-col overflow-visible rounded-none border-0"
            : "relative min-h-0 flex-1 overflow-hidden rounded-md border border-ink-700"
        }`}
      >
        {fullscreen && (
          <button
            type="button"
            onClick={toggleFullscreen}
            className="absolute top-2 right-2 z-[220] inline-flex items-center gap-1.5 rounded-lg border border-ink-300 bg-white/95 px-2.5 py-1.5 text-xs text-ink-800 hover:bg-ink-100"
          >
            <Minimize2 className="h-3.5 w-3.5" />
            Exit
          </button>
        )}
        <div ref={hostRef} className="h-full min-h-0" />
      </div>
    </div>
  );
}

export function FeaturesListPage({
  clientName,
  clientSlug,
}: {
  clientName: string;
  clientSlug: string;
}) {
  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <div className="px-10 pt-6 shrink-0">
        <Link to="/" className="text-sm text-ink-400 hover:text-ink-50 transition-colors">
          Clients
        </Link>
        <ChevronRight className="inline h-3 w-3 text-ink-500 mx-1" />
        <Link to={`/${clientSlug}`} className="text-sm text-ink-400 hover:text-ink-50 transition-colors">
          {clientName}
        </Link>
        <ChevronRight className="inline h-3 w-3 text-ink-500 mx-1" />
        <Link
          to={`/${clientSlug}/requirements`}
          className="text-sm text-ink-400 hover:text-ink-50 transition-colors"
        >
          Requirements
        </Link>
        <ChevronRight className="inline h-3 w-3 text-ink-500 mx-1" />
        <span className="text-sm text-ink-200">Features List</span>
      </div>

      <div className="px-10 py-6 flex flex-col min-h-0 flex-1 w-full">
        <h1 className="text-2xl font-bold text-ink-50 mb-4 shrink-0">Features List</h1>
        <FeaturesList clientSlug={clientSlug} />
      </div>
    </div>
  );
}
