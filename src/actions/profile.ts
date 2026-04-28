"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

const Schema = z.object({
  name: z.string().min(1).max(80).optional(),
  bio: z.string().max(280).optional(),
  askMeAbout: z.string().max(280).optional(),
  pronouns: z.string().max(40).optional(),
  hobbies: z.string().max(500).optional(),
});

export async function updateProfile(formData: FormData) {
  const me = await requireUser();
  const parsed = Schema.parse({
    name: (formData.get("name") as string) || undefined,
    bio: (formData.get("bio") as string) || undefined,
    askMeAbout: (formData.get("askMeAbout") as string) || undefined,
    pronouns: (formData.get("pronouns") as string) || undefined,
    hobbies: (formData.get("hobbies") as string) || undefined,
  });
  await db
    .update(users)
    .set({
      name: parsed.name,
      bio: parsed.bio ?? null,
      askMeAbout: parsed.askMeAbout ?? null,
      pronouns: parsed.pronouns ?? null,
      hobbies: parsed.hobbies ?? null,
    })
    .where(eq(users.id, me.id));
  revalidatePath(`/u/${me.id}`);
  revalidatePath("/me");
  revalidatePath("/me/portfolio");
}
