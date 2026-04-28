import { toggleReaction } from "@/actions/reactions";

export const REACTION_EMOJIS = ["🎉", "❤️", "👍", "🔥", "💡"] as const;

type Counts = Record<string, number>;
type MineSet = Set<string>;

export function Reactions({
  targetType,
  targetId,
  initiativeId,
  counts,
  mine,
  signedIn,
}: {
  targetType: "update" | "comment" | "outcome";
  targetId: string;
  initiativeId: string;
  counts: Counts;
  mine: MineSet;
  signedIn: boolean;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {REACTION_EMOJIS.map((e) => {
        const c = counts[e] ?? 0;
        const isMine = mine.has(e);
        return (
          <form
            key={e}
            action={async () => {
              "use server";
              if (!signedIn) return;
              await toggleReaction(targetType as any, targetId, e, initiativeId);
            }}
          >
            <button
              type="submit"
              disabled={!signedIn}
              aria-label={`React with ${e}${c > 0 ? `, currently ${c}` : ""}${
                isMine ? ", you reacted" : ""
              }`}
              aria-pressed={isMine}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition ${
                isMine
                  ? "border-brand-primary bg-brand-primary text-white shadow-glow"
                  : c > 0
                  ? "border-line bg-raised text-muted hover:border-brand-primary/40 hover:text-ink-text"
                  : "border-transparent bg-transparent text-dim hover:bg-raised hover:text-muted"
              } ${!signedIn ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <span>{e}</span>
              {c > 0 && <span className="font-mono font-medium">{c}</span>}
            </button>
          </form>
        );
      })}
    </div>
  );
}
