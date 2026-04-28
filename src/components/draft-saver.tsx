"use client";

import { useEffect, useRef } from "react";

export function DraftSaver({ formId, storageKey }: { formId: string; storageKey: string }) {
  const restored = useRef(false);
  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;

    if (!restored.current) {
      restored.current = true;
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const data = JSON.parse(raw) as Record<string, string>;
          for (const [k, v] of Object.entries(data)) {
            const el = form.elements.namedItem(k) as
              | HTMLInputElement
              | HTMLTextAreaElement
              | HTMLSelectElement
              | null;
            if (el && !el.value) el.value = v;
          }
        }
      } catch {}
    }

    function save() {
      try {
        const data: Record<string, string> = {};
        for (const el of Array.from(form!.elements) as Array<
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >) {
          if (!("name" in el) || !el.name) continue;
          if (el.type === "password" || el.type === "submit") continue;
          if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
            data[el.name] = el.checked ? "on" : "";
          } else {
            data[el.name] = el.value;
          }
        }
        localStorage.setItem(storageKey, JSON.stringify(data));
      } catch {}
    }
    function clear() {
      localStorage.removeItem(storageKey);
    }

    form.addEventListener("input", save);
    form.addEventListener("submit", clear);
    return () => {
      form.removeEventListener("input", save);
      form.removeEventListener("submit", clear);
    };
  }, [formId, storageKey]);

  return null;
}
