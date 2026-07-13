import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  hackathons,
  hackIdeas,
  hackTeams,
  hackTeamMembers,
  hackDemos,
  hackVotes,
  hackAwards,
  hackJudges,
  hackParticipants,
  users,
} from "@/db/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { isAdmin } from "@/lib/admin";
import { UserChip } from "@/components/avatar";
import {
  pitchIdea,
  formTeam,
  joinTeam,
  leaveTeam,
  postDemo,
  voteDemo,
  setHackStage,
  awardWinner,
  applyAsJudge,
  withdrawAsJudge,
  drawJudges,
  clearJudgeDraw,
  joinHackathon,
  leaveHackathon,
} from "@/actions/hack";
import { JUDGE_POOL, JUDGE_PANEL, hackCapacity } from "@/lib/hack";
import { ZodiacForm } from "@/components/zodiac-form";

const STAGES = [
  "idea",
  "team_forming",
  "build",
  "demo",
  "voting",
  "done",
] as const;

export default async function HackathonPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ warn?: string; pool?: string; need?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const session = await auth();
  const me = session?.user as { id?: string; email?: string } | undefined;
  if (!me?.id) redirect(`/signin?callbackUrl=/hack/${slug}`);
  const adminAccess = isAdmin(me.email);

  const [hack] = await db
    .select()
    .from(hackathons)
    .where(eq(hackathons.slug, slug));
  if (!hack) notFound();

  const ideas = await db
    .select({
      i: hackIdeas,
      authorName: users.name,
      authorEmail: users.email,
      authorId: users.id,
    })
    .from(hackIdeas)
    .leftJoin(users, eq(users.id, hackIdeas.authorId))
    .where(eq(hackIdeas.hackathonId, hack.id))
    .orderBy(desc(hackIdeas.createdAt));

  const teams = await db
    .select()
    .from(hackTeams)
    .where(eq(hackTeams.hackathonId, hack.id))
    .orderBy(desc(hackTeams.createdAt));

  const teamIds = teams.map((t) => t.id);
  const members = teamIds.length
    ? await db
        .select({
          teamId: hackTeamMembers.teamId,
          userId: hackTeamMembers.userId,
          name: users.name,
          email: users.email,
        })
        .from(hackTeamMembers)
        .leftJoin(users, eq(users.id, hackTeamMembers.userId))
        .where(inArray(hackTeamMembers.teamId, teamIds))
    : [];

  const demos = teamIds.length
    ? await db
        .select()
        .from(hackDemos)
        .where(inArray(hackDemos.teamId, teamIds))
    : [];

  const demoIds = demos.map((d) => d.id);
  const votes = demoIds.length
    ? await db
        .select()
        .from(hackVotes)
        .where(inArray(hackVotes.demoId, demoIds))
    : [];

  const awards = await db
    .select()
    .from(hackAwards)
    .where(eq(hackAwards.hackathonId, hack.id));

  const participants = await db
    .select({
      userId: hackParticipants.userId,
      name: users.name,
      email: users.email,
    })
    .from(hackParticipants)
    .leftJoin(users, eq(users.id, hackParticipants.userId))
    .where(eq(hackParticipants.hackathonId, hack.id))
    .orderBy(hackParticipants.createdAt);
  const iAmParticipant = participants.some((p) => p.userId === me.id);
  const hackCap = hackCapacity(hack.teamCapacity);
  const hackFull = participants.length >= hackCap;

  const judges = await db
    .select({
      userId: hackJudges.userId,
      selected: hackJudges.selected,
      name: users.name,
      email: users.email,
    })
    .from(hackJudges)
    .leftJoin(users, eq(users.id, hackJudges.userId))
    .where(eq(hackJudges.hackathonId, hack.id))
    .orderBy(hackJudges.createdAt);
  const myJudge = judges.find((j) => j.userId === me.id);
  const sharks = judges.filter((j) => j.selected);
  const judgesDrawn = sharks.length > 0;
  const judgePoolFull = judges.length >= JUDGE_POOL;

  const memberByTeam = new Map<string, typeof members>();
  for (const m of members) {
    if (!memberByTeam.has(m.teamId)) memberByTeam.set(m.teamId, []);
    memberByTeam.get(m.teamId)!.push(m);
  }

  const voteCount = new Map<string, number>();
  const myVotes = new Set<string>();
  for (const v of votes) {
    voteCount.set(v.demoId + ":" + v.category, (voteCount.get(v.demoId + ":" + v.category) ?? 0) + 1);
    if (v.userId === me.id) myVotes.add(v.demoId + ":" + v.category);
  }

  const myMemberships = new Set(
    members.filter((m) => m.userId === me.id).map((m) => m.teamId)
  );
  // A person can't be both a competitor and a judge in the same hackathon.
  const iAmOnATeam = myMemberships.size > 0;
  const iAmCompeting = iAmParticipant || iAmOnATeam;
  const iAmAJudge = !!myJudge;

  return (
    <div className="space-y-8">
      {sp.warn === "not-enough-signs" && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-rose-300">
            ⚠ auto-form skipped
          </p>
          <p className="mt-1">
            Couldn't auto-form teams: only {sp.pool ?? "0"} people with a known
            birthday available, need at least {sp.need ?? "8"} for the chosen
            team size. Falling back to the normal idea-pitch flow — you can run
            zodiac team-builder later from the admin section.
          </p>
        </div>
      )}
      <Hero hack={hack} adminAccess={adminAccess} />

      {hack.theme && (
        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            theme
          </h2>
          <p className="mt-2 text-lg text-ink-text">{hack.theme}</p>
        </section>
      )}

      {(hack.description || hack.prizes || hack.tracks) && (
        <section className="grid gap-3 sm:grid-cols-3">
          {hack.description && (
            <Card title="About" body={hack.description} />
          )}
          {hack.prizes && <Card title="Prizes" body={hack.prizes} />}
          {hack.tracks && <Card title="Tracks" body={hack.tracks} />}
        </section>
      )}

      <section className="rounded-xl border border-brand-accent/30 bg-surface p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            🙌 Competitors
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-wider text-dim">
            {participants.length}/{hackCap} signed up · two teams of{" "}
            {hack.teamCapacity}
          </span>
        </div>
        {participants.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {participants.map((p) => (
              <li
                key={p.userId}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-raised px-3 py-1 text-sm text-ink-text"
              >
                <UserChip id={p.userId} name={p.name} email={p.email} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-dim">
            No one signed up yet. Be the first to jump in.
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {iAmParticipant ? (
            <form
              action={async () => {
                "use server";
                await leaveHackathon(hack.id);
              }}
            >
              <button className="rounded-md border border-line bg-raised px-3 py-1.5 text-sm text-muted hover:text-ink-text">
                You're in · leave hackathon
              </button>
            </form>
          ) : iAmAJudge ? (
            <span className="rounded-md border border-line bg-raised px-3 py-1.5 text-sm text-dim">
              You signed up to judge — you can't also compete.
            </span>
          ) : hackFull ? (
            <span className="rounded-md border border-line bg-raised px-3 py-1.5 text-sm text-dim">
              Hackathon is full ({hackCap}/{hackCap})
            </span>
          ) : hack.stage === "done" ? (
            <span className="rounded-md border border-line bg-raised px-3 py-1.5 text-sm text-dim">
              This hackathon has wrapped up.
            </span>
          ) : (
            <form
              action={async () => {
                "use server";
                await joinHackathon(hack.id);
              }}
            >
              <button className="rounded-md bg-brand-accent px-3 py-1.5 text-sm font-medium text-ink shadow-glow-accent hover:bg-brand-accent-dark">
                🙌 Count me in
              </button>
            </form>
          )}
          {iAmParticipant && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-dim">
              {hack.stage === "team_forming"
                ? "Now join or form a team below."
                : "Teams form when the hackathon moves to team-forming."}
            </span>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-line bg-surface p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            🦈 Shark Tank judges
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-wider text-dim">
            {judges.length}/{JUDGE_POOL} signed up · {JUDGE_PANEL} judge
          </span>
        </div>

        {judgesDrawn ? (
          <>
            <p className="mt-3 text-sm text-muted">
              The panel is set — meet your {sharks.length} shark
              {sharks.length === 1 ? "" : "s"}:
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {sharks.map((j) => (
                <li
                  key={j.userId}
                  className="inline-flex items-center gap-1.5 rounded-full border border-brand-accent/40 bg-brand-accent-950 px-3 py-1 text-sm text-brand-accent"
                >
                  <span>🦈</span>
                  <UserChip id={j.userId} name={j.name} email={j.email} />
                </li>
              ))}
            </ul>
            {judges.length > sharks.length && (
              <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-dim">
                Not drawn this time:{" "}
                {judges
                  .filter((j) => !j.selected)
                  .map((j) => j.name ?? j.email)
                  .join(", ")}
              </p>
            )}
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted">
              Fancy grilling the teams? Put your name in. When sign-ups close, an
              admin draws {JUDGE_PANEL} judges at random from the pool.
            </p>
            {judges.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {judges.map((j) => (
                  <li
                    key={j.userId}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-raised px-3 py-1 text-sm text-ink-text"
                  >
                    <UserChip id={j.userId} name={j.name} email={j.email} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-dim">
                No judges yet. Be the first to volunteer.
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {myJudge ? (
                <form
                  action={async () => {
                    "use server";
                    await withdrawAsJudge(hack.id);
                  }}
                >
                  <button className="rounded-md border border-line bg-raised px-3 py-1.5 text-sm text-muted hover:text-ink-text">
                    You're in the pool · withdraw
                  </button>
                </form>
              ) : iAmCompeting ? (
                <span className="rounded-md border border-line bg-raised px-3 py-1.5 text-sm text-dim">
                  You're competing in this hackathon — judges can't also compete.
                </span>
              ) : judgePoolFull ? (
                <span className="rounded-md border border-line bg-raised px-3 py-1.5 text-sm text-dim">
                  Judge pool is full ({JUDGE_POOL}/{JUDGE_POOL})
                </span>
              ) : (
                <form
                  action={async () => {
                    "use server";
                    await applyAsJudge(hack.id);
                  }}
                >
                  <button className="rounded-md bg-brand-accent px-3 py-1.5 text-sm font-medium text-ink shadow-glow-accent hover:bg-brand-accent-dark">
                    🙋 Apply to be a judge
                  </button>
                </form>
              )}
            </div>
          </>
        )}

        {adminAccess && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand-accent">
              Admin
            </span>
            <form
              action={async () => {
                "use server";
                await drawJudges(hack.id);
              }}
            >
              <button
                disabled={judges.length === 0}
                className="rounded-md border border-brand-accent/40 bg-brand-accent-950 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-brand-accent hover:bg-brand-accent hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                🦈 {judgesDrawn ? "Re-draw" : "Draw"} {JUDGE_PANEL} judges
              </button>
            </form>
            {judgesDrawn && (
              <form
                action={async () => {
                  "use server";
                  await clearJudgeDraw(hack.id);
                }}
              >
                <button className="rounded-md border border-line bg-raised px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-muted hover:text-ink-text">
                  Clear draw
                </button>
              </form>
            )}
          </div>
        )}
      </section>

      {(hack.stage === "idea" || hack.stage === "team_forming") && (
        <section>
          <h2 className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            <span>Idea pitches · {ideas.length}</span>
          </h2>
          {hack.stage === "idea" && (
            <form
              action={pitchIdea}
              className="mb-4 space-y-2 rounded-xl border border-line bg-surface p-4"
            >
              <input type="hidden" name="hackathonId" value={hack.id} />
              <input
                name="title"
                required
                placeholder="A one-line idea — what you'd build"
                className="w-full rounded-md border border-line bg-raised px-3 py-2 text-sm placeholder:text-dim focus:border-brand-accent focus:outline-none"
              />
              <textarea
                name="body"
                rows={3}
                placeholder="Optional: a few sentences on why."
                className="w-full resize-y rounded-md border border-line bg-raised px-3 py-2 text-sm placeholder:text-dim focus:border-brand-accent focus:outline-none"
              />
              <div className="flex justify-end">
                <button className="rounded-md bg-brand-accent px-3 py-1.5 text-sm font-medium text-ink shadow-glow-accent hover:bg-brand-accent-dark">
                  Pitch it
                </button>
              </div>
            </form>
          )}
          <ul className="grid gap-3 sm:grid-cols-2">
            {ideas.length === 0 && (
              <li className="rounded-xl border border-dashed border-line bg-surface p-5 text-center text-sm text-muted sm:col-span-2">
                No pitches yet. Be the first.
              </li>
            )}
            {ideas.map(({ i, authorName, authorEmail, authorId }) => (
              <li
                key={i.id}
                className="rounded-xl border border-line bg-surface p-4"
              >
                <p className="font-medium text-ink-text">{i.title}</p>
                {i.body && (
                  <p className="mt-1 text-sm text-muted">{i.body}</p>
                )}
                <p className="mt-3 text-xs">
                  <UserChip
                    id={authorId}
                    name={authorName}
                    email={authorEmail}
                    size={16}
                  />
                </p>
                {hack.stage === "team_forming" && !i.teamId && !iAmAJudge && (
                  <form action={formTeam} className="mt-3 flex gap-2">
                    <input type="hidden" name="hackathonId" value={hack.id} />
                    <input type="hidden" name="ideaId" value={i.id} />
                    <input
                      name="name"
                      required
                      placeholder="Team name"
                      className="flex-1 rounded-md border border-line bg-raised px-2 py-1 text-sm placeholder:text-dim focus:border-brand-accent focus:outline-none"
                    />
                    <button className="rounded-md bg-brand-accent px-2 py-1 text-xs font-medium text-ink hover:bg-brand-accent-dark">
                      Lead this idea →
                    </button>
                  </form>
                )}
                {i.teamId && (
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-brand-success">
                    ✓ team formed
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {(hack.stage === "team_forming" ||
        hack.stage === "build" ||
        hack.stage === "demo" ||
        hack.stage === "voting" ||
        hack.stage === "done") && (
        <section>
          <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            Teams · {teams.length}
          </h2>
          {hack.stage === "team_forming" && iAmAJudge && (
            <p className="mb-4 rounded-xl border border-dashed border-line bg-surface p-4 text-sm text-dim">
              You signed up as a judge — you can't also compete on a team. Withdraw
              from the judge pool above if you'd rather build.
            </p>
          )}
          {hack.stage === "team_forming" && !iAmAJudge && (
            <form
              action={formTeam}
              className="mb-4 space-y-2 rounded-xl border border-line bg-surface p-4"
            >
              <input type="hidden" name="hackathonId" value={hack.id} />
              <input
                name="name"
                required
                placeholder="Form a new team — name it"
                className="w-full rounded-md border border-line bg-raised px-3 py-2 text-sm placeholder:text-dim focus:border-brand-accent focus:outline-none"
              />
              <input
                name="blurb"
                placeholder="What you'll work on (one line)"
                className="w-full rounded-md border border-line bg-raised px-3 py-2 text-sm placeholder:text-dim focus:border-brand-accent focus:outline-none"
              />
              <div className="flex justify-end">
                <button className="rounded-md bg-brand-accent px-3 py-1.5 text-sm font-medium text-ink hover:bg-brand-accent-dark">
                  Start a team
                </button>
              </div>
            </form>
          )}
          <ul className="grid gap-3 sm:grid-cols-2">
            {teams.map((t) => {
              const teamMembers = memberByTeam.get(t.id) ?? [];
              const demo = demos.find((d) => d.teamId === t.id);
              const im = myMemberships.has(t.id);
              const full = teamMembers.length >= hack.teamCapacity;
              return (
                <li
                  key={t.id}
                  className="rounded-xl border border-line bg-surface p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-ink-text">{t.name}</p>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-dim">
                      {teamMembers.length}/{hack.teamCapacity}
                    </span>
                  </div>
                  {t.blurb && (
                    <p className="mt-1 text-sm text-muted">{t.blurb}</p>
                  )}
                  <ul className="mt-3 flex flex-wrap gap-1.5 text-xs">
                    {teamMembers.map((m) => (
                      <li key={m.userId}>
                        <UserChip
                          id={m.userId}
                          name={m.name}
                          email={m.email}
                          size={16}
                        />
                      </li>
                    ))}
                  </ul>
                  {hack.stage === "team_forming" && (
                    <div className="mt-3 flex gap-2">
                      {im ? (
                        <form
                          action={async () => {
                            "use server";
                            await leaveTeam(t.id);
                          }}
                        >
                          <button className="rounded-md border border-line bg-raised px-2 py-1 text-xs hover:bg-line">
                            Leave
                          </button>
                        </form>
                      ) : iAmAJudge ? (
                        <span className="rounded-md border border-line bg-raised px-2 py-1 text-xs text-dim">
                          Judging — can't join
                        </span>
                      ) : (
                        <form
                          action={async () => {
                            "use server";
                            await joinTeam(t.id);
                          }}
                        >
                          <button
                            disabled={full}
                            className="rounded-md bg-brand-accent px-2 py-1 text-xs font-medium text-ink hover:bg-brand-accent-dark disabled:opacity-50"
                          >
                            {full ? "Full" : "Join team"}
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                  {hack.stage === "demo" &&
                    im &&
                    t.leaderId === me.id &&
                    !demo && (
                      <form
                        action={postDemo}
                        className="mt-3 space-y-2 rounded-md border border-brand-accent/30 bg-brand-accent-950 p-3"
                      >
                        <input type="hidden" name="teamId" value={t.id} />
                        <textarea
                          name="body"
                          rows={3}
                          required
                          placeholder="Demo write-up — what did you build?"
                          className="w-full resize-y rounded-md border border-brand-accent/30 bg-surface px-2 py-1 text-sm focus:border-brand-accent focus:outline-none"
                        />
                        <textarea
                          name="links"
                          rows={2}
                          placeholder="Links (one per line)"
                          className="w-full resize-y rounded-md border border-brand-accent/30 bg-surface px-2 py-1 text-sm focus:border-brand-accent focus:outline-none"
                        />
                        <button className="rounded-md bg-brand-accent px-2 py-1 text-xs font-medium text-ink hover:bg-brand-accent-dark">
                          Submit demo
                        </button>
                      </form>
                    )}
                  {demo && (
                    <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-brand-success">
                      ✓ demo submitted
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {(hack.stage === "voting" || hack.stage === "done") && demos.length > 0 && (
        <section>
          <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            Demos & voting
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {demos.map((d) => {
              const team = teams.find((t) => t.id === d.teamId)!;
              const links = (d.links ?? "")
                .split(/\n+/)
                .map((s) => s.trim())
                .filter((s) => s.startsWith("http"));
              return (
                <li
                  key={d.id}
                  className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4"
                >
                  <p className="font-semibold tracking-tight text-ink-text">
                    {team?.name}
                  </p>
                  <p className="text-sm text-muted line-clamp-4">{d.body}</p>
                  {links.length > 0 && (
                    <ul className="space-y-1">
                      {links.slice(0, 4).map((l) => (
                        <li key={l}>
                          <a
                            href={l}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-[11px] text-brand-accent hover:underline"
                          >
                            {new URL(l).hostname}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                  {hack.stage === "voting" && (
                    <div className="mt-auto flex flex-wrap gap-1.5">
                      {(["build", "useful", "wildcard", "people"] as const).map(
                        (cat) => {
                          const key = d.id + ":" + cat;
                          const mine = myVotes.has(key);
                          const count = voteCount.get(key) ?? 0;
                          return (
                            <form
                              key={cat}
                              action={async () => {
                                "use server";
                                await voteDemo(d.id, cat);
                              }}
                            >
                              <button
                                className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                                  mine
                                    ? "border-brand-accent bg-brand-accent text-ink shadow-glow-accent"
                                    : "border-line bg-raised text-muted hover:border-brand-accent/40 hover:text-brand-accent"
                                }`}
                              >
                                {cat} {count > 0 && count}
                              </button>
                            </form>
                          );
                        }
                      )}
                    </div>
                  )}
                  {hack.stage === "done" &&
                    awards
                      .filter((a) => a.demoId === d.id)
                      .map((a) => (
                        <span
                          key={a.id}
                          className="inline-flex items-center gap-1 rounded-full border border-brand-accent/40 bg-brand-accent-950 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-brand-accent"
                        >
                          🏆 {a.kind}
                        </span>
                      ))}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {adminAccess && (
        <section className="rounded-xl border border-brand-accent/30 bg-brand-accent-950 p-4">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand-accent">
            Admin · stage
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {STAGES.map((s) => (
              <form
                key={s}
                action={async () => {
                  "use server";
                  await setHackStage(hack.id, s);
                }}
              >
                <button
                  className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-wider ${
                    hack.stage === s
                      ? "bg-brand-accent text-ink"
                      : "border border-line bg-raised text-muted hover:text-brand-accent"
                  }`}
                >
                  {s.replace("_", " ")}
                </button>
              </form>
            ))}
          </div>
          {(hack.stage === "idea" || hack.stage === "team_forming") && (
            <div className="mt-4 border-t border-brand-accent/30 pt-4">
              <ZodiacForm hackathonId={hack.id} />
            </div>
          )}
          {hack.stage === "voting" && demos.length > 0 && (
            <form
              action={awardWinner}
              className="mt-4 flex flex-wrap items-end gap-2 border-t border-brand-accent/30 pt-3"
            >
              <input type="hidden" name="hackathonId" value={hack.id} />
              <select
                name="demoId"
                required
                className="rounded-md border border-line bg-raised px-2 py-1 text-sm"
              >
                {demos.map((d) => {
                  const team = teams.find((t) => t.id === d.teamId);
                  return (
                    <option key={d.id} value={d.id}>
                      {team?.name}
                    </option>
                  );
                })}
              </select>
              <input
                name="kind"
                required
                placeholder="Best Build"
                className="rounded-md border border-line bg-raised px-2 py-1 text-sm"
              />
              <input
                name="note"
                placeholder="Note (optional)"
                className="rounded-md border border-line bg-raised px-2 py-1 text-sm"
              />
              <button className="rounded-md bg-brand-accent px-3 py-1 text-xs font-medium text-ink hover:bg-brand-accent-dark">
                🏆 Award
              </button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}

function Hero({ hack, adminAccess }: { hack: any; adminAccess: boolean }) {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-brand-accent/30 bg-surface">
      <div className="lh-mesh absolute inset-0 opacity-90" />
      <div className="lh-grid-bg absolute inset-0 opacity-30" />
      <div className="relative px-5 py-8 sm:px-7 sm:py-10">
        <Link
          href="/hack"
          className="font-mono text-[10px] uppercase tracking-wider text-dim hover:text-ink-text"
        >
          ← hack arena
        </Link>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-brand-accent/40 bg-brand-accent-950 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-brand-accent">
          🔥 {hack.stage.replace("_", " ")}
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          {hack.name}
        </h1>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-dim">
          {hack.startsAt
            ? `📅 ${new Date(hack.startsAt).toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              })}`
            : "One-day event · date set once sign-ups close"}
        </p>
      </div>
    </header>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
        {title}
      </h3>
      <p className="mt-2 whitespace-pre-wrap text-sm text-ink-text">{body}</p>
    </div>
  );
}
