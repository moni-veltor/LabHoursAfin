"use client";

import { useEffect, useState } from "react";

const KEY = "lh-density";

export function DensityToggle() {
  const [dense, setDense] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem(KEY) === "compact";
    setDense(stored);
    document.documentElement.classList.toggle("compact", stored);
  }, []);
  function toggle() {
    const next = !dense;
    setDense(next);
    localStorage.setItem(KEY, next ? "compact" : "comfy");
    document.documentElement.classList.toggle("compact", next);
  }
  return (
    <button
      onClick={toggle}
      title="Toggle density"
      className="rounded-md border border-line bg-raised px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted hover:text-ink-text"
    >
      {dense ? "≡ compact" : "▤ comfy"}
    </button>
  );
}
