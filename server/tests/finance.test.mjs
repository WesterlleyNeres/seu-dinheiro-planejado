import test from "node:test";
import assert from "node:assert/strict";
import {
  apiFetch,
  assertStatus,
  hasAuth,
  STRICT_VALIDATION,
  uniqueLabel,
} from "./helpers.mjs";

test("GET /health returns ok", async () => {
  const { response, json } = await apiFetch("/health", { token: "" });
  assertStatus(response, 200);
  assert.equal(json?.ok, true);
});

test("GET /categories without auth returns 401", async () => {
  const { response } = await apiFetch("/categories", { token: "" });
  assertStatus(response, 401);
});

test("CRUD categories", { skip: !hasAuth }, async () => {
  const nome = uniqueLabel("qa-category");

  const created = await apiFetch("/categories", {
    method: "POST",
    body: { nome, tipo: "despesa" },
  });
  assertStatus(created.response, 201);
  const categoryId = created.json?.id;
  assert.ok(categoryId, "category id missing");

  const list = await apiFetch(`/categories?search=${encodeURIComponent(nome)}`);
  assertStatus(list.response, 200);
  assert.ok(Array.isArray(list.json));

  const updated = await apiFetch(`/categories/${categoryId}`, {
    method: "PATCH",
    body: { nome: `${nome}-edit` },
  });
  assertStatus(updated.response, 200);

  const deleted = await apiFetch(`/categories/${categoryId}`, { method: "DELETE" });
  assertStatus(deleted.response, 200);
});

test("CRUD wallets", { skip: !hasAuth }, async () => {
  const nome = uniqueLabel("qa-wallet");

  const created = await apiFetch("/wallets", {
    method: "POST",
    body: { nome, tipo: "conta", saldo_inicial: 123.45 },
  });
  assertStatus(created.response, 201);
  const walletId = created.json?.id;
  assert.ok(walletId, "wallet id missing");

  const list = await apiFetch("/wallets");
  assertStatus(list.response, 200);
  assert.ok(Array.isArray(list.json));

  const updated = await apiFetch(`/wallets/${walletId}`, {
    method: "PATCH",
    body: { nome: `${nome}-edit`, ativo: false },
  });
  assertStatus(updated.response, 200);

  const deleted = await apiFetch(`/wallets/${walletId}`, { method: "DELETE" });
  assertStatus(deleted.response, 200);
});

test("CRUD transactions", { skip: !hasAuth }, async () => {
  const category = await apiFetch("/categories", {
    method: "POST",
    body: { nome: uniqueLabel("qa-tx-cat"), tipo: "despesa" },
  });
  assertStatus(category.response, 201);
  const categoryId = category.json?.id;

  const wallet = await apiFetch("/wallets", {
    method: "POST",
    body: { nome: uniqueLabel("qa-tx-wallet"), tipo: "conta", saldo_inicial: 50 },
  });
  assertStatus(wallet.response, 201);
  const walletId = wallet.json?.id;

  const created = await apiFetch("/transactions", {
    method: "POST",
    body: {
      tipo: "despesa",
      descricao: "QA transaction",
      valor: 12.34,
      category_id: categoryId,
      wallet_id: walletId,
      status: "pendente",
    },
  });
  assertStatus(created.response, 201);
  const txId = created.json?.id;
  assert.ok(txId, "transaction id missing");

  const list = await apiFetch("/transactions?limit=5");
  assertStatus(list.response, 200);
  assert.ok(Array.isArray(list.json));

  const updated = await apiFetch(`/transactions/${txId}`, {
    method: "PATCH",
    body: { descricao: "QA transaction updated", status: "paga" },
  });
  assertStatus(updated.response, 200);

  const deleted = await apiFetch(`/transactions/${txId}`, { method: "DELETE" });
  assertStatus(deleted.response, 200);

  await apiFetch(`/wallets/${walletId}`, { method: "DELETE" });
  await apiFetch(`/categories/${categoryId}`, { method: "DELETE" });
});

test("Transfers enforce distinct wallets", { skip: !hasAuth }, async () => {
  const wallet = await apiFetch("/wallets", {
    method: "POST",
    body: { nome: uniqueLabel("qa-transfer-wallet"), tipo: "conta", saldo_inicial: 10 },
  });
  assertStatus(wallet.response, 201);
  const walletId = wallet.json?.id;

  const bad = await apiFetch("/transfers", {
    method: "POST",
    body: { from_wallet_id: walletId, to_wallet_id: walletId, valor: 1 },
  });
  assert.equal(bad.response.status, 400);

  await apiFetch(`/wallets/${walletId}`, { method: "DELETE" });
});

test("CRUD transfers", { skip: !hasAuth }, async () => {
  const walletA = await apiFetch("/wallets", {
    method: "POST",
    body: { nome: uniqueLabel("qa-transfer-a"), tipo: "conta", saldo_inicial: 10 },
  });
  const walletB = await apiFetch("/wallets", {
    method: "POST",
    body: { nome: uniqueLabel("qa-transfer-b"), tipo: "conta", saldo_inicial: 20 },
  });
  assertStatus(walletA.response, 201);
  assertStatus(walletB.response, 201);

  const created = await apiFetch("/transfers", {
    method: "POST",
    body: {
      from_wallet_id: walletA.json?.id,
      to_wallet_id: walletB.json?.id,
      valor: 5,
    },
  });
  assertStatus(created.response, 201);
  const transferId = created.json?.id;

  const updated = await apiFetch(`/transfers/${transferId}`, {
    method: "PATCH",
    body: { descricao: "QA transfer updated" },
  });
  assertStatus(updated.response, 200);

  const deleted = await apiFetch(`/transfers/${transferId}`, { method: "DELETE" });
  assertStatus(deleted.response, 200);

  await apiFetch(`/wallets/${walletA.json?.id}`, { method: "DELETE" });
  await apiFetch(`/wallets/${walletB.json?.id}`, { method: "DELETE" });
});

test("CRUD budgets", { skip: !hasAuth }, async () => {
  const category = await apiFetch("/categories", {
    method: "POST",
    body: { nome: uniqueLabel("qa-budget-cat"), tipo: "despesa" },
  });
  assertStatus(category.response, 201);

  const created = await apiFetch("/budgets", {
    method: "POST",
    body: {
      category_id: category.json?.id,
      limite_valor: 100,
    },
  });
  assertStatus(created.response, 201);
  const budgetId = created.json?.id;

  const updated = await apiFetch(`/budgets/${budgetId}`, {
    method: "PATCH",
    body: { limite_valor: 200 },
  });
  assertStatus(updated.response, 200);

  const deleted = await apiFetch(`/budgets/${budgetId}`, { method: "DELETE" });
  assertStatus(deleted.response, 200);

  await apiFetch(`/categories/${category.json?.id}`, { method: "DELETE" });
});

test("CRUD goals + contributions", { skip: !hasAuth }, async () => {
  const created = await apiFetch("/goals", {
    method: "POST",
    body: { nome: uniqueLabel("qa-goal"), valor_meta: 100, prazo: new Date().toISOString() },
  });
  assertStatus(created.response, 201);
  const goalId = created.json?.id;

  const contrib = await apiFetch(`/goals/${goalId}/contributions`, {
    method: "POST",
    body: { valor: 10, data: new Date().toISOString() },
  });
  assertStatus(contrib.response, 201);
  const contribId = contrib.json?.id;

  const deletedContrib = await apiFetch(`/goals/contributions/${contribId}`, {
    method: "DELETE",
  });
  assertStatus(deletedContrib.response, 200);

  const deleted = await apiFetch(`/goals/${goalId}`, { method: "DELETE" });
  assertStatus(deleted.response, 200);
});

test("Validation errors should return 400 (known issue)", { skip: !STRICT_VALIDATION || !hasAuth }, async () => {
  const bad = await apiFetch("/categories", { method: "POST", body: { nome: "" } });
  assert.equal(bad.response.status, 400);
});
