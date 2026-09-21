import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { encode } from 'next-auth/jwt';
import { randomBytes } from 'node:crypto';
import { assertRestoreTarget } from './preservation.mjs';

const databaseUrl = process.env.PRESERVATION_TARGET_URL;
assertRestoreTarget(databaseUrl);
const origin = process.env.ACCESS_SMOKE_ORIGIN || 'http://localhost:3010';
const parsedOrigin = new URL(origin);
assert.ok(['localhost', '127.0.0.1'].includes(parsedOrigin.hostname), 'Smoke tests are local only.');
const secret = process.env.NEXTAUTH_SECRET;
assert.ok(secret, 'Supply the local server session secret.');
const db = new PrismaClient({ datasources: { db: { url: databaseUrl } }, log: [] });
const suffix = randomBytes(6).toString('hex');
const password = randomBytes(24).toString('hex');
const users = [];
const foreignOrg = `access-smoke-${suffix}`;
let foreignCreated = false;
let privateProfile;
const privateName = `AA_ACCESS_PRIVATE_${suffix}`;
const http = (url, cookie, options = {}) => fetch(origin + url, {
  ...options, redirect: 'manual', headers: { ...options.headers, ...(cookie ? { cookie } : {}) },
});

async function createUser(label, role, org, member = true) {
  const user = await db.user.create({ data: {
    email: `${label}-${suffix}@example.invalid`, role, organizationId: org,
    passwordHash: await bcrypt.hash(password, 10),
    ...(member ? { memberships: { create: { organizationId: org, role, status: 'ACTIVE' } } } : {}),
  } });
  users.push(user.id);
  return user;
}
async function oldSession(user) {
  return 'next-auth.session-token=' + await encode({ secret,
    token: { id: user.id, sub: user.id, email: user.email, organizationId: user.organizationId } });
}

try {
  const owner = await createUser('owner', 'OWNER', 'flipside-org');
  privateProfile = await db.profile.create({ data: { organizationId: 'flipside-org', profileName: privateName, profileType: 'HOMEOWNER' } });
  let cookies = [];
  function remember(response) {
    for (const value of response.headers.getSetCookie()) {
      const pair = value.split(';')[0], name = pair.split('=')[0];
      cookies = cookies.filter(cookie => !cookie.startsWith(name + '=')); cookies.push(pair);
    }
  }
  let response = await http('/api/auth/csrf'); remember(response);
  const { csrfToken } = await response.json();
  response = await http('/api/auth/callback/credentials', cookies.join('; '), {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ csrfToken, email: owner.email, password, callbackUrl: origin + '/home', json: 'true' }),
  }); remember(response);
  const cookie = cookies.join('; ');
  const session = await http('/api/auth/session', cookie).then(result => result.json());
  assert.equal(session.user?.id, owner.id);
  const job = await db.job.findFirst();
  const paths = ['/home', '/profiles', '/quotes', '/estimates', '/jobs', '/weekly-reports', '/invoices', '/settings'];
  if (job) paths.push(`/jobs/${job.id}/gallery`, `/jobs/${job.id}/logs`);
  for (const url of paths) {
    response = await http(url, cookie); assert.equal(response.status, 200, url);
    const text = await response.text();
    assert.ok(text.length > 100);
    if (url === '/profiles') assert.ok(text.includes(privateName), 'Authorized owner must see the private fixture.');
  }
  console.log(`PASS: real credentials session and ${paths.length} authorized workspace reads.`);
  const form = await http('/profiles/new', cookie).then(result => result.text());
  const actionId = /name="\$ACTION_ID_([a-f0-9]+)"/.exec(form)?.[1];
  assert.ok(actionId, 'Rendered profile form must expose its server action for denial testing.');
  assert.equal((await http('/api/waitlist/export')).status, 401);

  await db.organization.create({ data: { id: foreignOrg, name: 'Isolated foreign organization' } }); foreignCreated = true;
  const foreign = await createUser('foreign', 'OWNER', foreignOrg);
  const client = await createUser('client', 'CLIENT', 'flipside-org');
  const field = await createUser('field', 'FIELD_CREW', 'flipside-org');
  const legacy = await createUser('unapproved', 'ADMIN', 'flipside-org', false);
  await db.membership.updateMany({ where: { userId: owner.id }, data: { status: 'DISABLED' } });
  const profileCount = await db.profile.count();
  for (const user of [owner, foreign, client, field, legacy]) {
    const stale = await oldSession(user);
    response = await http('/profiles', stale);
    const deniedPage = await response.text();
    const redirectLocation = response.headers.get('location') || '';
    const streamedRedirect = deniedPage.includes('NEXT_REDIRECT;replace;/login?error=AccessDenied')
      || /http-equiv="refresh"[^>]+\/login\?error=AccessDenied/.test(deniedPage);
    assert.ok(([303, 307].includes(response.status) && redirectLocation.includes('/login'))
      || (response.status === 200 && streamedRedirect), `Page denial missing (status ${response.status}).`);
    assert.equal(deniedPage.includes(privateName), false, 'Denied streamed response must not contain private data.');
    for (const [url, method] of [['/api/waitlist/export', 'GET'], ['/api/files/upload', 'POST'], ['/api/ai/test', 'POST']]) {
      assert.equal((await http(url, stale, { method })).status, 403, `${url} must deny ${user.role}`);
    }
    response = await http('/profiles/new', stale, { method: 'POST',
      headers: { 'Next-Action': actionId, 'content-type': 'text/plain;charset=UTF-8', origin }, body: '[]' });
    assert.ok(response.status >= 400, 'Server action must refuse unauthorized session.');
  }
  assert.equal(await db.profile.count(), profileCount);
  console.log('PASS: revoked, foreign, client, field and unapproved signed sessions denied page/API/action access; no profile writes.');
} finally {
  // Only fixtures created by this invocation are removed, never source records.
  await db.user.deleteMany({ where: { id: { in: users } } });
  if (privateProfile) await db.profile.delete({ where: { id: privateProfile.id } });
  if (foreignCreated) await db.organization.delete({ where: { id: foreignOrg } });
  await db.$disconnect();
}
