import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { randomBytes, createHash } from 'node:crypto';
import { writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { assertRestoreTarget } from './preservation.mjs';

const url = process.env.PRESERVATION_TARGET_URL;
assertRestoreTarget(url);
const origin = process.env.ACCESS_SMOKE_ORIGIN || 'http://localhost:3010';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const root = path.resolve(process.env.PRIVATE_MEDIA_ROOT);
assert.ok(root.startsWith(path.resolve('.preservation') + path.sep));
const db = new PrismaClient({ datasources: { db: { url } }, log: [] });
const suffix = randomBytes(8).toString('hex'), password = randomBytes(24).toString('hex');
const http = (route, cookie, options = {}) => fetch(origin + route, {
  ...options, redirect: 'manual', headers: { ...options.headers, ...(cookie ? { cookie } : {}) },
});
const anonymousDenied = response => assert.ok(response.status === 401
  || (response.status === 307 && ['/login', '/api/auth/signin'].includes(new URL(response.headers.get('location'), origin).pathname)));
try {
  const owner = await db.user.create({ data: { email: `media-http-${suffix}@example.invalid`,
    role: 'OWNER', organizationId: 'flipside-org', passwordHash: await bcrypt.hash(password, 10),
    memberships: { create: { organizationId: 'flipside-org', role: 'OWNER', status: 'ACTIVE' } } } });
  const profile = await db.profile.create({ data: { organizationId: 'flipside-org', profileName: `Media HTTP ${suffix}`, profileType: 'HOMEOWNER' } });
  let cookies = [];
  const remember = response => { for (const value of response.headers.getSetCookie()) {
    const pair = value.split(';')[0], name = pair.split('=')[0];
    cookies = cookies.filter(value => !value.startsWith(name + '=')); cookies.push(pair);
  } };
  let response = await http('/api/auth/csrf'); remember(response);
  const { csrfToken } = await response.json();
  response = await http('/api/auth/callback/credentials', cookies.join('; '), {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ csrfToken, email: owner.email, password, callbackUrl: origin + '/home', json: 'true' }),
  }); remember(response);
  const cookie = cookies.join('; ');
  assert.equal((await http('/api/auth/session', cookie).then(r => r.json())).user?.id, owner.id);
  const bytes = await sharp({ create: { width: 3, height: 3, channels: 3, background: '#729a62' } }).png().toBuffer();
  const form = (entityId = profile.id) => {
    const data = new FormData(); data.set('file', new File([bytes], 'synthetic-proof.png', { type: 'image/png' }));
    data.set('entityType', 'PROFILE'); data.set('entityId', entityId); return data;
  };
  anonymousDenied(await http('/api/files/upload', null, { method: 'POST', body: form() }));
  assert.equal((await http('/api/files/upload', cookie, { method: 'POST', body: form('missing-parent') })).status, 404);
  response = await http('/api/files/upload', cookie, { method: 'POST', body: form() });
  assert.equal(response.status, 200, await response.clone().text());
  const asset = await response.json();
  assert.equal(asset.sha256, createHash('sha256').update(bytes).digest('hex'));
  anonymousDenied(await http(asset.url));
  response = await http(asset.url, cookie);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
  assert.equal(await db.auditEvent.count({ where: { entityId: asset.id, action: 'FILE_UPLOADED' } }), 1);
  const filename = path.resolve(root, asset.storageKey);
  assert.equal(path.dirname(filename), root);
  const original = await readFile(filename);
  await writeFile(filename, Buffer.from('modified fixture'));
  assert.equal((await http(asset.url, cookie)).status, 409);
  await writeFile(filename, original);
  await db.membership.updateMany({ where: { userId: owner.id }, data: { status: 'DISABLED' } });
  assert.equal((await http(asset.url, cookie)).status, 403);
  console.log('PASS: actual owner login, bounded private upload, exact-byte retrieval, audit, anonymous/missing-parent/revoked denial and tamper detection.');
  // Retain append-only audit fixtures only in this explicitly disposable database.
} finally { await db.$disconnect(); }
