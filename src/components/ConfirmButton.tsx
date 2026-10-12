import { useEffect, useState } from "react";

export function ConfirmButton({
  message,
  confirmLabel = "Delete",
  onConfirm,
  onOpen,
  className,
  children,
  ariaLabel,
  title,
}: {
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onOpen?: () => void;
  className?: string;
  children: React.ReactNode;
  ariaLabel?: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={className}
        aria-label={ariaLabel}
        title={title}
        onClick={() => {
          onOpen?.();
          setOpen(true);
        }}
      >
        {children}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            className="w-full max-w-sm rounded-xl border border-ink-700 bg-ink-900 p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <p id="confirm-dialog-title" className="text-sm text-ink-100">
              {message}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-1.5 text-sm text-ink-200 hover:text-ink-50"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded-lg bg-red-600 text-white hover:bg-red-500"
                onClick={() => {
                  setOpen(false);
                  onConfirm();
                }}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
