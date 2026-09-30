import React from "react";

type CalloutType = "info" | "warning" | "success";

const styles: Record<CalloutType, { bg: string; border: string; text: string; label: string }> = {
  info: {
    bg: "bg-blue-500/10",
    border: "border-blue-600/40 dark:border-blue-500/30",
    text: "text-blue-800 dark:text-blue-300",
    label: "Info",
  },
  warning: {
    bg: "bg-amber-500/10",
    border: "border-amber-700/40 dark:border-amber-500/30",
    text: "text-amber-900 dark:text-amber-300",
    label: "Warning",
  },
  success: {
    bg: "bg-accent-500/10",
    border: "border-accent-700/40 dark:border-accent-500/30",
    text: "text-accent-800 dark:text-accent-300",
    label: "Success",
  },
};

export function Callout({
  type = "info",
  title,
  children,
}: {
  type?: CalloutType;
  title?: string;
  children: React.ReactNode;
}) {
  const s = styles[type];
  return (
    <div className={`my-6 rounded-lg border ${s.border} ${s.bg} p-4`}>
      {title && (
        <div className={`text-sm font-semibold ${s.text} mb-2`}>
          {title}
        </div>
      )}
      <div className="text-ink-200 text-sm leading-relaxed">{children}</div>
    </div>
  );
}
