import React, { useMemo, useState } from "react";
import { Save, RotateCcw, X, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import { parseDeck, serializeDeck } from "../../lib/deckEditing";
import { renderDeck } from "../../lib/marp";

interface DeckEditorProps {
  markdown: string;
  dirty: boolean;
  onChange: (markdown: string) => void;
  onSave: () => void;
  onReset: () => void;
  onExit: () => void;
}

export function DeckEditor({
  markdown,
  dirty,
  onChange,
  onSave,
  onReset,
  onExit,
}: DeckEditorProps) {
  const parts = useMemo(() => parseDeck(markdown), [markdown]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const slideCount = parts.slides.length;
  const currentSlide = parts.slides[currentIndex] ?? "";

  const handleSlideChange = (value: string) => {
    const next: typeof parts = {
      frontmatter: parts.frontmatter,
      slides: parts.slides.map((s, i) => (i === currentIndex ? value : s)),
    };
    onChange(serializeDeck(next));
  };

  const goPrev = () => setCurrentIndex((i) => Math.max(0, i - 1));
  const goNext = () => setCurrentIndex((i) => Math.min(slideCount - 1, i + 1));

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 bg-ink-900 border-b border-ink-700">
        <div className="flex items-center gap-2 text-sm text-ink-300">
          <Pencil className="h-4 w-4" />
          <span>Editing slides</span>
          {dirty ? (
            <span className="text-xs text-amber-400 font-medium">
              Unsaved changes
            </span>
          ) : (
            <span className="text-xs text-ink-500">All changes saved</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-ink-300 hover:text-white hover:bg-ink-800 transition-colors"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
          <button
            onClick={onSave}
            disabled={!dirty}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" /> Save
          </button>
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-ink-300 hover:text-white hover:bg-ink-800 transition-colors"
          >
            <X className="h-4 w-4" /> Done
          </button>
        </div>
      </div>

      {/* Slide navigator */}
      <div className="flex items-center justify-center gap-4 px-6 py-3 border-b border-ink-700 bg-ink-950">
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-ink-200 hover:bg-ink-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </button>
        <span className="text-sm font-mono text-ink-300">
          Slide {currentIndex + 1} of {slideCount}
        </span>
        <button
          onClick={goNext}
          disabled={currentIndex === slideCount - 1}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-ink-200 hover:bg-ink-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Current slide editor + preview */}
      <div className="flex-1 overflow-y-auto px-10 py-8">
        <div className="flex flex-col gap-6 max-w-4xl mx-auto">
          <div className="flex flex-col">
            <span className="text-xs font-mono text-ink-500 mb-2">Preview</span>
            <div className="relative aspect-video bg-ink-950 rounded-xl border border-ink-700 overflow-hidden">
              <SlidePreview frontmatter={parts.frontmatter} slide={currentSlide} />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-mono text-ink-500 mb-2">
              Edit the text below — the preview updates live
            </span>
            <textarea
              value={currentSlide}
              onChange={(e) => handleSlideChange(e.target.value)}
              spellCheck={false}
              className="w-full min-h-[240px] px-4 py-3 bg-ink-900 text-ink-100 font-mono text-sm leading-relaxed rounded-xl border border-ink-700 focus:outline-none focus:ring-1 focus:ring-accent-500 resize-y"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SlidePreview({
  frontmatter,
  slide,
}: {
  frontmatter: string;
  slide: string;
}) {
  const { htmls, css } = useMemo(() => {
    const md = serializeDeck({ frontmatter, slides: [slide] });
    return renderDeck(md);
  }, [frontmatter, slide]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div
        className="marpit absolute inset-0"
        dangerouslySetInnerHTML={{ __html: htmls[0] ?? "" }}
      />
    </>
  );
}
