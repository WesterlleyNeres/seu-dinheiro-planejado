import test from "node:test";
import assert from "node:assert/strict";
import {
  apiFetch,
  assertStatus,
  hasAuth,
  hasTenant,
  uniqueLabel,
} from "./helpers.mjs";

const skipTenant = !hasAuth || !hasTenant;

test("CRUD tasks", { skip: skipTenant }, async () => {
  const created = await apiFetch("/tasks", {
    method: "POST",
    body: { tenant_id: process.env.QA_TENANT_ID || process.env.TEST_TENANT_ID, title: uniqueLabel("qa-task") },
  });
  assertStatus(created.response, 201);
  const taskId = created.json?.id;

  const updated = await apiFetch(`/tasks/${taskId}`, {
    method: "PATCH",
    body: { status: "done" },
  });
  assertStatus(updated.response, 200);

  const completed = await apiFetch(`/tasks/${taskId}/complete`, { method: "POST" });
  assertStatus(completed.response, 200);

  const deleted = await apiFetch(`/tasks/${taskId}`, { method: "DELETE" });
  assertStatus(deleted.response, 200);
});

test("CRUD events", { skip: skipTenant }, async () => {
  const start = new Date(Date.now() + 3600_000).toISOString();
  const created = await apiFetch("/events", {
    method: "POST",
    body: {
      tenant_id: process.env.QA_TENANT_ID || process.env.TEST_TENANT_ID,
      title: uniqueLabel("qa-event"),
      start_at: start,
      end_at: new Date(Date.now() + 7200_000).toISOString(),
      all_day: false,
    },
  });
  assertStatus(created.response, 201);
  const eventId = created.json?.id;

  const updated = await apiFetch(`/events/${eventId}`, {
    method: "PATCH",
    body: { title: uniqueLabel("qa-event-updated") },
  });
  assertStatus(updated.response, 200);

  const deleted = await apiFetch(`/events/${eventId}`, { method: "DELETE" });
  assertStatus(deleted.response, 200);
});

test("CRUD habits + logs", { skip: skipTenant }, async () => {
  const created = await apiFetch("/habits", {
    method: "POST",
    body: {
      tenant_id: process.env.QA_TENANT_ID || process.env.TEST_TENANT_ID,
      title: uniqueLabel("qa-habit"),
      cadence: "weekly",
      times_per_cadence: 2,
    },
  });
  assertStatus(created.response, 201);
  const habitId = created.json?.id;

  const log = await apiFetch(`/habits/${habitId}/logs`, {
    method: "POST",
    body: { value: 1 },
  });
  assert.ok([200, 201].includes(log.response.status));

  const updated = await apiFetch(`/habits/${habitId}`, {
    method: "PATCH",
    body: { active: false },
  });
  assertStatus(updated.response, 200);

  const deleted = await apiFetch(`/habits/${habitId}`, { method: "DELETE" });
  assertStatus(deleted.response, 200);
});

test("CRUD reminders", { skip: skipTenant }, async () => {
  const created = await apiFetch("/reminders", {
    method: "POST",
    body: {
      tenant_id: process.env.QA_TENANT_ID || process.env.TEST_TENANT_ID,
      title: uniqueLabel("qa-reminder"),
      remind_at: new Date(Date.now() + 3600_000).toISOString(),
    },
  });
  assertStatus(created.response, 201);
  const reminderId = created.json?.id;

  const updated = await apiFetch(`/reminders/${reminderId}`, {
    method: "PATCH",
    body: { status: "dismissed" },
  });
  assertStatus(updated.response, 200);

  const deleted = await apiFetch(`/reminders/${reminderId}`, { method: "DELETE" });
  assertStatus(deleted.response, 200);
});

test("CRUD memory items", { skip: skipTenant }, async () => {
  const created = await apiFetch("/memory", {
    method: "POST",
    body: {
      tenant_id: process.env.QA_TENANT_ID || process.env.TEST_TENANT_ID,
      kind: "profile",
      content: uniqueLabel("qa-memory"),
      metadata: { qa: true },
    },
  });
  assertStatus(created.response, 201);
  const memoryId = created.json?.id;

  const deleted = await apiFetch(`/memory/${memoryId}`, { method: "DELETE" });
  assertStatus(deleted.response, 200);
});

test("CRUD projects (basic)", { skip: skipTenant }, async () => {
  const tenantId = process.env.QA_TENANT_ID || process.env.TEST_TENANT_ID;

  const created = await apiFetch("/projects", {
    method: "POST",
    body: { tenant_id: tenantId, title: uniqueLabel("qa-project") },
  });
  assertStatus(created.response, 201);
  const projectId = created.json?.id;

  const stage = await apiFetch(`/projects/${projectId}/stages`, {
    method: "POST",
    body: { title: "QA Stage" },
  });
  assertStatus(stage.response, 201);
  const stageId = stage.json?.id;

  const item = await apiFetch(`/projects/${projectId}/stages/${stageId}/items`, {
    method: "POST",
    body: { title: "QA Item" },
  });
  assertStatus(item.response, 201);
  const itemId = item.json?.id;

  const checklist = await apiFetch(`/projects/items/${itemId}/checklist`, {
    method: "POST",
    body: { title: "QA Checklist" },
  });
  assertStatus(checklist.response, 201);

  const deletedChecklist = await apiFetch(`/projects/checklist/${checklist.json?.id}`, { method: "DELETE" });
  assertStatus(deletedChecklist.response, 200);

  const deletedItem = await apiFetch(`/projects/${projectId}/items/${itemId}`, { method: "DELETE" });
  assertStatus(deletedItem.response, 200);

  const deletedStage = await apiFetch(`/projects/${projectId}/stages/${stageId}`, { method: "DELETE" });
  assertStatus(deletedStage.response, 200);

  const deletedProject = await apiFetch(`/projects/${projectId}`, { method: "DELETE" });
  assertStatus(deletedProject.response, 200);
});
