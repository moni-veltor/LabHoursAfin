import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM;
const enabled = Boolean(apiKey && from);

const resend = enabled ? new Resend(apiKey) : null;

export async function notifyNewInitiative(
  to: string[],
  initiative: { id: string; title: string; summary: string },
  baseUrl: string
) {
  if (!enabled || to.length === 0) return;
  await resend!.emails.send({
    from: from!,
    to,
    subject: `New Lab Hours initiative: ${initiative.title}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="margin:0 0 8px">${initiative.title}</h2>
        <p style="color:#444">${initiative.summary}</p>
        <p style="margin:24px 0">
          <a href="${baseUrl}/initiatives/${initiative.id}" style="background:#111;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">View initiative</a>
        </p>
      </div>
    `,
  });
}

export async function notifyUpdate(
  to: string[],
  initiative: { id: string; title: string },
  update: { body: string; authorName: string },
  baseUrl: string
) {
  if (!enabled || to.length === 0) return;
  await resend!.emails.send({
    from: from!,
    to,
    subject: `Update on ${initiative.title}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h3 style="margin:0 0 8px">${initiative.title}</h3>
        <p style="color:#666;font-size:13px">Update from ${update.authorName}</p>
        <div style="white-space:pre-wrap;color:#222;border-left:3px solid #ddd;padding:8px 12px;margin:16px 0">${update.body}</div>
        <p><a href="${baseUrl}/initiatives/${initiative.id}">View initiative</a></p>
      </div>
    `,
  });
}
