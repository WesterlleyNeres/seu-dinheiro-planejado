# Chaos Test Playbook

All steps assume a disposable environment. Do not run against production.

1. Database down
Set `DATABASE_URL` to an invalid host and start the API.
Expected: server fails fast with clear log, health check fails.

2. Missing critical env
Unset `SUPABASE_URL` or `DATABASE_URL` and start the API.
Expected: process exits before listening.

3. External API timeout
Block outbound requests to `api.openai.com` and call the `ff-jarvis-chat` function.
Expected: function returns a controlled error without leaking secrets.

4. Corrupted payload
Send a malformed JSON body to a POST route (for example `/transactions`).
Expected: 400 with validation error, no 500.

5. Mid-transaction interruption
Trigger `/projects/:id/tasks/cleanup` and kill the process mid-request.
Expected: transaction rolls back or leaves consistent state.

6. Remove tenant membership
Remove the current user from `tenant_members` and retry `/tasks?tenant_id=...`.
Expected: 403.
