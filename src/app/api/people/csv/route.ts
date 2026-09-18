import { NextResponse } from "next/server";
import { hub } from "@/lib/hub";

/** The directory export moved with the directory; the hub checks it is an admin asking. */
export function GET() {
  return NextResponse.redirect(hub("/people/export"), 308);
}
