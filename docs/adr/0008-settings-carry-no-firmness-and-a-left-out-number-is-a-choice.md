# Settings carry no firmness, and a number a type may leave out is a choice

The constraint dialog and statements take a type's firmness from the API's `constraint-options`: a type whose
`hasRequirement` is true offers Must or If possible (rest between shifts and the two day-type rules now do, API
ADR-0084), a type that always runs one way shows that fixed firmness, and a `SETTING` (pay rates, the part-shift
minimum, call-backs, no overtime when generating) shows none, because a setting is neither kept nor broken. The app
keeps no list of which types are settings beyond `FIXED_FIRMNESS`, which now names only the types that are always a Must
or always a Should; the two legal ceilings stay a Must.

A number field the API declares with `minCount` 0 and the app words as a choice (`CHOICE_FIELDS`, today the pay rates'
day-off rate) renders as two radio cards: what leaving it out means ("Counts as ordinary hours") or a figure ("Costs
this % of a normal hour", with the number box). Left out, nothing is sent and the API's default applies. A field the API
still takes but the app no longer shows (`HIDDEN_FIELDS`, today time off earned) keeps its stored value on edit and is
sent back unchanged. We chose this over a pay-rates-only form because it stays generic over the API's declarations,
which is how every other constraint form is built.

Pay rates retired (API ADR-0123): the rates moved onto employment terms, the type is only read on schedules generated
with it, and `CHOICE_FIELDS` no longer holds its day-off rate.

Security: no new data class; the rates are company settings that only guide which roster the engine prefers and are not
used for pay. No new permission key; the API remains the access control.
