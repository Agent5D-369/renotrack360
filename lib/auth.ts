import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Admin login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase();
        const password = credentials?.password;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (user?.passwordHash && (await bcrypt.compare(password, user.passwordHash))) {
          return { id: user.id, email: user.email, name: user.name };
        }

        if (
          email === process.env.ADMIN_EMAIL?.toLowerCase() &&
          password === process.env.ADMIN_PASSWORD
        ) {
          const org = await prisma.organization.upsert({
            where: { id: "flipside-org" },
            update: {},
            create: { id: "flipside-org", name: "My Organization" }
          });
          const created = await prisma.user.upsert({
            where: { email },
            update: { organizationId: org.id },
            create: {
              email,
              name: "Owner",
              role: "OWNER",
              organizationId: org.id,
              passwordHash: await bcrypt.hash(password, 10)
            }
          });
          return { id: created.id, email: created.email, name: created.name };
        }

        return null;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { uiMode: true, organizationId: true, email: true }
        });
        token.uiMode = dbUser?.uiMode ?? "POWER";
        token.organizationId = dbUser?.organizationId ?? null;
        // Super admin: ADMIN_EMAIL env var holders get platform-wide access
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
