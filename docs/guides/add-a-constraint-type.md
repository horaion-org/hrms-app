# Add a constraint type

Show a constraint type the API has added: the dialog offers it, the list and the roster read it as a sentence, and
the roster check names its engine rules. Everything the app itself knows about a type is one record of
`CONSTRAINT_TYPE_CATALOGUE`; what a type takes (its category, fields and ranges) comes from the API's constraint
options; its words are copy. Every file below is in `src/features/scheduling/constraints/` unless its path says
otherwise. Below, `<TYPE>` is the API's name for the type (`WEEKENDS_OFF_PER_PERIOD`) and `<FIELD>` a field it takes
(`WEEKENDS_OFF`).

## Steps

1. **Name the type.** Add `"<TYPE>"` to `constraintTypeSchema` in `api.ts`, in the API's order. From here `tsc`
   names every place that must know the type: the catalogue, the sentence, and the copy read by
   `constraintTypeLooks.ts`, `ConstraintDialog/nameSuggestion.ts` and
   `src/features/scheduling/rulesCheck/rosterRulesCheckWords.ts`.

2. **A new field only.** Add `"<FIELD>"` to `constraintFieldSchema` in `api.ts`, and its strictness (which way
   protects people more, as the API declares it) to `STRICTNESS` in `fixtures.ts`; `tsc` fails there until it is.
   Its words, `scheduling.constraints.fields.<FIELD>` and `scheduling.constraints.placeholders.<FIELD>`, go in step 5.

3. **Add its record** to `CATALOGUE` in `constraintTypeCatalogue.ts`, copying a type like it (`REST_BETWEEN_SHIFTS`
   for one number):
   - `icon`: the icon it is offered and listed with, from `@/components/ui/Icon`;
   - `fieldReadingOrder`: its fields in the order its sentence reads them;
   - `countedOnShifts: true`, only when it is counted on the shifts it names;
   - `startsIfPossible: true`, only when a new one should start at If possible rather than Must;
   - `mustHintKey`, only when Must is a poor fit for some people: the copy key of the hint under the choice;
   - `engineRuleNames`: every name the engine reports its rule by. Each must be in `ENGINE_RULE_NAMES` in
     `src/features/scheduling/rulesCheck/rosterRulesCheckWords.ts`, the copy of the rules the engine registers (one
     per module of the engine's `rostering/constraints` folder); a new engine rule is added there too. An empty list
     when the engine has no rule of its own for it.
   - `retired: true`, only when the API keeps the type for old constraints but no longer offers it.

4. **Read it as a sentence**, in `constraintSentence.ts`:
   - add its key to `SentenceKey` (`` `${typeof SENTENCES}.<TYPE>` ``, plus any parts its sentence varies by);
   - add its `case` to `sentencePartsOf` (`tsc`: "Function lacks ending return statement" until it is there). A
     type whose sentence counts one number joins the `REST_BETWEEN_SHIFTS` cases, with its field in
     `COUNTED_FIELD`.

5. **Give it words** in `src/assets/locales/en/translations.json` and `src/assets/locales/es/translations.json`, under
   `scheduling.constraints` ([Add copy](add-copy.md)):
   - `types.<TYPE>`: its name;
   - `sentences.<TYPE>…`: one key per form `sentencePartsOf` returns, with `_one` and `_other` for a counted
     sentence, each field as a `<FIELD/>` tag;
   - `descriptions.<TYPE>`, `examples.<TYPE>` and `nameSuggestions.<TYPE>`: what the type chooser shows (not for a
     retired type);
   - for a new field, `fields.<FIELD>` and `placeholders.<FIELD>`.

6. **Add it to the fixtures** in `fixtures.ts`: its option in `CONSTRAINT_TYPE_OPTIONS`, as the API's
   `constraint-options` answers it (copy a neighbour's, with `number(…)`, `choice(…)` and the levels it may be set
   at), and one `constraintFixture({ … })` of the type in `CONSTRAINT_FIXTURES`.

7. **Update the one test that pins the chooser.** `ConstraintDialog/ConstraintDialog.test.tsx`, test
   `given_noTypeYet_when_rendered_then_offersEveryTypeAsACardUnderItsCategory`, counts the types under each
   category: raise the count of the new type's category by one.

8. **Prove it.**

   ```sh
   pnpm exec vitest run --maxWorkers=3 src/features/scheduling/constraints src/features/scheduling/rulesCheck src/common/locales.test.ts
   pnpm exec tsc --noEmit
   pnpm lint
   ```

   The completeness test, `constraintTypeCatalogue.test.ts`, runs seven checks for every type, as
   `constraint type <TYPE> > has its <fact>`, and a failure says `<TYPE> lacks <what>`:

   | Fact | Prints when it is missing |
   | --- | --- |
   | `label` | `en scheduling.constraints.types.<TYPE>` (or `es …`) |
   | `offeredTypeLook` | `icon`, and `<locale> scheduling.constraints.descriptions.<TYPE>` (also `examples`, `nameSuggestions`) |
   | `sentenceCopy` | `<locale> <sentence key>`, for every form its sentence takes, filled in or not |
   | `fixtureOption` | `an option in CONSTRAINT_TYPE_OPTIONS` |
   | `fixtureConstraint` | `a constraint in constraints/fixtures.ts` |
   | `fieldReadingOrder` | `<FIELD> in its option's fields` |
   | `engineRuleNames` | `<rule> in ENGINE_RULE_NAMES` |

   `KNOWN_GAPS` in that test lists the gaps today's types already have, each run as an expected failure with its
   reason. Never add the new type to it: fill the gap. When you fill a listed gap, its expected failure starts to
   fail; delete its line. The field copy (`fields`, `placeholders`) is checked by `src/common/locales.test.ts` for
   Spanish and by `tsc` for English.

   Then open the `Features/Scheduling/Constraints/ConstraintDialog` story (`pnpm storybook`) and add a constraint of
   the new type.

`api.ts` is over the 500-line limit and held to a ceiling in `scripts/check-file-size.mjs` that leaves room for new
type and field names. If `pnpm lint` says it passed its ceiling, move the schemas out into a module of their own
rather than raise the ceiling.
