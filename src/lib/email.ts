import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendMagicLink(to: string, url: string) {
  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject: "Sign in to Lab Board",
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="margin:0 0 16px">Sign in to Lab Board</h2>
        <p style="color:#444">Click below to sign in. This link expires in 24 hours.</p>
        <p style="margin:24px 0">
          <a href="${url}" style="background:#111;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">Sign in</a>
        </p>
        <p style="color:#888;font-size:12px">If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  });
}

export async function notifyNewInitiative(
  to: string[],
  initiative: { id: string; title: string; summary: string },
  baseUrl: string
) {
  if (to.length === 0) return;
  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject: `New Lab Board initiative: ${initiative.title}`,
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
  if (to.length === 0) return;
  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
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
