# A strict Content-Security-Policy, baked per environment, with the frame guard as a header
Date: 2026-09-11 · Status: Accepted

The client holds Cognito tokens in the browser, so script injection is the attack that matters: a
script that runs on the page can use whatever the page can. A Content-Security-Policy is the browser's
own control against that, and ADR-0002 already made it a condition of its token decision. This record
decides what the policy says and where it is delivered.

Decided: the policy is `default-src 'self'` with `script-src 'self'`, no `unsafe-inline` and no
`unsafe-eval`; `style-src 'self'`; `img-src 'self' data:`; `font-src 'self'`; `connect-src` limited to
the app's own origin, the Horaion API origin and the Cognito endpoint for the pool's region;
`object-src 'none'`, `base-uri 'none'`, `form-action 'self'`, `frame-src 'none'`, and
`upgrade-insecure-requests`. One function in `src/common/content-security-policy.ts` renders it, and a
unit test pins the directives that matter.

Delivery differs by environment because the API and Cognito origins differ by environment and Vercel's
`vercel.json` cannot vary a header per deployment. In production the policy is a `meta http-equiv` tag
that Vite prepends to the page at build time, rendered from the same `VITE_*` values the bundle is
built with, so a preview and production each name their own API. `vercel.json` adds the directives a
meta tag cannot carry, `frame-ancestors 'none'`, plus `X-Frame-Options: DENY`,
`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a
`Permissions-Policy` that disables camera, microphone, geolocation, payment and USB,
`Cross-Origin-Opener-Policy: same-origin`, and HSTS for two years with subdomains. On the dev server the
whole policy is a response header, with a nonce that Vite stamps on the script and style tags it
injects for hot reload, and `ws:` allowed for the reload socket, so a developer sees a violation before
a user does. An end-to-end test loads the sign-in page and fails on any violation the browser reports.

The exceptions, each argued: `data:` images allow inline SVG and generated avatars without a network
fetch and cannot execute script. `style-src` stays `'self'` because React and Headless UI set styles
through the CSSOM, which the policy does not govern; the first library that injects a `style` element
must be nonced or rejected, never met with `unsafe-inline`. The dev nonce is fixed for the life of a
dev server, not rotated per request, because the dev server is not a production surface. There is no
reporting endpoint yet; a meta policy cannot carry `report-to`, so violation reporting arrives when
the policy moves to a header.

We rejected a single static header in `vercel.json` naming every environment's API: it would let a
preview page talk to production, and it must be edited for every new environment. We rejected a
runtime-generated `config.js` to make one build serve every environment; it is the better answer once
there are several environments and is noted in ADR-0006 for the same reason. We rejected loosening
`script-src` for the dev server's inline reload preamble; the nonce exists precisely so that the
development policy stays as strict as production.

Consequences: any new external origin, a fonts host, an analytics or error-reporting service, a CDN,
is a change to the policy function and a supersession or amendment of this record. When the production
domain is fixed, the policy can move from the meta tag to a `vercel.json` header keyed on host, which
would also enable `report-to`; that is the planned next step for this decision.
