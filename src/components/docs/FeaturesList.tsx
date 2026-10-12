import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import { UniverSheetsCorePreset } from "@univerjs/preset-sheets-core";
import UniverPresetSheetsCoreEnUS from "@univerjs/preset-sheets-core/locales/en-US";
import { createUniver, LocaleType, mergeLocales, type FUniver } from "@univerjs/presets";
import "@univerjs/preset-sheets-core/lib/index.css";
import { getFeaturesSheet, saveFeaturesSheet } from "../../lib/featuresSheet";
import { loadSheetIntoUniver, readSheetFromUniver } from "../../lib/featuresSheetUniver";

export const FEATURES_LIST_GROUP = "features-list";

const zoomKey = (clientSlug: string) => `discovery:features-sheet-zoom:${clientSlug}`;

function readStoredZoom(clientSlug: string): number | null {
  const n = Number(localStorage.getItem(zoomKey(clientSlug)));
  return Number.isFinite(n) && n >= 0.1 && n <= 4 ? n : null;
}

export function FeaturesList({ clientSlug }: { clientSlug: string }) {
  const shellRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<FUniver | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [status, setStatus] = useState<"ready" | "saving" | "saved" | "error">("ready");
  const [fullscreen, setFullscreen] = useState(false);

  const persist = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setStatus("saving");
      try {
        saveFeaturesSheet(clientSlug, readSheetFromUniver(api));
        setStatus("saved");
      } catch (err) {
        console.error(err);
        setStatus("error");
      }
    }, 500);
  }, [clientSlug]);

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
    loadSheetIntoUniver(univerAPI, getFeaturesSheet(clientSlug), savedZoom);

    // Re-apply after render mounts; create-time zoomRatio alone can be overwritten.
    const zoomTimers = [50, 200, 500].map((ms) =>
      window.setTimeout(() => {
        try {
          const sheet = univerAPI.getActiveWorkbook()?.getActiveSheet();
          if (!sheet) return;
          if (Math.abs(sheet.getZoom() - savedZoom) > 0.001) sheet.zoom(savedZoom);
        } catch {
          /* disposed */
        }
      }, ms),
    );

    const sub = univerAPI.addEvent(univerAPI.Event.SheetValueChanged, (params) => {
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

    // SheetZoomChanged misses some zoom paths; the operation always runs.
    const zoomSub = univerAPI.getActiveWorkbook()?.onCommandExecuted((command) => {
      if (command.id !== "sheet.operation.set-zoom-ratio") return;
      const zoom = (command.params as { zoomRatio?: number } | undefined)?.zoomRatio;
      if (typeof zoom === "number" && zoom >= 0.1 && zoom <= 4) {
        localStorage.setItem(zoomKey(clientSlug), String(zoom));
      }
    });

    return () => {
      clearTimeout(saveTimer.current);
      for (const id of zoomTimers) clearTimeout(id);
      sub?.dispose?.();
      zoomSub?.dispose?.();
      apiRef.current = null;
      queueMicrotask(() => {
        univer.dispose();
        container.remove();
      });
    };
  }, [clientSlug, persist]);

  // CSS fullscreen (not requestFullscreen): Univer toolbar menus portal to document.body,
  // and browser fullscreen hides anything outside the fullscreen element.
  const toggleFullscreen = useCallback(() => {
    setFullscreen((v) => !v);
  }, []);

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
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-ink-400">
            Source of truth: <code className="text-ink-300">features-sheet.md</code>.
            Toolbar Bold for selected text; Wrap under the ⋯ menu. Notes/Shopify rows are sized to show full wrapped content. Enter for line breaks in a cell.
            {status === "saving"
              ? " · saving…"
              : status === "saved"
                ? " · saved"
                : status === "error"
                  ? " · save failed"
                  : ""}
          </p>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1.5 shrink-0 rounded-lg border border-ink-700 px-2.5 py-1.5 text-xs text-ink-200 hover:bg-ink-800 hover:text-ink-50 transition-colors"
            aria-label="Full screen"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Full screen
          </button>
        </div>
      )}

      <div
        ref={shellRef}
        className={`features-sheet bg-white ${
          fullscreen
            ? "features-sheet--fs fixed inset-0 z-[200] flex flex-col overflow-visible rounded-none border-0"
            : "relative min-h-0 min-h-[560px] flex-1 overflow-hidden rounded-xl border border-ink-700"
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
        <div
          ref={hostRef}
          className={`min-h-0 ${fullscreen ? "h-full flex-1" : "h-full min-h-[560px]"}`}
          style={{ height: fullscreen ? "100%" : 560 }}
        />
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
