import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function timeAgo(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const intervals: [number, string][] = [
    [60, "s"],
    [3600, "m"],
    [86400, "h"],
    [2592000, "d"],
    [31536000, "mo"],
  ];
  if (seconds < 60) return `${seconds}s ago`;
  for (let i = 1; i < intervals.length; i++) {
    if (seconds < intervals[i][0]) {
      return `${Math.floor(seconds / intervals[i - 1][0])}${intervals[i - 1][1]} ago`;
    }
  }
  return `${Math.floor(seconds / 31536000)}y ago`;
}
