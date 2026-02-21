# API QA Tests

These tests expect a running API and a safe database.

## Environment variables
`API_BASE_URL` default `http://localhost:4000`
`QA_AUTH_TOKEN` Supabase JWT for an existing user
`QA_TENANT_ID` Tenant UUID where the user is a member
`QA_STRICT=1` enables security assertions that may currently fail
`QA_FOREIGN_CATEGORY_ID` UUID from another user to test isolation
`QA_FOREIGN_WALLET_ID` UUID from another user to test isolation
`QA_FOREIGN_TENANT_ID` Tenant UUID where the user is not a member

## Run
`node --test server/tests/*.test.mjs`

## Performance
`node server/tests/perf/load.mjs`

## Chaos
See `server/tests/chaos/README.md`
