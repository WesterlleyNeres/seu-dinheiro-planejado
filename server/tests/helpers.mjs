import assert from "node:assert/strict";

export const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:4000";
export const AUTH_TOKEN = process.env.QA_AUTH_TOKEN || process.env.TEST_AUTH_TOKEN || "";
export const TENANT_ID = process.env.QA_TENANT_ID || process.env.TEST_TENANT_ID || "";
export const STRICT_VALIDATION = process.env.QA_STRICT === "1";

export const hasAuth = Boolean(AUTH_TOKEN);
export const hasTenant = Boolean(TENANT_ID);

export function uniqueLabel(prefix) {
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(16).slice(2, 8);
  return `${prefix}-${stamp}-${rand}`;
}

export async function apiFetch(path, options = {}) {
  const {
    method = "GET",
    token = AUTH_TOKEN,
    body,
    headers = {},
  } = options;

  const requestHeaders = new Headers(headers);
  if (token) requestHeaders.set("Authorization", `Bearer ${token}`);
  if (body !== undefined && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return { response, text, json };
}

export function assertStatus(response, expected) {
  assert.equal(response.status, expected, `Expected ${expected}, got ${response.status}`);
}
