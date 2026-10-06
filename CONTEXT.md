# Horaion

Horaion is a human resources management system. This glossary fixes the words the product, design, and code share.

## Product structure

**Company**:
The business that uses Horaion. Each company's people and records are kept apart from every other company's.
_Avoid_: Workspace, tenant, account

**Workspace address**:
The short, unique name a company chooses at Onboarding, such as `acme`. It is shown to people but never decides which company they are working in; everyone logs in at the same address. "Workspace" is only ever used in this phrase, never on its own.
_Avoid_: Subdomain, company address, URL, slug

**Module**:
A self-contained area of the product that serves one HR concern, reached from the main navigation. The modules are Dashboard, Scheduling, Leave, People, and Organisation.
_Avoid_: Section, area, page, workspace

## Organisation

**Branch**:
A unit of a Company that groups its people, such as one location. A branch is active or inactive, never deleted, and its name is unique within the Company ignoring letter case and extra spaces. Every Branch has a code unique within its Company, a city, and a country; the country is stored as an ISO 3166-1 alpha-2 code and shown by its name in the user’s language.
_Avoid_: Site, outlet, office

**Branch head**:
A person who leads a Branch on the org chart. An active Branch always has at least one. Being a Branch head does not by itself give a person any permissions.
_Avoid_: Branch manager, branch owner, branch admin

**Department**:
A unit of a Branch that groups some of its people. Like a Branch, it is active or inactive, never deleted, and its name is unique within its Branch ignoring letter case and extra spaces.
_Avoid_: Team, division, section

**Department head**:
A person who leads a Department on the org chart. An active Department always has at least one. Being a Department head does not by itself give a person any permissions.
_Avoid_: Department manager, supervisor

**Job title**:
The name of a person's job as shown on their card, such as Manager, defined once for the whole Company. A job title is active or inactive, never deleted, and never gives a person any permissions.
_Avoid_: Role, position, job grade

**Employee number**:
The number a Company gives each of its people, such as EMP-10602, entered when they are invited and unique within the Company. "Employee" is only ever used in this phrase.
_Avoid_: Employee ID, staff number, member number

**System role**:
A named set of permissions a Company grants to people. The API calls it an access role.
_Avoid_: Access role (in UI copy), role on its own, permission group, Job title

**Unit selector**:
Pages borrow a resource's list (`useBranches`, `useDepartments`) only to manage that resource, on the Organisation screens. To choose a unit anywhere else, use the workspace selectors (`BranchSelector`, `DepartmentSelector`) keyed by the page's own permission; they offer only the units the caller holds something at, so no screen needs `branch:read` or `department:read` to work inside a unit. Selectors used to create or assign pass `activeOnly`, so they offer only ACTIVE units; selectors that read do not, since inactive units may hold history. The places a System role can be assigned at come from the workspace the same way, offered only where the caller holds `access_role:assign`. A Department-only grant offers its parent Branch as navigation context, never as authority at the Branch.
_Avoid_: Unit picker, branch dropdown, department dropdown

**System role assignment**:
One person holding one System role at one place: the whole Company, one Branch (and its Departments), or one Department. The assignment, not the role or the person's own Branch or Department, decides where the role's permissions apply; any active member of the Company can hold one anywhere. Each assignment is changed, switched off or removed on its own, by someone who may assign at its place.
_Avoid_: Role membership, role grant (in UI copy)

## Access

**Onboarding**:
The public sign-up that creates a Company with the person signing up as its Owner. People see it as "Sign up".
_Avoid_: Registration (the Company's Registration number already uses that word), account creation

**Email confirmation**:
Proving a person owns the email they gave at Onboarding by entering the code emailed to them. Until it is done they cannot log in.
_Avoid_: Verification, sign-up confirmation, Challenge

**Log in**:
What a person does to start a Session with their email and password, and any Challenge that follows. **Log out** ends the Session in every open tab on this device; their other devices stay logged in. The API calls the same steps sign in and sign out.
_Avoid_: Sign in, sign out, login or logout as verbs

**Challenge**:
A step the API requires partway through logging in before a Session starts: choosing a new password in place of a temporary one, or entering a code from an authenticator app. A step, not an error.
_Avoid_: Error, prompt, Email confirmation

**Session**:
A logged-in person's standing with Horaion, lasting seven days unless ended earlier. Reloading or opening a new tab keeps the person logged in. A Session does not guarantee access: every request still checks that the person's membership of the company is active.
_Avoid_: A login, auth state, tokens

**Current Company**:
The Company a logged-in person is working in: the last one they chose while they can still use it, otherwise their only usable Company, otherwise the one they choose. A person with no usable Company has no Current Company.
_Avoid_: Active tenant, selected workspace, current org

**Target**:
The exact place a permission is asked about: the Company itself, one Branch, or one Department, always named explicitly (`ScopeRef` in code). A member's records are at their Department, or at the Company when they have none. A place the app does not know answers no.
_Avoid_: Scope id, level, context

**Permission catalogue**:
Every permission key the API knows, with the places a role holding it can be assigned at and the keys it needs alongside it (a change needs its resource's view). It is generated from the API's contract: `contracts/permission-catalog.json` is a byte copy of `hrms-backend-v2/contracts/permission-catalog.json`, refreshed by copying that file over it and running `pnpm generate:permissions`, which validates it and writes `src/features/workspace/permissionContract.generated.ts`. Never edit the generated file; `pnpm lint` fails when it no longer matches the contract. A key the catalogue does not know is newer than the app: gates ignore it, and a role's editor keeps it untouched.
_Avoid_: Permission list, permission catalog (in prose), permissions copy

**Effective permissions**:
The permissions a person has at one Target once grants made above it are counted, as the API computes them and the workspace sends them for every Company, Branch and Department. The app reads them as sent and never adds a parent's permissions again. They decide what is shown; the API still decides every request.
_Avoid_: Inherited permissions (in code), roles, rights

**Administrative data**:
Records reached through a person's System roles, such as the People list, a colleague's profile, team leave, or who holds a role. It is withdrawn from the screen and the cache as soon as the workspace shows the person's access there shrank.
_Avoid_: Admin data, protected data

**Own records**:
What a member sees about themselves without any System role: My profile and My leave, plus the colleagues directory of names. They never depend on the workspace, so they stay available when it is empty or failing.
_Avoid_: Self-service data, personal data, me data

## Leave

**Leave request**:
A person's request to be away from work over a Date range, decided by an Approver. It is a Draft, pending, approved, rejected, or cancelled; a pending one can be cancelled at any time, an approved one only until it starts. Every calendar day in the range counts, Weekends included, and the smallest amount is a Half day. Someone with permission can make one on another person's behalf.
_Avoid_: Leave application, absence request, time-off request

**Draft**:
A Leave request that has been saved but not submitted. Only the person who saved it can see it, it uses none of anyone's leave, and no Approver is asked to decide it.
_Avoid_: Saved request, unsubmitted request

**Approver**:
The person named on a Leave request to decide it. Being named is not enough: the Approver must also hold permission to approve leave for the person taking it. Often a Department head, but being one does not by itself make someone an Approver.
_Avoid_: Supervisor, manager, line manager

**Half day**:
The morning or the afternoon of one day; the smallest amount of leave a person can take. Only a Leave request for a single day can be a Half day.
_Avoid_: Partial day, AM leave, PM leave

**Leave type**:
The kind of leave a Leave request is for. Every Company has the same fixed list: Annual, Sick, Hospitalisation, Compassionate, Maternity, Unpaid, and Marriage.
_Avoid_: Leave category, leave code

**Allowance**:
The number of days of one Leave type a person may take in a Leave year. A Company sets one for each Leave type and can give a particular person a different one.
_Avoid_: Entitlement (that is a Company's plan), quota

**Balance**:
What is left of an Allowance in the current Leave year: the Allowance less leave that is approved or waiting for a decision. Drafts do not reduce it.
_Avoid_: Remaining leave, leave left

**Leave year**:
1 January to 31 December. Each Leave year starts again from the full Allowance; unused days are not carried over.
_Avoid_: Fiscal year, leave period, cycle

## Controls

**Select**:
A form control for choosing one or several values from a fixed list of options.
_Avoid_: Dropdown, picker

**Combobox**:
A form control for choosing one or several values by typing to search a list too long to show at once, such as a company's people.
_Avoid_: Autocomplete, typeahead, picker, Select

**Token**:
A removable item inside a multi-choice control that shows one chosen value. Removing it un-chooses that value.
_Avoid_: Chip, pill, tag, Badge

**Dialog**:
A window over the page that holds one focused task, such as creating a branch, and blocks the page until it is closed.
_Avoid_: Modal, popup, overlay

## Indicators

**Badge**:
A small, read-only label that shows the tone of a record at a glance, such as a leave request's approval state. It is never clicked, toggled, or removed.
_Avoid_: Pill, chip, tag

**Tone**:
The meaning a Badge conveys, drawn from Success, Warning, Error, or Neutral. A Badge with no stated tone is Neutral.
_Avoid_: Status, variant, colour

**Stepper**:
A control that shows a person's progress through an ordered sequence of steps and which step they are on.
_Avoid_: Wizard, progress bar, progress indicator, breadcrumb

**Step**:
One stage in a stepper's sequence. A step is completed, current, or upcoming. At most one step is current, and when the sequence is finished every step is completed. A person can return to a completed step but cannot jump ahead to an upcoming one.
_Avoid_: Stage, phase, tab

**Calendar**:
An always-visible panel for choosing a single date or a date range by browsing days, months, and years.
_Avoid_: Date grid, month view

**Date picker**:
A form control that shows the chosen date or date range in a field and opens a Calendar to change it.
_Avoid_: Datepicker, date dropdown, calendar

**Date range**:
A start date and an end date, both included, chosen together.
_Avoid_: Period, span

**Weekend**:
Saturday and Sunday. The week starts on Monday everywhere in Horaion.
_Avoid_: Rest days, off days

## Visual language

**Colour range**:
A named family of ten shades, numbered 50 (lightest) to 900 (darkest).
_Avoid_: Palette, scale, ramp

**Default shade**:
The one shade of a colour range that stands for the whole range when no shade number is given.
_Avoid_: Base shade, main shade

**Base**:
The two absolute colours, Black and White, that anchor contrast across every surface.
_Avoid_: Default, core colours

**Ink Blue**:
The primary colour range and Horaion's identity colour, used for key actions, active states, and focus. Its default shade is 900.
_Avoid_: Brand, primary blue

**Porcelain**:
The secondary colour range, a warm brown that adds depth to surfaces and supporting elements without competing with Ink Blue. Its default shade is 50.
_Avoid_: Secondary, beige, brown

**Neutral**:
The grey colour range for hierarchy: backgrounds, dividers, borders, disabled states, and secondary text. Its default shade is 900.
_Avoid_: Grey, gray

**Success**:
The colour range for positive outcomes, confirmations, and completed actions. Its default shade is 600.
_Avoid_: Positive, green

**Warning**:
The colour range for potential issues that deserve attention before acting, without urgency. Its default shade is 600.
_Avoid_: Caution, alert, yellow

**Error**:
The colour range for critical issues, failed actions, and missing inputs that need immediate attention. Its default shade is 600.
_Avoid_: Danger, destructive, red

## Interface elements

**Tab**:
One of a set of labelled views of the same page, shown side by side in a row. Exactly one tab in the set is active at a time, and choosing another tab changes the view without leaving the page. This differs from moving between Modules, which uses the main navigation.
_Avoid_: Segment, pill tab, sub-nav, section

**Count badge**:
A small number shown beside a label that says how many items wait behind it, such as pending leave requests on a tab.
_Avoid_: Badge, chip, pill, counter

## Interface copy

Use **sentence case for all UI text**, except document titles (`<title>`) and proper names, which retain their conventional capitalization. Preserve acronyms such as ID and API. HTML does not prescribe capitalization; this is Horaion’s chosen writing standard.

This applies to headings (`<h1>` through `<h6>`), form labels and legends, placeholders, buttons, links, navigation items, select options, table headers, captions, summaries, tooltips, accessible names (`alt` and ARIA labels), helper text, validation messages, success and empty states, and body text.

Examples: **Company name**, **Registration number**, **First name**, **Last name**, **Email address**, **Workspace name**, **Confirm password**, **Sign up**, **Log in**, and **Save changes**. Proper names such as **Horaion** keep their established spelling.

Write the intended casing directly in source strings, including translations. Do not use CSS `text-transform: uppercase` or `text-transform: capitalize` to impose casing. Keep the convention consistent even when reference designs or older branches differ. This replaces the previous Title Case rule for labels and buttons and the uppercase display treatment.
