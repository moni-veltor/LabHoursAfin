/** Remounts per navigation — the screen slides in like a pushed view. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="screen-in">{children}</div>;
}
