"use client";

import { useEffect, useState } from "react";

type Toast = { id: string; message: string; tone: "ok" | "error" | "info" };

let push: ((t: Omit<Toast, "id">) => void) | null = null;

export function toast(message: string, tone: Toast["tone"] = "ok") {
  push?.({ message, tone });
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    push = (t) => {
      const id = Math.random().toString(36).slice(2);
      setItems((prev) => [...prev, { id, ...t }]);
      setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== id));
      }, 4000);
    };
    return () => {
      push = null;
    };
  }, []);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto rounded-md border px-3 py-2 font-mono text-xs shadow-glow-soft ${
            t.tone === "error"
              ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
              : t.tone === "info"
              ? "border-brand-primary/40 bg-brand-primary-950 text-brand-primary-glow"
              : "border-brand-success/40 bg-brand-success-950 text-brand-success"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
