import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { assertDisposableDemoDatabase } from "./database-safety";

const demo = {
  NODE_ENV: "development",
  FLIPSIDE_DATABASE_PURPOSE: "disposable-demo",
  DATABASE_URL: "postgresql://demo:unused@127.0.0.1:55438/flipside_demo_test",
};

test("explicit local disposable demo is permitted", () => {
  assert.doesNotThrow(() => assertDisposableDemoDatabase(demo));
});

for (const [label, override] of Object.entries({
  production: { NODE_ENV: "production" },
  railway: { RAILWAY_ENVIRONMENT_ID: "production-id" },
  railwayProject: { RAILWAY_PROJECT_ID: "project-id" },
  missingOptIn: { FLIPSIDE_DATABASE_PURPOSE: "" },
  missingUrl: { DATABASE_URL: "" },
  realDatabaseName: { DATABASE_URL: "postgresql://demo:unused@localhost/railway" },
  remoteHost: { DATABASE_URL: "postgresql://demo:unused@db.example.com/flipside_demo_test" },
  hostOverride: { DATABASE_URL: "postgresql://demo:unused@localhost/flipside_demo_test?host=db.example.com" },
  hostAddressOverride: { DATABASE_URL: "postgresql://demo:unused@localhost/flipside_demo_test?hostaddr=1.2.3.4" },
  wrongProtocol: { DATABASE_URL: "https://localhost/flipside_demo_test" },
})) {
  test(`refuses ${label} before opening a connection`, () => {
    assert.throws(() => assertDisposableDemoDatabase({ ...demo, ...override }));
  });
}

test("release startup has no schema or seed side effects", () => {
  const railway = JSON.parse(readFileSync("railway.json", "utf8"));
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  assert.equal(railway.deploy.startCommand, "npm start");
  assert.equal(pkg.scripts.start, "next start");
  assert.equal(pkg.scripts.prestart, undefined);
  assert.equal(pkg.scripts.poststart, undefined);
  assert.equal(railway.deploy.preDeployCommand, undefined);
});

test("HTTP demo reset refuses production even with demo mode enabled", async () => {
  const previous = { ...process.env };
  try {
    Object.assign(process.env, demo, { NODE_ENV: "production", TENANT_MODE: "DEMO", DEMO_RESET_SECRET: "test-only" });
    const { POST } = await import("../app/api/internal/reset-demo/route");
    const response = await POST(new Request("http://localhost/api/internal/reset-demo", {
      method: "POST", headers: { authorization: "Bearer test-only" },
    }));
    assert.equal(response.status, 403);
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
    Object.assign(process.env, previous);
  }
});
