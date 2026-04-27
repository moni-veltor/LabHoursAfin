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
  targetType: "update" | "comment";
  targetId: string;
  initiativeId: string;
  counts: Counts;
  mine: MineSet;
  signedIn: boolean;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {REACTION_EMOJIS.map((e) => {
        const c = counts[e] ?? 0;
        const isMine = mine.has(e);
        return (
          <form
            key={e}
            action={async () => {
              "use server";
              if (!signedIn) return;
              await toggleReaction(targetType, targetId, e, initiativeId);
            }}
          >
            <button
              type="submit"
              disabled={!signedIn}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition ${
                isMine
                  ? "border-brand-primary bg-brand-primary text-white"
                  : c > 0
                  ? "border-stone-200 bg-stone-50 text-stone-700 hover:border-brand-primary/40"
                  : "border-transparent bg-transparent text-stone-400 hover:bg-brand-primary-50 hover:text-brand-primary"
              } ${!signedIn ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <span>{e}</span>
              {c > 0 && <span className="font-medium">{c}</span>}
            </button>
          </form>
        );
      })}
    </div>
  );
}
