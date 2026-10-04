# Spec: Create branch Dialog

Status: ready-for-agent

Spans both repositories: the app (the Dialog and its components) and the API (name rule and member
search). The design mocks are beside this spec in `design/`. The API's security-review plan is the
`create-branch-dialog` document in the API's implementation docs. Glossary terms (**Company**, **Branch**,
**Branch head**, **Combobox**, **Token**, **Dialog**, **Select**, **Badge**) are as defined in each
repository's `CONTEXT.md`.

## Problem Statement

A person who runs a Company opens Organisation › Branches to add a new Branch, for example a new
outlet on Orchard Road. The page offers a "Create branch" button, but clicking it does nothing. The
API has been able to create a Branch with its first Branch heads for some time, but nothing in the app
reaches it, so a new Branch can't be created without going around the product.

Two things in the API also fall short of what the design promises:

- **Near-duplicate names.** Branch names are compared exactly. "Orchard Road", "orchard road" and
  " Orchard  Road " can all exist side by side and are indistinguishable in a list.
- **Choosing heads.** The design asks people to search the Company's *active* people by name. The
  people listing can only be paged, not filtered or searched, so a Company with more than a page of
  people could not find the person they want.

## Solution

Selecting "Create branch" opens a Dialog titled "Create branch" ("Add a branch to your organisation and
choose who heads it.") with two fields:

- **Branch name.** A text field with a running "n/100" counter and the allowed characters stated
  underneath.
- **Branch heads.** A Combobox that opens a searchable list of the Company's active people, each shown
  with their initials, name and an "Active" Badge.
  - Chosen people appear in the field as removable Tokens.
  - A running "n/20" counter shows how many are chosen.
  - At least one head is required and at most 20 are allowed.

Behaviour:

- Mistakes are explained under the field that caused them, in the person's language.
- If the name is already taken, ignoring case and extra spaces, the Dialog says so under Branch name
  and keeps everything typed.
- If a chosen person stopped being an active member meanwhile, the Dialog says so under Branch heads.
- On success the Dialog closes and the new Branch appears in the list, with the Organisation overview
  counts updated.
- People who can't create Branches, or can't see the Company's people, don't see the button at all.

On the server:

- Branch names are stored trimmed, with repeated spaces collapsed.
- Names are unique within a Company ignoring letter case.
- The people listing gains an optional status filter and an optional name search.

## User Stories

1. As a person who runs a Company, I want a working "Create branch" button on the Branches page, so that I can add a Branch myself.
2. As that person, I want the Create branch Dialog to open over the Branches page, so that I keep my place in the list.
3. As that person, I want the Dialog to explain its purpose in one line, so that I know a Branch needs both a name and someone to lead it.
4. As that person, I want an example placeholder ("e.g. Orchard Road") in the name field, so that I know what kind of name is expected.
5. As that person, I want a live character counter on the name, so that I know how close I am to the 100-character limit.
6. As that person, I want the allowed characters stated under the name field before I type, so that I don't have to guess the rules.
7. As that person, I want to be told under the name field when I've used a character that isn't allowed (such as "!"), so that I can fix it.
8. As that person, I want to be told when the name is shorter than 2 characters, so that I don't create a meaningless Branch.
9. As that person, I want accidental leading, trailing or doubled spaces in the name ignored, so that a stray space neither creates a near-duplicate nor causes an error.
10. As that person, I want to be told when a Branch with the same name already exists, even if it differs only in letter case or spacing, so that my Company doesn't end up with two Branches nobody can tell apart.
11. As that person, I want the name-taken message to quote the name I typed and keep all my input, so that I only change the name and resubmit.
12. As that person, I want to open a list of my Company's active people from the Branch heads field, so that I can choose who leads the Branch.
13. As that person, I want to search that list by name, so that I can find someone quickly in a large Company.
14. As that person, I want the list to update shortly after I stop typing rather than on every keystroke, so that it feels responsive without flickering.
15. As that person, I want each person shown with their initials, name and an "Active" Badge, so that I recognise them and know they can be chosen.
16. As that person, I want to tick several people without the list closing, so that I can choose all the heads in one go.
17. As that person, I want my chosen heads shown as Tokens in the field, so that I can see who I've chosen with the list closed.
18. As that person, I want to remove a head by its Token's × button, so that I can undo a choice without reopening the list.
19. As that person, I want chosen heads to stay chosen when I search for someone else, so that searching never loses my choices.
20. As that person, I want a "n/20" counter on Branch heads, so that I know how many I've chosen and the limit.
21. As that person, I want unchosen people disabled once I've chosen 20, so that I can't go over the limit.
22. As that person, I want the list's footer to tell me that only active members are shown, and when there are more matches than are listed, so that I know to narrow my search.
23. As that person, I want a clear message when no one matches my search, so that I don't mistake an empty list for an error.
24. As that person, I want to be told to choose at least one head if I submit without any, so that I understand why the Branch wasn't created.
25. As that person, I want to be told under Branch heads when someone I chose has stopped being an active member, with the list refreshed, so that I can replace them.
26. As that person, I want the Create branch button disabled while the form is completely empty, so that I don't submit nothing by accident.
27. As that person, I want errors to appear when I submit and then clear as soon as I fix each field, so that I'm not interrupted while typing but get immediate confirmation when I fix something.
28. As that person, I want the Create branch button to show it's working and the fields to lock while the Branch is being created, so that I don't submit twice or change what's being sent.
29. As that person, I want the Dialog to close when the Branch is created, so that I'm back on the list straight away.
30. As that person, I want the new Branch to appear in the list right after the Dialog closes, so that I know it worked without reloading.
31. As that person, I want the Organisation overview's Branch count and recent activity to reflect the new Branch, so that every screen agrees.
32. As that person, I want Cancel, ×, Escape or clicking outside to close the Dialog and discard what I typed, so that backing out is quick.
33. As that person, I want closing blocked while the Branch is being created, so that I don't leave believing nothing happened.
34. As that person, I want the Dialog to start empty every time I open it, so that a previous attempt never leaks into a new one.
35. As that person, I want a clear message in the Dialog when creation is refused for a reason that isn't about a field (no permission, or the server failing), so that I know it wasn't my input and the Dialog stays open for a retry.
36. As a person without permission to create Branches, I want no Create button on the Branches page, so that the page doesn't offer an action that will fail.
37. As a person who can create Branches but can't see the Company's people, I want no Create button either, so that I'm not given a Dialog I can't complete.
38. As a Spanish-speaking person, I want every label, helper, error and footer in the Dialog in Spanish, so that I can create a Branch in my language.
39. As a keyboard user, I want focus to move into the Dialog when it opens, stay inside while it's open, and return to the Create branch button when it closes, so that I never lose my place.
40. As a keyboard user, I want to open the heads list, move through people with the arrow keys, tick with Enter or Space, and close with Escape, so that I can choose heads without a mouse.
41. As a keyboard user, I want Backspace in an empty search to remove the last Token, so that I can undo a choice from the keyboard.
42. As a screen-reader user, I want the Dialog announced by its title and description, so that I know where I am.
43. As a screen-reader user, I want each field's helper or error read with the field, and errors announced when they appear, so that I understand what's wrong.
44. As a screen-reader user, I want each Token's remove button named "Remove {name}", so that I know whom I'm removing.
45. As a screen-reader user, I want the submitting state announced as busy, so that I know to wait.
46. As a person who runs a Company, I want Branch heads described as people who *lead* the Branch, not who *manage* it, so that I'm not misled into thinking the role grants permissions it doesn't.
47. As a person who runs a Company, I want to search people by name only, never by email, so that the search doesn't reveal information beyond what the list already shows.
48. As a security reviewer, I want initial heads verified as active members of the same Company on the server, so that a crafted request can't attach someone from another Company.
49. As a security reviewer, I want the people search to stay inside the caller's Company, return 404 outside it, and treat wildcard characters as plain text, so that it can't be used to probe other tenants or run expensive patterns.
50. As a security reviewer, I want the existing Branch create audit event unchanged, so that the trail still records who created which Branch, when, from which request, and the outcome.
51. As an API client, I want to filter the Company people listing by status and search it by name, with the unfiltered behaviour unchanged when I pass neither, so that existing callers are unaffected.
52. As an API client, I want a 400 with a clear reason when my search text is too long or my status value is unknown, so that I can fix my request.
53. As an operator, I want existing Branch names normalised by the same rule when the change is deployed, and the deployment to stop loudly if that would create duplicates, so that no data is silently renamed.
54. As a developer, I want generic Dialog and Combobox components, so that Create department and later screens reuse them instead of building their own popups.
55. As a developer, I want form fields that can show a label above, helper text, and a counter, so that every stacked form in the app looks the same.
56. As a developer, I want server refusals mapped to fields by error code rather than by the server's wording, so that the UI stays translated and stable when server messages change.

## Implementation Decisions

**App: decisions from the grilling session (numbered so tickets can cite them)**

- **D1, scope.** Only the Create Dialog. The design's background table shows Code, City and Country columns. No such Branch fields exist, and the Branches list stays at Name and Status.
- **D2, new generic components** (approved): Dialog, Combobox (including Token), and an extension of the form-row and input pieces with a stacked layout, helper text and a counter. Each follows the app's one-folder, four-file component rule, with stories and tests.
- **D3, glossary.** The removable "Marcus Lim ×" items are **Tokens**, never chips. The "Active" label beside each person is a Success **Badge**. A Combobox is distinct from a Select: it searches a list too long to show at once.
- **D4, heads have no authority.** Branch heads are org-chart positions only. The API decision to grant heads a Branch head access role (API ADR-0015) is unbuilt and out of scope. The helper copy is reworded from "Heads manage the branch." to "Heads lead the branch. Add at least 1, up to 20."
- **D5, gating.** The Create button shows only when the Current Company grants both `branch:create` and `company_member:read`. The server's checks stay authoritative.
- **D6, validation timing.**
  - Submit is disabled while both fields are empty (design state 1).
  - Otherwise the form validates on submit, then re-validates each field as it changes (state 3).
  - While submitting, the submit button shows a busy state and both fields are disabled.
- **D7, refusals are mapped by error code and status, never by the server's `detail`, `title` or `message`** (app ADR-0003):
  - `409 BRANCH_NAME_CONFLICT` goes under Branch name: "A branch named "{name}" already exists. Choose a different name." (state 4).
  - `400 INVALID_INITIAL_BRANCH_HEAD` goes under Branch heads: "One of the chosen people is no longer an active member. Remove them and try again." The options are refetched.
  - A `400` with field errors for `name` or `initialHeadCompanyMembershipIds` goes under the matching field.
  - `403` and any other failure shows a translated alert inside the Dialog body, chosen by status.
  - In every case the Dialog stays open and focus moves to the first field with an error.
- **D8, success.** Close the Dialog, reset the form, and refresh every Organisation query for the Current Company (the Branches list, the overview counts and recent activity). No toast.
- **D9, closing.** Cancel, ×, Escape and a backdrop click discard input immediately, with no confirmation. Closing is blocked while a submit is in flight.
- **D10, people loading.**
  - The Combobox asks for active members matching the search text, 20 at a time, sorted by display name, 250 ms after typing stops. Earlier results stay visible while new ones load.
  - Footer: "Showing active company members", or "Showing 20 of {total} active company members. Type to narrow." when there are more.
  - Chosen people stay as Tokens even when absent from the current results. At 20 chosen, unchosen options are disabled.
- **D11, the name rule is the server's.** The client trims the name before sending and mirrors the length and character rules for early feedback. It doesn't try to predict a case-only conflict; the 409 covers that.
- **D12, copy is sentence case**, per the app glossary's Interface copy rule: "Create branch", "Branch name", "Branch heads", "Select branch heads", "Search people". The design's Title Case isn't followed. All new strings exist in English and Spanish (Spanish drafted by the implementer and flagged for review).

**App: modules**

- **Dialog** (generic UI). Built on the Headless UI dialog primitive (app ADR-0001).
  - Interface: open state, close callback, title, optional description, body, optional footer, and a "prevent close" flag for busy states.
  - Focus is trapped while open and returns to the opener. The body scrolls; the header and footer stay visible. 560 px wide, existing colour tokens only.
- **Combobox** (generic form control). Built on the Headless UI combobox primitive in multiple mode.
  - Generic over the option type. The caller supplies the options, a key and a label for each, an optional option renderer, and the current query with a query-change callback. The caller does the debouncing and fetching.
  - Also takes loading and empty texts, a footer, a maximum selection, placeholders for the trigger and the search, an error status, a disabled state, an accessible name, and a ref to the trigger so form libraries can focus it.
  - The search input lives in the panel, as the design shows. Chosen values render as Tokens in the trigger.
- **Form row and input** (existing). Gain an optional stacked layout, helper text, a counter and a required marker.
  - The current side-by-side layout stays the default, so existing forms are unchanged.
  - An error replaces the helper but keeps the counter.
- **Organisation API client** (existing). Gains "create branch" and "search company members". Both responses are validated by schema, as every response already is.
- **Organisation queries** (existing). Gain a debounced member-search query and the app's first mutation, "create branch", which refreshes the Organisation queries on success.
- **Create branch Dialog** (feature). Composes the above, using the app's existing form and schema libraries, plus a small pure refusal-mapping function that turns an API problem into a field and a translation key.
- **Branches page** (existing). Passes the create action to its toolbar only under D5 and hosts the Dialog.

**API: decisions**

- **A1, Branch name normalisation.** The server trims surrounding whitespace and collapses internal runs to one space on both create and update, before checking uniqueness or saving.
  - The rule lives in one place: a Branch name value object that also enforces 2–100 characters and the existing allow-list (letters, digits, space and `. ' & -`).
  - A name that becomes too short once normalised is a 400 naming the field, never a 500.
- **A2, case-insensitive uniqueness.**
  - Uniqueness checks on create and rename compare names ignoring case. Renaming a Branch to its own name in different case is not a conflict.
  - A schema migration normalises stored names, then replaces the exact-match unique constraint with a unique index on company plus lower-cased name.
  - If existing rows would clash, the migration fails loudly. Nothing is auto-renamed (pre-production).
  - The global handler's constraint-to-409 mapping follows the new index name, so a concurrent duplicate still surfaces as a 409.
- **A3, company members listing contract.** `GET /api/v1/companies/{companyId}/members` gains two optional query parameters:
  - `status`: `ACTIVE` or `INACTIVE`. An unknown value is a 400.
  - `search`: at most 100 characters, otherwise a 400. Blank counts as absent. It matches anywhere in the display name, ignoring case, never the email. Wildcard characters are matched literally.
  - With neither parameter, behaviour is exactly as today.
  - The response shape is unchanged (membership id, display name, status). The guard is unchanged (`company_member:read`), and the tenancy gate still runs first with a 404 outside the caller's Company.
- **A4, create branch contract unchanged.** `POST /api/v1/companies/{companyId}/branches` with `name` and `initialHeadCompanyMembershipIds` (1–20 company membership ids, each an active member of the path Company) keeps its responses: 201, 400 (`INVALID_INITIAL_BRANCH_HEAD` or field errors), 403, 404 and 409 (`BRANCH_NAME_CONFLICT`). The `branch.create` audit event is unchanged.
- **A5, no new endpoint, permission key, public path or dependency.** The API documentation set (request collections, implementation guide, data classification note) is updated to match.

## Testing Decisions

- **What a good test is here:** it drives the feature through a public interface and asserts outcomes a person or API client would observe: roles, accessible names, visible text, enabled or disabled state, requests sent, HTTP statuses and problem codes, rows returned. It never asserts library internals, private helpers or query shapes, so refactoring doesn't break it.
- **Agreed seams (confirmed with the user).** Every one already exists in the codebase.
  1. **App, primary seam: the Branches page rendered with a stubbed API.** Most app behaviour is asserted here:
     - Create button visibility under each permission combination.
     - Design states 1–4.
     - Disabled-when-empty, then validate on submit and re-validate on change.
     - The busy state and blocked closing.
     - The trimmed name and chosen ids being posted.
     - Each refusal mapping from D7.
     - Close and refresh on success; discard on close.
     - The debounced search, using fake timers.
     - The "n of total" footer and the 20-head cap.
     Prior art: the existing Organisation list-page tests, which render pages against the stubbed API.
  2. **App, component contracts: rendered-interface tests per generic component**, kept thin because the page seam covers the composed behaviour. Prior art: the Select spec's tests for multi-select interaction, status and disabled precedence.
     - Dialog: name and description, Escape, ×, prevent-close, focus return.
     - Combobox: query reporting, choosing, Token removal, Backspace removal, the maximum cap, loading, empty, error status.
     - Form row: helper and counter wiring through described-by; the error replacing the helper.
     - Button: busy state.
     The pure refusal-mapping function gets a small table-driven unit test.
  3. **App, end to end: one browser happy path.** Log in, open Branches, create a Branch with one head, and see it in the list. Prior art: the existing end-to-end suite, including the app-header greeting test.
  4. **API, persistence: repository slice tests against the real query.** Prior art: the existing company-membership repository test.
     - Members search by status, by name ignoring case, and both.
     - Wildcard characters matched literally.
     - Results confined to one Company.
     - Branch existence checks ignoring case, including the not-itself variant.
  5. **API, HTTP contract: controller web-slice tests.** Prior art: the existing company-member controller test.
     - New parameters passed through; search over 100 characters and an unknown status return 400.
     - Mandatory negatives: unauthenticated 401, permission denied 403, cross-tenant 404.
  6. **API, rules: service unit tests with mocked repositories**, as the API conventions require. Prior art: the existing branch service tests.
     - Normalisation happens before the conflict check and the save; a case-only conflict is a 409.
     - Renaming to the same name in different case succeeds.
     - Blank search is ignored; the tenancy gate runs before any query.
     - A value-object unit test covers trimming, collapsing, short-after-trim rejection and diacritics.
- **Not tested automatically:** panel positioning and flipping, scroll caps, and visual fidelity to the mock. These are reviewed in Storybook, with browser evidence recorded beside the tickets as in earlier component work.
- **Checks that must pass:**
  - App: lint with zero warnings, unit tests, end-to-end tests and the production build.
  - API: the full Maven verify, and the migration applying to a fresh development database.

## Out of Scope

- Branch code, city and country fields and columns (D1).
- Editing a Branch, activating or deactivating it, and managing Branch members. The row actions stay as they are.
- Granting Branch heads any permission (API ADR-0015).
- A Toast or other success notification component.
- Applying the same name rule to departments, and possibly access roles. This is a follow-up so sibling units end up with one rule.
- Creating departments (they will reuse these components later).
- Infinite scrolling in the Combobox, and browsing people without searching beyond the first 20.
- A discard confirmation on close.
- Rate limiting the people search or Branch creation. It is absent platform-wide and flagged for a decision.

## Further Notes

- **Confirmed by the user during implementation (2026-10-04).** All three formerly open decisions are approved:
  1. Change the Branches page's existing Title Case strings ("Create Branch", "Branch Name", "Search Branch", "All Branches") to sentence case in both languages.
  2. Hide the list toolbar's Create button when no create action is supplied, including the non-working placeholders on Departments, Job titles and System roles.
  3. Add the shared Button loading state described in ticket 04.
- **Design deviations to confirm with the designer:** sentence-case copy (D12), the reworded heads helper (D4), and the "Showing 20 of N…" footer variant (D10).
- **API dependency.** The Combobox's search needs A3 before it can work against the real API. The 409 mapping in D7 doesn't depend on A2, because the response is the same either way.
- **Security notes** (full detail in the API's implementation plan for this feature):
  - No new stored fields. Display names are already-classified personal data, readable only by holders of `company_member:read` in the same Company; search narrows that list without widening it.
  - Search text travels as a query parameter and so reaches access logs. It is a name fragment, not a secret or identifier; noted for the log-retention review.
- **Glossary updates** already made in both repositories' `CONTEXT.md`: Branch, Branch name, Branch head, Company Member (API); Branch, Branch head, Combobox, Token, Dialog (app).
- **After implementation**, regenerate the repository snapshot in each repository that changed, per the workspace instructions.
