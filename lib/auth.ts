import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
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
    async signIn({ user, account }) {
      // For OAuth sign-ins, provision an org if this is a new user
      if (account?.provider === "google" && user.email) {
        const existing = await prisma.user.findUnique({ where: { email: user.email } });
        if (!existing?.organizationId) {
          const domain = user.email.split("@")[1] ?? "mycompany";
          const orgName = domain.split(".")[0] ?? "My Organization";
          const org = await prisma.organization.create({
            data: { name: orgName.charAt(0).toUpperCase() + orgName.slice(1) }
          });
          await prisma.user.update({
            where: { email: user.email },
            data: { organizationId: org.id, role: "OWNER" }
          });
          await prisma.membership.create({
            data: {
              userId: existing?.id ?? user.id!,
              organizationId: org.id,
              role: "OWNER",
              status: "ACTIVE",
              acceptedAt: new Date()
            }
          }).catch(() => null);
          await prisma.subscription.create({
            data: {
              organizationId: org.id,
              planTier: "PRO",
              status: "TRIALING",
              trialEndsAt: new Date(Date.now() + 14 * 86400000),
              activeJobLimit: 25,
              monthlyEstimateLimit: 250,
              userLimit: 5
            }
          }).catch(() => null);
        }
      }
      return true;
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
