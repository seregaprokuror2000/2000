import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { analyzeSession } from "../src/engine.js";
import type { SessionInput } from "../src/types.js";

async function fixture(name: string): Promise<SessionInput> {
  return JSON.parse(await readFile(new URL(`../examples/${name}`, import.meta.url), "utf8")) as SessionInput;
}

test("valid session closes without findings", async () => {
  const result = analyzeSession(await fixture("valid-session.json"));
  assert.equal(result.verdict, "PASS");
  assert.equal(result.findings.length, 0);
  assert.equal(result.metrics.merchantReceivable, 0n);
  assert.equal(result.metrics.remainingCollateral, 0n);
});

test("risky session reveals exposure and broken invariants", async () => {
  const result = analyzeSession(await fixture("risky-session.json"));
  assert.equal(result.verdict, "HIGH_RISK");
  assert.equal(result.metrics.unsettledExposure, 23_900_000n);
  assert.equal(result.metrics.unsecuredDelivery, 300_000n);
  assert.deepEqual(result.findings.map((finding) => finding.code).sort(), ["OC-101", "OC-211", "OC-301"]);
});
