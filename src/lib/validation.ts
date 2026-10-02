import { z } from "zod";

// Indian mobile number: 10 digits, starting 6-9. We store the bare 10 digits.
// Accepts optional +91 / 91 / 0 prefix and strips it.
export function normalizeIndianPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  let ten = digits;
  if (ten.length === 12 && ten.startsWith("91")) ten = ten.slice(2);
  else if (ten.length === 11 && ten.startsWith("0")) ten = ten.slice(1);
  if (/^[6-9]\d{9}$/.test(ten)) return ten;
  return null;
}

export const phoneSchema = z
  .string()
  .trim()
  .transform((val, ctx) => {
    const normalized = normalizeIndianPhone(val);
    if (!normalized) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid 10-digit Indian mobile number.",
      });
      return z.NEVER;
    }
    return normalized;
  });

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name."),
  phone: phoneSchema,
  password: passwordSchema,
  role: z.enum(["CUSTOMER", "PROVIDER"], {
    errorMap: () => ({ message: "Choose Customer or Service Provider." }),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const signInSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, "Enter your password."),
});
