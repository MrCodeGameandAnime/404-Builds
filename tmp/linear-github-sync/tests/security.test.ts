import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { verifySignature } from "../src/security.js";

test("accepts the exact HMAC signature formats used by GitHub and Linear", () => {
  const body = Buffer.from('{"action":"updated"}');
  const secret = "test-secret";
  const hex = createHmac("sha256", secret).update(body).digest("hex");
  assert.equal(verifySignature(body, "sha256=" + hex, secret), true);
  assert.equal(verifySignature(body, hex, secret), true);
});

test("rejects missing, malformed, or incorrect webhook signatures", () => {
  const body = Buffer.from("payload");
  assert.equal(verifySignature(body, undefined, "test-secret"), false);
  assert.equal(verifySignature(body, "sha256=not-hex", "test-secret"), false);
  assert.equal(verifySignature(body, "sha256=" + "0".repeat(64), "test-secret"), false);
});
