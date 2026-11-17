import {
	generationInProgress,
	hasRoster,
	newestRunFailed,
	type Schedule,
} from "@/features/scheduling/schedules/api";

/** A notice the roster page shows under its header. */
export type ScheduleNoticeId =
	| "weekPublished"
	| "regenerationFailed"
	| "unpublished"
	| "rejected"
	| "generating"
	| "failed"
	| "draft"
	| "weekPassed"
	| "rulesChanged";

/** What decides the notices on one schedule. */
export type ScheduleNoticeFacts = {
	status: Schedule["status"];
	/** A run is open, so the roster isn't shown. */
	generating: boolean;
	hasRoster: boolean;
	/** The newest run ended without a roster (`newestRunFailed`). */
	newestRunFailed: boolean;
	/** Another schedule is already the week's published roster. */
	weekPublishedElsewhere: boolean;
	/** The week ended before today in its branch's time zone, so its rules and roster are final (API ADR-0091). */
	weekPassed: boolean;
	/** The rules changed since the week was generated, as the month read says (API ADR-0091). */
	rulesChanged: boolean;
};

/** What the page knows of a schedule's week beyond the schedule itself. */
export type ScheduleWeekFacts = {
	/** Another schedule is already the week's published roster. */
	weekPublishedElsewhere: boolean;
	/** The week ended before today in its branch's time zone. */
	weekPassed: boolean;
	/** The Department's weeks of the schedule's month, once read. */
	monthWeeks:
		| ReadonlyArray<{
				scheduleId: string | null;
				rulesChanged?: boolean | null;
		  }>
		| undefined;
};

/** The facts that decide a schedule's notices: its own standing and what is known of its week. */
export const scheduleNoticeFactsOf = (
	schedule: Schedule,
	{ weekPublishedElsewhere, weekPassed, monthWeeks }: ScheduleWeekFacts
): ScheduleNoticeFacts => ({
	status: schedule.status,
	generating: generationInProgress(schedule),
	hasRoster: hasRoster(schedule),
	newestRunFailed: newestRunFailed(schedule),
	weekPublishedElsewhere,
	weekPassed,
	rulesChanged:
		monthWeeks?.find((week) => week.scheduleId === schedule.scheduleId)
			?.rulesChanged === true,
});

/**
 * The notices the roster page may show, in order. Each says something
 * someone must act on, why there is no roster to look at, or why an action
 * is missing (a passed week can't be regenerated); anything merely
 * informative goes in the Issues panel instead.
 */
export const SCHEDULE_NOTICES: ReadonlyArray<{
	id: ScheduleNoticeId;
	shownWhen: (facts: ScheduleNoticeFacts) => boolean;
}> = [
	{
		id: "weekPublished",
		shownWhen: ({ weekPublishedElsewhere }) => weekPublishedElsewhere,
	},
	// Generating again failed, so the roster shown is the earlier one (API ADR-0112).
	{
		id: "regenerationFailed",
		shownWhen: ({ status, generating, newestRunFailed }) =>
			status === "GENERATED" && !generating && newestRunFailed,
	},
	// A generated roster on screen is not final: staff see a week only once it is published.
	{
		id: "unpublished",
		shownWhen: ({ status, generating, hasRoster }) =>
			status === "GENERATED" && !generating && hasRoster,
	},
	{ id: "rejected", shownWhen: ({ status }) => status === "REJECTED" },
	{ id: "generating", shownWhen: ({ generating }) => generating },
	{
		id: "failed",
		shownWhen: ({ status, generating }) =>
			!generating && status === "GENERATION_FAILED",
	},
	{
		id: "draft",
		shownWhen: ({ status, generating, hasRoster }) =>
			!generating && !hasRoster && status !== "GENERATION_FAILED",
	},
	{ id: "weekPassed", shownWhen: ({ weekPassed }) => weekPassed },
	// Until the week has passed, generating it again takes the department's rules as they are now.
	{
		id: "rulesChanged",
		shownWhen: ({ rulesChanged, generating, weekPassed }) =>
			rulesChanged && !generating && !weekPassed,
	},
];

/** The notices to show, in order. */
export const scheduleNotices = (
	facts: ScheduleNoticeFacts
): Array<ScheduleNoticeId> =>
	SCHEDULE_NOTICES.filter(({ shownWhen }) => shownWhen(facts)).map(
		({ id }) => id
	);

/** The roster is shown once there is one and no new run is open. */
export const rosterShown = ({
	status,
	generating,
	hasRoster,
}: ScheduleNoticeFacts): boolean =>
	!generating && hasRoster && status !== "GENERATION_FAILED";
