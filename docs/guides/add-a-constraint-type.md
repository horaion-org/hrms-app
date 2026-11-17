# Add a constraint type

Show a constraint type the API has added: the dialog offers it, the list and the roster read it as a sentence, and
its engine rules get plain names. Every per-type fact the app keeps lives in one record of the constraint type
catalogue; everything else is copy. Every file below is in `src/features/scheduling/constraints/` unless its path
says otherwise. Below, `<TYPE>` is the API's name for the type (`MIN_REST_DAYS`) and `<FIELD>` a field it takes.

This guide needs the constraint type catalogue (`constraintTypeCatalogue.ts` and its completeness test,
`constraintTypeCatalogue.test.ts`). Until those are on your branch, the type's facts are spread over
`constraintTypeLooks.ts`, `ConstraintDialog/fieldOrder.ts`, `appliesTo.ts`, `ConstraintDialog/nameSuggestion.ts`,
`ConstraintDialog/ConstraintDialog.tsx` and `src/features/scheduling/rulesCheck/rosterRulesCheckWords.ts`.

## Steps

1. **Name the type.** Add `"<TYPE>"` to `constraintTypeSchema` in `api.ts`, in the API's order. From here `tsc` names
   every place that must know the type.

2. **Add its record to `CONSTRAINT_TYPE_CATALOGUE`** in `constraintTypeCatalogue.ts`, copying a type like it:
   - `icon`: the icon its rows show;
   - `fieldReadingOrder`: its fields in the order the dialog reads them as a sentence;
   - `countedOnShifts`, when it counts people on shifts (the roster reads it per shift);
   - `startsIfPossible`, when the dialog starts it at "if possible";
   - `mustHintKey`, when "Must" needs a hint for this type (a typed copy key);
   - `engineRuleNames`: the engine's names for the rules it becomes, each listed in `ENGINE_RULE_NAMES`;
   - `retired`, only when the API keeps the type for old constraints but no longer offers it.

3. **Read it as a sentence.** Add its `case` to `sentencePartsOf` in `constraintSentence.ts`, copying a type with the
   same fields. `tsc` fails until it is there.

4. **Give it words** in `src/assets/locales/en/translations.json` and `src/assets/locales/es/translations.json`, under
   `scheduling.constraints` ([Add copy](add-copy.md)):
   - `types.<TYPE>`: its name;
   - `sentences.<TYPE>…`: the sentence, one key per form `sentencePartsOf` returns;
   - `descriptions.<TYPE>`, `examples.<TYPE>` and `nameSuggestions.<TYPE>`: what the type chooser shows.

5. **Add it to the fixtures** in `fixtures.ts`: its option in `CONSTRAINT_TYPE_OPTIONS`, as the API's
   `constraint-options` answers it, and one constraint of the type in `CONSTRAINT_FIXTURES`.

6. **A new field only.** Add `"<FIELD>"` to `constraintFieldSchema` in `api.ts`, and its words as
   `scheduling.constraints.fields.<FIELD>` and `scheduling.constraints.placeholders.<FIELD>` in both locale files.

7. **Prove it.**

   ```sh
   pnpm exec vitest run --maxWorkers=3 src/features/scheduling/constraints src/features/scheduling/rulesCheck src/common/locales.test.ts
   pnpm exec tsc --noEmit
   ```

   The completeness test, `constraintTypeCatalogue.test.ts`, fails for each fact the new type lacks and names the type
   and the missing thing: its copy in either language, its icon, a sentence key, its fixture, a field in its reading
   order that its option does not declare, or an engine rule name the app does not know. Then open the
   `Features/Scheduling/Constraints/ConstraintDialog` story (`pnpm storybook`) and add a constraint of the new type.
