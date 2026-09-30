import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Grid3x3 } from "lucide-react";
import { renderDeck } from "../../lib/marp";

interface SlidePresenterProps {
  markdown: string;
  deckName: string;
  initialIndex?: number;
  onExit: () => void;
}

export function SlidePresenter({
  markdown,
  deckName,
  initialIndex = 0,
  onExit,
}: SlidePresenterProps) {
  const { htmls, css } = useMemo(() => renderDeck(markdown), [markdown]);
  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.max(0, Math.min(initialIndex, htmls.length - 1))
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showOverview, setShowOverview] = useState(false);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, htmls.length - 1));
  }, [htmls.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "Escape" && showOverview) {
        setShowOverview(false);
      } else if (e.key === "f") {
        toggleFullscreen();
      } else if (e.key === "o") {
        setShowOverview((s) => !s);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, toggleFullscreen, showOverview]);

  if (htmls.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-ink-400">
        No slides found in this deck.
      </div>
    );
  }

  if (showOverview) {
    return (
      <SlideOverview
        htmls={htmls}
        css={css}
        currentIndex={currentIndex}
        onSelect={(i) => {
          setCurrentIndex(i);
          setShowOverview(false);
        }}
        deckName={deckName}
        onExitOverview={() => setShowOverview(false)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-ink-950">
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* Slide stage */}
      <div className="flex-1 relative overflow-hidden">
        <div
          key={currentIndex}
          className="absolute inset-0 transition-opacity duration-300 ease-slide"
        >
          <div
            className="marpit w-full h-full"
            dangerouslySetInnerHTML={{ __html: htmls[currentIndex] }}
          />
        </div>

        {/* Click zones for navigation */}
        <div className="absolute left-0 top-0 bottom-0 w-1/3 cursor-pointer" onClick={goPrev} />
        <div className="absolute right-0 top-0 bottom-0 w-1/3 cursor-pointer" onClick={goNext} />
      </div>

      {/* Control bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-ink-900 border-t border-ink-700">
        <div className="flex items-center gap-3">
          <button
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="p-1.5 rounded hover:bg-ink-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-5 w-5 text-ink-200" />
          </button>
          <span className="text-sm text-ink-300 font-mono min-w-[60px] text-center">
            {currentIndex + 1} / {htmls.length}
          </span>
          <button
            onClick={goNext}
            disabled={currentIndex === htmls.length - 1}
            className="p-1.5 rounded hover:bg-ink-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-5 w-5 text-ink-200" />
          </button>
        </div>

        <div className="text-sm text-ink-400 truncate max-w-[300px]">
          {deckName}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowOverview(true)}
            className="p-1.5 rounded hover:bg-ink-700 transition-colors"
            title="Overview (O)"
          >
            <Grid3x3 className="h-5 w-5 text-ink-200" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded hover:bg-ink-700 transition-colors"
            title="Fullscreen (F)"
          >
            {isFullscreen ? (
              <Minimize2 className="h-5 w-5 text-ink-200" />
            ) : (
              <Maximize2 className="h-5 w-5 text-ink-200" />
            )}
          </button>
          <button
            onClick={onExit}
            className="ml-2 text-sm text-ink-300 hover:text-ink-50 transition-colors px-3 py-1 rounded hover:bg-ink-700"
          >
            Exit
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-ink-800">
        <div
          className="h-full bg-accent-500 transition-all duration-300 ease-slide"
          style={{ width: `${((currentIndex + 1) / htmls.length) * 100}%` }}
        />
      </div>
    </div>
  );
}

function SlideOverview({
  htmls,
  css,
  currentIndex,
  onSelect,
  deckName,
  onExitOverview,
}: {
  htmls: string[];
  css: string;
  currentIndex: number;
  onSelect: (index: number) => void;
  deckName: string;
  onExitOverview: () => void;
}) {
  return (
    <div className="flex flex-col h-full bg-ink-950 p-6 overflow-y-auto">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-ink-50">{deckName} — Overview</h2>
        <button
          onClick={onExitOverview}
          className="text-sm text-ink-300 hover:text-ink-50 transition-colors"
        >
          Back to presentation
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {htmls.map((slideHtml, i) => (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={`group relative aspect-video rounded-lg overflow-hidden border-2 transition-all hover:border-accent-500 ${
              i === currentIndex ? "border-accent-500" : "border-ink-700"
            }`}
          >
            <div
              className="marpit absolute inset-0"
              dangerouslySetInnerHTML={{ __html: slideHtml }}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-ink-900/80 px-2 py-1 text-xs text-ink-300 font-mono">
              {i + 1}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
