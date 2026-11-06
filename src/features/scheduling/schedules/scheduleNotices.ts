import type { Schedule } from "@/features/scheduling/schedules/api";

/** A notice the roster page shows under its header. */
export type ScheduleNoticeId =
	"weekPublished" | "rejected" | "generating" | "failed" | "draft";

/** What decides the notices on one schedule. */
export type ScheduleNoticeFacts = {
	status: Schedule["status"];
	/** A run is open, so the roster isn't shown. */
	generating: boolean;
	hasRoster: boolean;
	/** Another schedule is already the week's published roster. */
	weekPublishedElsewhere: boolean;
};

/**
 * The notices the roster page may show, in order. Each says something
 * someone must act on, or why there is no roster to look at; anything
 * merely informative goes in the Issues panel instead.
 */
export const SCHEDULE_NOTICES: ReadonlyArray<{
	id: ScheduleNoticeId;
	shownWhen: (facts: ScheduleNoticeFacts) => boolean;
}> = [
	{
		id: "weekPublished",
		shownWhen: ({ weekPublishedElsewhere }) => weekPublishedElsewhere,
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
