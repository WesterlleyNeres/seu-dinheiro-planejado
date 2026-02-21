import test from "node:test";
import assert from "node:assert/strict";
import {
  apiFetch,
  hasAuth,
  STRICT_VALIDATION,
  uniqueLabel,
  TENANT_ID,
} from "./helpers.mjs";

const FOREIGN_CATEGORY_ID = process.env.QA_FOREIGN_CATEGORY_ID || "";
const FOREIGN_WALLET_ID = process.env.QA_FOREIGN_WALLET_ID || "";
const FOREIGN_TENANT_ID = process.env.QA_FOREIGN_TENANT_ID || "";

const hasForeign = Boolean(FOREIGN_CATEGORY_ID || FOREIGN_WALLET_ID || FOREIGN_TENANT_ID);

// These tests assert expected security behavior and are opt-in via QA_STRICT=1.

test("Reject invalid date payloads (should be 400)", { skip: !STRICT_VALIDATION || !hasAuth || !TENANT_ID }, async () => {
  const badEvent = await apiFetch("/events", {
    method: "POST",
    body: {
      tenant_id: TENANT_ID,
      title: uniqueLabel("qa-bad-date"),
      start_at: "not-a-date",
    },
  });

  assert.equal(badEvent.response.status, 400);
});

test("Reject cross-user category id in transactions (should be 403/404)", { skip: !STRICT_VALIDATION || !hasAuth || !FOREIGN_CATEGORY_ID }, async () => {
  const created = await apiFetch("/transactions", {
    method: "POST",
    body: {
      tipo: "despesa",
      descricao: "QA foreign category",
      valor: 10,
      category_id: FOREIGN_CATEGORY_ID,
    },
  });

  assert.ok([403, 404].includes(created.response.status));
});

test("Reject cross-user wallet id in transfers (should be 403/404)", { skip: !STRICT_VALIDATION || !hasAuth || !FOREIGN_WALLET_ID }, async () => {
  const created = await apiFetch("/transfers", {
    method: "POST",
    body: {
      from_wallet_id: FOREIGN_WALLET_ID,
      to_wallet_id: FOREIGN_WALLET_ID,
      valor: 1,
    },
  });

  assert.ok([403, 404].includes(created.response.status));
});

test("Reject tenant access bypass (should be 403)", { skip: !STRICT_VALIDATION || !hasAuth || !FOREIGN_TENANT_ID }, async () => {
  const result = await apiFetch(`/tasks?tenant_id=${FOREIGN_TENANT_ID}`);
  assert.equal(result.response.status, 403);
});
