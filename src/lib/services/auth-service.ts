import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema, type RegisterInput } from "@/lib/validation";
import type { Role, AccountStatus } from "@prisma/client";

export type RegisterResult =
  | { ok: true; userId: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Register a new customer or provider.
 * - Validates input (name, Indian phone, password >= 8, role).
 * - Rejects duplicate phone numbers.
 * - Hashes the password with bcrypt.
 * - Providers start as PENDING (await admin verification); customers are ACTIVE.
 *   (Req 1.1, 1.2, 1.3, 2.5)
 */
export async function registerUser(input: unknown): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, phone, password, role } = parsed.data as RegisterInput;

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    return {
      ok: false,
      error: "This mobile number is already registered.",
      fieldErrors: { phone: ["This mobile number is already registered."] },
    };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // Providers must be verified by an admin before they are visible/active.
  const status: AccountStatus = role === "PROVIDER" ? "PENDING" : "ACTIVE";

  const user = await prisma.user.create({
    data: {
      name,
      phone,
      passwordHash,
      role: role as Role,
      status,
      // Create an empty provider profile shell for providers so they can
      // fill in details next; it starts as PENDING verification.
      ...(role === "PROVIDER"
        ? { providerProfile: { create: {} } }
        : {}),
    },
    select: { id: true },
  });

  return { ok: true, userId: user.id };
}
