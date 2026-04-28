import { toggleInterest } from "@/actions/interest";

export function InterestButton({
  initiativeId,
  isInterested,
  signedIn,
}: {
  initiativeId: string;
  isInterested: boolean;
  signedIn: boolean;
}) {
  if (!signedIn) return null;
  return (
    <form
      action={async () => {
        "use server";
        await toggleInterest(initiativeId);
      }}
    >
      <button
        className={`w-full rounded-md border px-3 py-2 text-sm transition ${
          isInterested
            ? "border-brand-accent/40 bg-brand-accent-950 text-brand-accent"
            : "border-line bg-raised text-muted hover:border-brand-accent/40 hover:text-brand-accent"
        }`}
      >
        {isInterested ? "★ Interested · saved" : "☆ I'm interested"}
      </button>
    </form>
  );
}
