# 03: Verify onboarding end to end against a live API

**What to build:** Run the API from `fix/onboarding-errors` with Cognito management on, then register a company through `/sign-up`, confirm the emailed code, sign in and land on `/`. Automated e2e tests stop at the form boundary because confirmation codes arrive by email.

The local API `.env` needs `COGNITO_MANAGEMENT_ENABLED=true`, `COGNITO_USER_POOL_ID`, AWS credentials with admin rights on the pool, and `OPA_API_TOKEN` (or `AUTHORIZATION_ENGINE_ENABLED=false`). The frontend reads `VITE_*` from `.env.local`.

**Blocked by:** 02 for the password copy, not for the run itself

**Status:** ready-for-human
