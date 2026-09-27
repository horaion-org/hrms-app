# 01: Ship a strict Content-Security-Policy

**What to build:** ADR 0004 keeps Cognito tokens in `localStorage` only on the condition that a strict CSP prevents script injection. The app does not ship one yet. Add it to the hosting configuration and confirm Cognito SRP calls (`cognito-idp.<region>.amazonaws.com`) and the API origin are allowed by `connect-src`.

**Blocked by:** None

**Status:** ready-for-human
