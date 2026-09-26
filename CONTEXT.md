# Horaion

Horaion is a human resources management system. This glossary fixes the words the product, design, and code share.

## Product structure

**Module**:
A self-contained area of the product that serves one HR concern, reached from the main navigation. The modules are Dashboard, Scheduling, Leave, People, and Organisation.
_Avoid_: Section, area, page, workspace

## Controls

**Select**:
A form control for choosing one or several values from a fixed list of options.
_Avoid_: Dropdown, picker

## Indicators

**Badge**:
A small, read-only label that shows the tone of a record at a glance, such as a leave request's approval state. It is never clicked, toggled, or removed.
_Avoid_: Pill, chip, tag

**Tone**:
The meaning a Badge conveys, drawn from Success, Warning, Error, or Neutral. A Badge with no stated tone is Neutral.
_Avoid_: Status, variant, colour

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
