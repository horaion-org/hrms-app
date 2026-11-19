# Add a roster finding

A new kind of fact in the roster page's Issues panel: something to fix, something that could not be met, or a note
for information. Every file below is in `src/features/scheduling/roster/`. Below, `<topic>` is the finding's name in
camelCase (`overtimeRisk`).

The worked example is "days to decide": topic `daysToDecide`, builder `toDecideIssue` in `rosterIssueSources.ts`, its
days from `daysToDecide` in `rosterSummary.ts`, and its count in `ISSUE_SOURCES`.

## Steps

1. **Name the topic.** Add `"<topic>"` to `IssueTopic` in `rosterIssueGroups.ts`. A topic is what a folded group
   counts by ("Shifts short", "Days to decide").

2. **Give it words.** Add `scheduling.issues.topics.<topic>` to `src/assets/locales/en/translations.json` and
   `src/assets/locales/es/translations.json`, plus the sentence the item reads (its `rule`) in the section that owns
   it ([Add copy](add-copy.md)). `tsc` fails on `issueTopic("<topic>", t)` until the English key exists.

3. **Build the items.** In `rosterIssueSources.ts`, write a function that turns the roster's facts into
   `RosterIssue`s: a unique `key` (`"<topic>|<id>"`), its `group` (`"mustFix"`, `"notMet"` or `"forInformation"`),
   `topic: issueTopic("<topic>", t)`, who and which day it is about, the sentence as `rule`, and its `action`
   (`{ kind: "show" }` unless it opens Find cover). Copy `toDecideIssue`. Then add its items to `issuesOfRoster`,
   inside `extras` (through `listIssues` when it reads one of the roster's lists).
   - When the items come from a new list on the roster, work the list out in `rosterSummary.ts` (as `daysToDecide`
     is), add it to `RosterView` in `rosterView.ts` (as `toDecide` is), and to the `roster` fields
     `RosterIssueSourceInput` picks. `tsc` names each of these, and the `input` builder in
     `rosterIssueSources.test.ts`, until they are done.

4. **Count it, so the Issues button shows.** The button shows while `issueCount` is above zero. In
   `rosterSummary.ts`:
   - add the count to `IssueFacts`, with a docstring;
   - add `"<topic>"` to `IssueSource`'s keys and a row to `ISSUE_SOURCES` that reads it.

   Then pass the count in `rosterView.ts`, in the `issueCount({ … })` call that fills `listCounts.issues`. `tsc` fails
   there, and on every `IssueFacts` in `rosterSummary.test.ts`, until it does.

5. **A dot on the grid, only if the finding belongs to one person's day.** Count it in `cellIssues` in
   `rosterMarks.ts`, the one place a cell's number is worked out; nothing else draws a dot.

6. **A row for stories and tests.** Add one `rosterIssueFixture({ … })` with the new topic to `rosterIssuesFixture`
   in `rosterIssueFixtures.ts`, so the `RosterIssueGroups` story shows it.
   `RosterIssueGroups/RosterIssueGroups.test.tsx` pins each group's count and rows from this fixture: raise the
   count of the new row's group by one there, and check nothing else moved.

7. **Tests.**
   - `rosterIssueSources.test.ts`: `issuesOfRoster` lists the new item, in its group, with its words.
   - `rosterSummary.test.ts`: `issueCount` counts the new fact.
   - `rosterView.test.ts`: the `listCounts.issues` it pins rises by the number of new items its fixture holds;
     check the new number is exactly those items before changing it.

   These tests read copy through a `t` that echoes the key (`scheduling.issues.topics.<topic>`), not the English
   words.

8. **Prove it.**

   ```sh
   pnpm exec vitest run --maxWorkers=3 src/features/scheduling/roster src/common/locales.test.ts
   pnpm exec tsc --noEmit
   pnpm lint
   ```

   Then open the `Features/Scheduling/RosterIssueGroups` story (`pnpm storybook`) and find the new row.
