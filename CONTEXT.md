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
