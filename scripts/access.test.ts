import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import { randomBytes } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { hasStaffAccess } from "../lib/staff-policy";
import { findStaff } from "../lib/staff-record";
import { acceptStaffInvite, InviteAcceptanceError } from "../lib/invite-acceptance";
import { authOptions } from "../lib/auth";

const ownerId = "access-owner";
const ownerEmail = "owner@example.invalid";
const password = "isolated-access-test-password";
const owner = { id: ownerId, email: ownerEmail, organizationId: "flipside-org", role: "OWNER" };
const membership = { userId: ownerId, organizationId: "flipside-org", role: "OWNER", status: "ACTIVE" };

before(async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.pathname, "/flipside_migration_access");
  await prisma.organization.create({ data: { id: "flipside-org", name: "Access fixture" } });
  await prisma.organization.create({ data: { id: "foreign-org", name: "Foreign fixture" } });
  await prisma.user.create({ data: { ...owner, role: "OWNER", passwordHash: await bcrypt.hash(password, 10),
    memberships: { create: { organizationId: "flipside-org", role: "OWNER", status: "ACTIVE" } } } });
});
after(async () => { await prisma.$disconnect(); });

test("only current active Flipside management members satisfy staff policy", () => {
  assert.equal(hasStaffAccess(owner, membership), true);
  assert.equal(hasStaffAccess(null, membership), false);
  assert.equal(hasStaffAccess(owner, null), false);
  assert.equal(hasStaffAccess(owner, { ...membership, status: "DISABLED" }), false);
  assert.equal(hasStaffAccess(owner, { ...membership, status: "INVITED" }), false);
  assert.equal(hasStaffAccess({ ...owner, organizationId: "foreign-org" }, membership), false);
  assert.equal(hasStaffAccess(owner, { ...membership, organizationId: "foreign-org" }), false);
  assert.equal(hasStaffAccess(owner, { ...membership, userId: "someone-else" }), false);
  for (const role of ["FIELD_CREW", "CLIENT", "ESTIMATOR", "PROJECT_MANAGER"]) {
    assert.equal(hasStaffAccess({ ...owner, role }, { ...membership, role }), false);
  }
  assert.equal(hasStaffAccess({ ...owner, email: "demo@renotrack360.com" }, membership), false);
});

test("membership revocation is read from the database, not stale user role/JWT", async () => {
  assert.ok(await findStaff({ id: ownerId }));
  await prisma.membership.update({ where: { userId_organizationId: { userId: ownerId, organizationId: "flipside-org" } }, data: { status: "DISABLED" } });
  try { assert.equal(await findStaff({ id: ownerId }), null); }
  finally { await prisma.membership.update({ where: { userId_organizationId: { userId: ownerId, organizationId: "flipside-org" } }, data: { status: "ACTIVE" } }); }
});

test("Google sign-in admits the verified existing owner without tenant/subscription provisioning", async () => {
  const signIn = authOptions.callbacks!.signIn!;
  const input = { user: { id: ownerId, email: ownerEmail }, account: { provider: "google", type: "oauth", providerAccountId: "fixture" }, profile: { email_verified: true } };
  const counts = [await prisma.user.count(), await prisma.organization.count(), await prisma.subscription.count()];
  assert.equal(await signIn(input as never), true);
  assert.equal(await signIn({ ...input, profile: { email_verified: false } } as never), false);
  assert.equal(await signIn({ ...input, user: { id: "unknown", email: "unknown@example.invalid" } } as never), false);
  assert.deepEqual([await prisma.user.count(), await prisma.organization.count(), await prisma.subscription.count()], counts);
});

test("credentials require membership; configured existing-owner login is read-only and cannot bootstrap users", async () => {
  const provider = authOptions.providers.find(item => item.id === "credentials") as unknown as {
    options: { authorize: (input: { email: string; password: string }) => Promise<{ id: string } | null> }
  };
  assert.equal((await provider.options.authorize({ email: ownerEmail, password }))?.id, ownerId);
  assert.equal(await provider.options.authorize({ email: ownerEmail, password: "incorrect" }), null);
  const previousEmail = process.env.ADMIN_EMAIL, previousPassword = process.env.ADMIN_PASSWORD;
  const originalOwner = await prisma.user.findUniqueOrThrow({ where: { id: ownerId } });
  try {
    process.env.ADMIN_EMAIL = ownerEmail; process.env.ADMIN_PASSWORD = "different-configured-owner-password";
    assert.equal((await provider.options.authorize({ email: ownerEmail, password: process.env.ADMIN_PASSWORD }))?.id, ownerId);
    assert.deepEqual(await prisma.user.findUniqueOrThrow({ where: { id: ownerId } }), originalOwner);
    process.env.ADMIN_EMAIL = "bootstrap@example.invalid"; process.env.ADMIN_PASSWORD = password;
    assert.equal(await provider.options.authorize({ email: process.env.ADMIN_EMAIL, password }), null);
  }
  finally {
    if (previousEmail === undefined) delete process.env.ADMIN_EMAIL; else process.env.ADMIN_EMAIL = previousEmail;
    if (previousPassword === undefined) delete process.env.ADMIN_PASSWORD; else process.env.ADMIN_PASSWORD = previousPassword;
  }
  assert.equal(await prisma.user.findUnique({ where: { email: "bootstrap@example.invalid" } }), null);
});

async function invitation(email: string, data: Record<string, unknown> = {}) {
  return prisma.inviteToken.create({ data: {
    email, role: "ADMIN", organizationId: "flipside-org", invitedByUserId: ownerId,
    token: randomBytes(32).toString("hex"), expiresAt: new Date(Date.now() + 3600000), ...data,
  } });
}

test("existing-account invitation never changes password, name, role or organization", async () => {
  const invite = await invitation(ownerEmail);
  const before = await prisma.user.findUniqueOrThrow({ where: { id: ownerId } });
  await assert.rejects(() => acceptStaffInvite(prisma, { token: invite.token, name: "Overwrite attempt", password }),
    error => error instanceof InviteAcceptanceError && error.status === 409);
  assert.deepEqual(await prisma.user.findUniqueOrThrow({ where: { id: ownerId } }), before);
  assert.equal((await prisma.inviteToken.findUniqueOrThrow({ where: { id: invite.id } })).acceptedAt, null);
});

test("concurrent invite acceptance creates exactly one user and membership; replay refuses", async () => {
  const invite = await invitation("new-admin@example.invalid");
  const input = { token: invite.token, name: "New admin", password };
  const results = await Promise.allSettled([acceptStaffInvite(prisma, input), acceptStaffInvite(prisma, input)]);
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  const user = await prisma.user.findUniqueOrThrow({ where: { email: invite.email } });
  assert.equal(await prisma.membership.count({ where: { userId: user.id } }), 1);
  assert.ok(await findStaff({ id: user.id }));
  await assert.rejects(() => acceptStaffInvite(prisma, input), InviteAcceptanceError);
});

test("expired, used, foreign and unsupported-role invitations create no accounts", async () => {
  const count = await prisma.user.count();
  const variants = [{ expiresAt: new Date(0) }, { acceptedAt: new Date() }, { organizationId: "foreign-org" }, { role: "CLIENT" }];
  for (const [index, data] of variants.entries()) {
    const invite = await invitation(`denied-${index}@example.invalid`, data);
    await assert.rejects(() => acceptStaffInvite(prisma, { token: invite.token, name: "Denied", password }), InviteAcceptanceError);
  }
  assert.equal(await prisma.user.count(), count);
});

test("revoked inviter cannot grant a new membership", async () => {
  const invite = await invitation("revoked-inviter@example.invalid");
  await prisma.membership.updateMany({ where: { userId: ownerId }, data: { status: "DISABLED" } });
  try { await assert.rejects(() => acceptStaffInvite(prisma, { token: invite.token, name: "Denied", password }), InviteAcceptanceError); }
  finally { await prisma.membership.updateMany({ where: { userId: ownerId }, data: { status: "ACTIVE" } }); }
  assert.equal(await prisma.user.findUnique({ where: { email: invite.email } }), null);
});

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name).replaceAll("\\", "/");
    return entry.isDirectory() ? files(file) : [file];
  });
}

test("every staff entrypoint checks authorization before its body", () => {
  // Routes that are deliberately reachable without a session. Everything else under app/api must
  // begin with a staff denial; adding a name here is a deliberate decision, not a formality.
  const publicRoutes = new Set([
    "auth/[...nextauth]", "auth/forgot-password", "auth/reset-password", "approve/[token]", "approve/[token]/document",
    "review/[token]", "portal/[token]/request", "portal/[token]/reports/[id]", "stripe/webhook", "waitlist", "waitlist/stats",
    "internal/reset-demo", "invite/accept",
    // Health is a readiness probe for the deploy platform and any uptime monitor. It answers only
    // status, database reachability and a timestamp, never customer data, and never writes.
    "health",
  ]);
  const targets = ["app/actions.ts", ...files("app/(workspace)").filter(file => file.endsWith("page.tsx")),
    ...files("app/api").filter(file => file.endsWith("route.ts") && !publicRoutes.has(file.slice(8, -9)))];
  let checked = 0;
  for (const file of targets) {
    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    if (file === "app/actions.ts") assert.equal(source.statements[0].getText(source), '"use server";');
    const exports = source.statements.filter((node): node is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(node) && Boolean(node.body) && Boolean(node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)));
    assert.ok(exports.length, `Unreviewed entrypoint structure: ${file}`);
    for (const node of exports) {
      const first = node.body!.statements[0]?.getText(source);
      const expected = file === "app/actions.ts" ? "await requireStaff();" : file.endsWith("page.tsx")
        ? "await requireStaffPage();" : "const denied = await staffApiDenial();";
      const actorCheck = file === "app/actions.ts" ? "const actor = await requireStaff();" : "const actor = await requireStaffPage();";
      assert.ok(first === expected || (!file.endsWith("route.ts") && first === actorCheck), `Missing initial access check: ${file}/${node.name?.text}`);
      if (file.endsWith("route.ts")) assert.equal(node.body!.statements[1]?.getText(source), "if (denied) return denied;");
      checked++;
    }
  }
  assert.ok(checked >= 181);
});
