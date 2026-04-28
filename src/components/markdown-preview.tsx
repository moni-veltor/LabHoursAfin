"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";

export function MarkdownTextarea({
  name,
  defaultValue,
  rows = 6,
  placeholder,
  className,
}: {
  name: string;
  defaultValue?: string;
  rows?: number;
  placeholder?: string;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [tab, setTab] = useState<"write" | "preview">("write");
  return (
    <div
      className={`rounded-md border border-line bg-raised ${className ?? ""}`}
    >
      <div className="flex items-center gap-1 border-b border-line px-2 py-1.5">
        <Tab active={tab === "write"} onClick={() => setTab("write")}>
          Write
        </Tab>
        <Tab active={tab === "preview"} onClick={() => setTab("preview")}>
          Preview
        </Tab>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-dim">
          markdown
        </span>
      </div>
      {tab === "write" ? (
        <textarea
          name={name}
          rows={rows}
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full resize-y bg-transparent px-3 py-2 text-sm placeholder:text-dim focus:outline-none"
        />
      ) : (
        <input type="hidden" name={name} value={value} />
      )}
      {tab === "preview" && (
        <div className="prose-tight px-3 py-2 text-sm text-ink-text">
          {value.trim() ? (
            <ReactMarkdown>{value}</ReactMarkdown>
          ) : (
            <p className="text-dim">Nothing to preview.</p>
          )}
        </div>
      )}
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-wider ${
        active
          ? "bg-brand-primary-950 text-brand-primary-glow"
          : "text-muted hover:text-ink-text"
      }`}
    >
      {children}
    </button>
  );
}
