# The Calendar grid is hand-rolled on dayjs

Headless UI has no calendar primitive, so ADR 0001 doesn't cover the Calendar. We build its date grid ourselves on the WAI-ARIA date-grid pattern, with keyboard, roving focus and ARIA written and tested in-house. dayjs handles all date maths and localised month and weekday names. We rejected react-aria's `useCalendar`/`useRangeCalendar` because it is a heavy dependency and would bring a second date type (`@internationalized/date`) alongside dayjs. We rejected react-day-picker because it has no month or year views and would need restyling to fit the Horaion design.

## Consequences

We own a meaningful amount of accessibility-critical code, so the grid's keyboard and ARIA behaviour must stay thoroughly unit tested. Dates cross the public API as ISO date strings (`YYYY-MM-DD`), never as dayjs objects, so callers don't depend on dayjs. When the Date picker wraps the Calendar in a popup, that popup still uses Headless UI's Popover, as ADR 0001 requires.
