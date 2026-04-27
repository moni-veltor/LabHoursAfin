"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink-text hover:bg-line"
    >
      Print / Save as PDF
    </button>
  );
}
