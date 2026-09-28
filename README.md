# Horaion

Horaion brings people, scheduling, leave, and organisation management together.

Interface copy follows the capitalization standard in [CONTEXT.md](CONTEXT.md#interface-copy).

## Development

```sh
pnpm install
pnpm dev
```

Open http://localhost:5173. `/` redirects to `/login`; company registration is at `/register`.

## Authentication

Registration submits to the existing `POST /api/v1/public/onboardings` endpoint. Run the API on port 8080 for local development; Vite proxies `/api` there. Override the development proxy with `API_PROXY_TARGET` if needed. Deployments should proxy `/api` to the API, or set the public `VITE_API_BASE_URL` at build time and configure API CORS accordingly. Never put secrets in `VITE_` variables.

Registration follows the supplied Sign Up design, without an invitation key. It retains the required workspace address and password confirmation. First and last names are combined into `display_name`; registration numbers are sent as `registration_number` (1–64 characters). Apply API migration V9 before running the updated backend.

New accounts must verify their email before signing in. The auth layout and artwork follow `origin/login` (e7b7d28). `/sign-in` and `/sign-up` also resolve to the current auth screens. This integration branch has not yet imported that branch’s Cognito authentication flow: sign-in, Remember me persistence, and password recovery are not connected. Login does not submit, store, or simulate credentials or sessions.

## Checks

```sh
pnpm lint
pnpm exec vitest run src/
pnpm test:e2e
pnpm build
```

The browser suite mocks registration responses; it does not create real accounts. Shared UI components can be explored using `pnpm storybook`.
