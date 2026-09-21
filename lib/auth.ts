import { findStaff } from "@/lib/staff-record";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

const googleProvider =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      })
    : null;

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    ...(googleProvider ? [googleProvider] : []),
    CredentialsProvider({
      name: "Admin login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (typeof credentials?.email !== "string" || typeof credentials.password !== "string") return null;
        const email = credentials.email.toLowerCase().trim();
        const staff = await findStaff({ email });
        if (!staff) return null;
        const user = await prisma.user.findUnique({ where: { id: staff.id }, select: { passwordHash: true } });
        const storedPasswordMatches = Boolean(user?.passwordHash && await bcrypt.compare(credentials.password, user.passwordHash));
        const configuredPassword = process.env.ADMIN_PASSWORD ?? "";
        const provided = Buffer.from(credentials.password);
        const expected = Buffer.from(configuredPassword);
        const configuredOwnerMatches = staff.role === "OWNER"
          && email === process.env.ADMIN_EMAIL?.toLowerCase().trim()
          && configuredPassword.length >= 12
          && provided.length === expected.length
          && timingSafeEqual(provided, expected);
        if (!storedPasswordMatches && !configuredOwnerMatches) return null;
        return { id: staff.id, email: staff.email, name: staff.name };
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email || !["google", "credentials"].includes(account?.provider ?? "")) return false;
      if (account?.provider === "google" && (profile as { email_verified?: boolean } | undefined)?.email_verified !== true) return false;
      return Boolean(await findStaff({ email: user.email.toLowerCase().trim() }));
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { uiMode: true, organizationId: true, email: true }
        });
        token.uiMode = dbUser?.uiMode ?? "POWER";
        token.organizationId = dbUser?.organizationId ?? null;
        const superAdmins = (process.env.SUPER_ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "")
          .toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
        token.isSuperAdmin = superAdmins.includes((dbUser?.email ?? "").toLowerCase());
      }
      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: String(token.id) },
          select: { uiMode: true, organizationId: true }
        });
        if (dbUser) {
          token.uiMode = dbUser.uiMode;
          token.organizationId = dbUser.organizationId;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id);
        (session.user as Record<string, unknown>).uiMode = token.uiMode ?? "POWER";
        (session.user as Record<string, unknown>).organizationId = token.organizationId ?? null;
        (session.user as Record<string, unknown>).isSuperAdmin = token.isSuperAdmin ?? false;
      }
      return session;
    }
  }
};
