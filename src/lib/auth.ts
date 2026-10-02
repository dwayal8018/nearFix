import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signInSchema } from "@/lib/validation";
import type { Role, AccountStatus } from "@prisma/client";

// Extend the session/JWT types to carry our custom fields.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      status: AccountStatus;
    } & DefaultSession["user"];
  }
  interface User {
    role: Role;
    status: AccountStatus;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    status: AccountStatus;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    Credentials({
      credentials: {
        phone: {},
        password: {},
      },
      authorize: async (credentials) => {
        const parsed = signInSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { phone, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { phone } });
        if (!user) return null;

        // Block suspended or banned accounts from signing in (Req 10.4).
        if (user.status === "SUSPENDED" || user.status === "BANNED") {
          return null;
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          name: user.name,
          role: user.role,
          status: user.status,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.status = user.status;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.status = token.status;
      }
      return session;
    },
  },
});
