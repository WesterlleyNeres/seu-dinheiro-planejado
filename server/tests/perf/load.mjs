import { performance } from "node:perf_hooks";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:4000";
const AUTH_TOKEN = process.env.QA_AUTH_TOKEN || process.env.TEST_AUTH_TOKEN || "";

const ENDPOINT = process.env.QA_ENDPOINT || "/health";
const METHOD = process.env.QA_METHOD || "GET";
const TOTAL = Number(process.env.QA_TOTAL || 200);
const CONCURRENCY = Number(process.env.QA_CONCURRENCY || 20);

const headers = new Headers();
if (AUTH_TOKEN) headers.set("Authorization", `Bearer ${AUTH_TOKEN}`);

async function runOne(i) {
  const start = performance.now();
  const response = await fetch(`${API_BASE_URL}${ENDPOINT}`, { method: METHOD, headers });
  const duration = performance.now() - start;
  return { ok: response.ok, status: response.status, duration };
}

const batches = Math.ceil(TOTAL / CONCURRENCY);
const timings = [];
let ok = 0;
let failed = 0;

for (let b = 0; b < batches; b += 1) {
  const current = Math.min(CONCURRENCY, TOTAL - b * CONCURRENCY);
  const results = await Promise.all(
    Array.from({ length: current }, (_, i) => runOne(b * CONCURRENCY + i))
  );
  for (const r of results) {
    timings.push(r.duration);
    if (r.ok) ok += 1;
    else failed += 1;
  }
}

timings.sort((a, b) => a - b);
const p = (q) => timings[Math.floor(q * (timings.length - 1))] || 0;
const avg = timings.reduce((sum, t) => sum + t, 0) / (timings.length || 1);

console.log(JSON.stringify({
  endpoint: ENDPOINT,
  total: TOTAL,
  concurrency: CONCURRENCY,
  ok,
  failed,
  avg_ms: Math.round(avg),
  p50_ms: Math.round(p(0.5)),
  p90_ms: Math.round(p(0.9)),
  p99_ms: Math.round(p(0.99)),
}, null, 2));
