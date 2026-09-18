/**
 * The tech-team hub, where People lives now.
 *
 * Everything about people moved there: the directory, profiles, birthdays,
 * and access itself — who may sign in, and as which Labhours role. Labhours
 * keeps no people pages and no sign-in of its own; /api/sso applies what the
 * hub decided.
 *
 * Same variable and fallback the rail's hub link already uses.
 */
export const HUB_URL = process.env.NEXT_PUBLIC_HUB_URL ?? "https://afin-tech-team.vercel.app";

export const hub = (path: string) => new URL(path, HUB_URL).toString();
