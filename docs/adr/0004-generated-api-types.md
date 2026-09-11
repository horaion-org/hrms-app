# API types are generated from OpenAPI and committed
Date: 2026-08-06 · Status: Accepted

The app must speak roughly twenty-five request and response shapes, all `snake_case`, against an API
that changes. Hand-written interfaces drift silently; hand-written Zod schemas for responses drift
loudly but still have to be maintained twice.

Decided: generate TypeScript types from the API's OpenAPI specification with `openapi-typescript` into
`src/common/api-types.gen.ts`, and use Zod only for validating form input. A contract change becomes a
compile error rather than a runtime surprise.

The generated file is **committed**, which is unusual for generated output and necessary here. The API
produces `openapi.json` by serving `/v3/api-docs` from a running instance and gitignores the result, so
the specification is not available to anyone who does not have the API, its database, and its PDP
running. Committing the generated types lets the app build, lint, and test on its own.

This depended on a fix in the API. Its specification previously advertised Java record component names
in camelCase while the wire format was snake_case, because springdoc built its own object mapper rather
than the application's. A client generated from that specification would have failed on every field.
The API now binds a `ModelResolver` to the application mapper.

We rejected hand-written Zod schemas as the source of truth: they would validate responses at runtime,
which is a real benefit, but they mean maintaining a second declaration of every shape by hand forever.
We rejected doing both — generated types plus Zod response parsing — because the runtime guarantee is
not worth two representations of every shape until something has actually lied to us. We rejected plain
hand-written interfaces because nothing would check them against the API at all.
