import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;
const enabled = Boolean(apiKey);
const client = enabled ? new Anthropic({ apiKey }) : null;

export const aiEnabled = enabled;

const MODEL = "claude-haiku-4-5-20251001";

async function callText(system: string, user: string, maxTokens = 700) {
  if (!client) {
    return null;
  }
  const r = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });
  const block = r.content.find((b) => b.type === "text") as
    | { type: "text"; text: string }
    | undefined;
  return block?.text ?? null;
}

export async function aiDraftInitiative(input: {
  pitch: string;
  category?: string;
}) {
  const fallback = {
    title: input.pitch.slice(0, 80),
    summary: "Auto-generated draft. AI is not configured (set ANTHROPIC_API_KEY to enable).",
    outcomes: "",
    body: "",
    timeCommitment: "",
    tags: "",
    format: "open",
    difficulty: "any",
  };
  if (!client) return fallback;

  const system = `You help tech-team members draft Lab Hours initiatives at a company called Afin Bank. Lab Hours is an internal platform where the tech team posts learning, building, and exploration initiatives anyone in the company can join.
Reply in strict JSON with these fields:
- title (string, <= 100 chars, punchy and active)
- summary (string, 1-2 sentences, what people see in the list)
- outcomes (string, 2-3 short lines, what participants will learn or produce)
- body (string, markdown, optional sections)
- timeCommitment (string, e.g. "~2 hrs/week for 4 weeks")
- tags (string, comma-separated kebab-case slugs)
- format (one of: open, workshop, pairing, sessions, reading_club, async)
- difficulty (one of: any, beginner, intermediate, advanced)
No prose outside JSON. No code fences.`;
  const user = `Pitch: ${input.pitch}${input.category ? `\nCategory: ${input.category}` : ""}`;
  const text = await callText(system, user, 900);
  if (!text) return fallback;
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    const json = text.slice(start, end + 1);
    const parsed = JSON.parse(json);
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

export async function aiSummariseUpdates(input: {
  title: string;
  summary: string;
  updates: { author: string; body: string; at: string }[];
}) {
  if (!client) return null;
  if (input.updates.length === 0) return "No updates yet.";
  const system =
    "You write concise weekly status summaries for a Lab Hours initiative. One paragraph (~70 words). Plain text. Highlight what shipped or progressed; flag any risks or blockers if present.";
  const user = `Initiative: ${input.title}\nSummary: ${input.summary}\n\nUpdates (newest first):\n${input.updates
    .map((u) => `- [${u.at}] ${u.author}: ${u.body}`)
    .join("\n")}`;
  return await callText(system, user, 400);
}

export async function aiDraftOutcome(input: {
  title: string;
  outcomes: string | null;
  updates: { author: string; body: string; at: string }[];
}) {
  if (!client) return { body: "", links: "" };
  const system = `You draft outcome write-ups for completed Lab Hours initiatives. Return strict JSON:
- body (string, markdown, 3-6 short lines, what was shipped/learned, references the original outcomes goals if provided)
- links (string, newline-separated URLs found in the updates, or empty string)
No prose outside JSON. No code fences.`;
  const user = `Title: ${input.title}\nOriginal outcomes: ${input.outcomes ?? "(not set)"}\n\nUpdates:\n${input.updates
    .map((u) => `- [${u.at}] ${u.author}: ${u.body}`)
    .join("\n")}`;
  const text = await callText(system, user, 600);
  if (!text) return { body: "", links: "" };
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return { body: text, links: "" };
  }
}
