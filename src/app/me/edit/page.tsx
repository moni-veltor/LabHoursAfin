import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { updateProfile } from "@/actions/profile";
import Link from "next/link";

export default async function EditProfilePage() {
  const session = await auth();
  const meSess = session?.user as { id?: string } | undefined;
  if (!meSess?.id) redirect("/signin?callbackUrl=/me/edit");
  const [user] = await db.select().from(users).where(eq(users.id, meSess.id));
  if (!user) redirect("/signin");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Edit profile</h1>
        <Link
          href="/me"
          className="rounded-md border border-line bg-raised px-3 py-1.5 text-sm text-muted hover:text-ink-text"
        >
          ← Back
        </Link>
      </div>
      <form action={updateProfile} className="space-y-4 rounded-xl border border-line bg-surface p-5">
        <Field label="Display name" name="name" defaultValue={user.name ?? ""} />
        <Field
          label="Pronouns"
          name="pronouns"
          defaultValue={user.pronouns ?? ""}
          placeholder="she/her, they/them, etc."
        />
        <Field
          label="Hobbies (comma-separated)"
          name="hobbies"
          defaultValue={user.hobbies ?? ""}
          placeholder="climbing, reading, board games"
        />
        <Field
          label="Bio"
          name="bio"
          defaultValue={user.bio ?? ""}
          textarea
          rows={3}
          placeholder="A line or two about you."
        />
        <Field
          label="Ask me about"
          name="askMeAbout"
          defaultValue={user.askMeAbout ?? ""}
          placeholder="things you're happy to talk shop on"
        />
        <button className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-glow hover:bg-brand-primary-dark">
          Save changes
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  textarea,
  rows = 2,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  textarea?: boolean;
  rows?: number;
}) {
  const cls =
    "mt-1 w-full rounded-md border border-line bg-raised px-3 py-2 text-sm placeholder:text-dim focus:border-brand-primary focus:outline-none";
  return (
    <div>
      <label className="block font-mono text-[11px] uppercase tracking-wider text-muted">
        {label}
      </label>
      {textarea ? (
        <textarea
          name={name}
          rows={rows}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className={cls}
        />
      ) : (
        <input
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className={cls}
        />
      )}
    </div>
  );
}
