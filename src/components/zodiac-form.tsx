import { generateZodiacTeams } from "@/actions/hack";

export function ZodiacForm({ hackathonId }: { hackathonId: string }) {
  return (
    <form
      action={generateZodiacTeams}
      className="space-y-3 rounded-md border border-brand-accent/30 bg-brand-accent-950 p-3"
    >
      <input type="hidden" name="hackathonId" value={hackathonId} />
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand-accent">
        ✨ auto-form teams by zodiac
      </p>
      <p className="text-xs text-muted">
        Pulls every Afin employee with a known birthday and groups them by sign
        compatibility (or deliberate chaos).
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-wider text-muted">
            System
          </label>
          <select
            name="system"
            defaultValue="western"
            className="mt-1 w-full rounded-md border border-line bg-raised px-2 py-1 text-sm"
          >
            <option value="western">Western (sun sign)</option>
            <option value="chinese">Chinese (animal)</option>
          </select>
        </div>
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-wider text-muted">
            Mode
          </label>
          <select
            name="mode"
            defaultValue="compat"
            className="mt-1 w-full rounded-md border border-line bg-raised px-2 py-1 text-sm"
          >
            <option value="compat">Harmony · highest compatibility</option>
            <option value="chaos">Chaos · maximally clashing</option>
          </select>
        </div>
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-wider text-muted">
            Team size
          </label>
          <input
            name="size"
            type="number"
            min={2}
            max={10}
            defaultValue={4}
            className="mt-1 w-full rounded-md border border-line bg-raised px-2 py-1 text-sm"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" name="reset" className="h-4 w-4" />
        <span className="text-muted">
          Reset existing teams first (caution — deletes current teams)
        </span>
      </label>
      <button className="rounded-md bg-brand-accent px-3 py-1.5 text-sm font-medium text-ink hover:bg-brand-accent-dark">
        Generate teams →
      </button>
    </form>
  );
}
