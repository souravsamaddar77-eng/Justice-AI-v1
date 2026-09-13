import assert from "node:assert/strict";
import { test } from "node:test";
import { safeCaseReturnPath } from "../lib/case-client";

test("sign-in return paths stay on the application origin", () => {
  const origin = "https://justice.example";
  assert.equal(
    safeCaseReturnPath("/cases/123?tab=timeline", origin),
    "/cases/123?tab=timeline",
  );
  assert.equal(safeCaseReturnPath(null, origin), "/cases");
  for (const next of [
    "https://outside.example/cases",
    "//outside.example",
    "/\n/outside.example",
    "/\\outside.example",
    "javascript:alert(1)",
    "https://justice.example@outside.example",
  ]) {
    assert.equal(
      safeCaseReturnPath(next, origin),
      "/cases",
      `Rejected external return path ${JSON.stringify(next)}`,
    );
  }
});
