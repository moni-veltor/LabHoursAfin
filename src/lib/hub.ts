/**
 * The tech-team hub, where People lives now.
 *
 * The directory, profiles and "edit my profile" moved there: who somebody is
 * describes the person, not their Labhours, and the hub is where the rest of
 * the estate looks them up. Labhours keeps its own accounts — roles, PINs,
 * removal — on /admin/people.
 *
 * Same variable and fallback the rail's hub link already uses.
 */
export const HUB_URL = process.env.NEXT_PUBLIC_HUB_URL ?? "https://afin-tech-team.vercel.app";

export const hub = (path: string) => new URL(path, HUB_URL).toString();
