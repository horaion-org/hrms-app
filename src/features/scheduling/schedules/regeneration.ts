import { apiRequest } from "@/common/api-client";
import type { DepartmentPath } from "@/common/companyPath";
import type { DayRun } from "@/features/scheduling/dates/api";
import type { WeekPart, WeekState } from "@/features/scheduling/months/api";
import { schedulePath } from "@/features/scheduling/paths";
import {
	generationInProgress,
	scheduleSchema,
	type Schedule,
} from "@/features/scheduling/schedules/api";
import {
	coversPartOfWeek,
	lastPublishedPartStartOf,
} from "@/features/scheduling/schedules/partLines";

/**
 * Whether a roster whose publication was withdrawn may be asked to generate
 * again through its own route (API ADR-0134): its generation ended and no run
 * is open. The API still refuses it when staff were told of changes to it.
 */
export const regenerableOncePublished = (schedule: Schedule): boolean =>
	(schedule.status === "GENERATED" ||
		schedule.status === "GENERATION_FAILED" ||
		schedule.status === "REJECTED") &&
	schedule.publicationWithdrawnAt !== null &&
	!generationInProgress(schedule);

/**
 * Generates one schedule again through its own route, which a withdrawn
 * roster needs (a month run never regenerates it). It answers the schedule,
 * GENERATION_REQUESTED.
 */
export const regenerateSchedule = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string
): Promise<Schedule> =>
	apiRequest(
		`${schedulePath(companyId, unit, scheduleId)}/regeneration`,
		scheduleSchema,
		{ method: "POST" }
	);

/** How the roster page generates a schedule again: by the month run, through its own route, or not at all. */
export type RegenerationPath = "monthRun" | "ownRoute" | "laterPartPublished";

/** How a schedule is generated again and what that does to its week (API ADR-0134, ADR-0135). */
export type Regeneration = {
	path: RegenerationPath;
	/** The schedule's own days, worked out again. */
	days: DayRun;
	/** The later parts' days, worked out from these days and generated again after them, if any. */
	laterDays?: DayRun;
	/** It covers only some of its week's days. */
	partOfWeek: boolean;
	/** Its publication was withdrawn, so staff saw it. */
	oncePublished: boolean;
	/** The roster page offers Regenerate (`regenerationOffered`). */
	offered: boolean;
};

/** The later parts the API queues to generate again after a part (API ADR-0135): those whose generation ended. */
const GENERATED_AGAIN_AFTER: ReadonlyArray<WeekState> = [
	"TO_REVIEW",
	"FAILED",
	"REJECTED",
];

/** What else decides whether the roster page offers Regenerate. */
export type RegenerationOffer = {
	/** The week has passed, so it is final (API ADR-0091). */
	weekPassed: boolean;
	/** The month read is in, so the week's parts are known. */
	monthRead: boolean;
	/** Another schedule is the week's published roster. */
	weekPublishedElsewhere: boolean;
	/** Holds `schedule:generate` and the roster is regenerable. */
	mayGenerate: boolean;
	/** Holds `schedule:generate` and the roster's publication was withdrawn. */
	mayRegenerateOncePublished: boolean;
};

/** Whether the roster page offers Regenerate for a schedule generated again by `path`. Pure. */
export const regenerationOffered = (
	path: RegenerationPath,
	offer: RegenerationOffer
): boolean => {
	if (offer.weekPassed || !offer.monthRead || path === "laterPartPublished")
		return false;
	if (path === "ownRoute")
		return offer.mayGenerate || offer.mayRegenerateOncePublished;
	return offer.mayGenerate && !offer.weekPublishedElsewhere;
};

/**
 * How `schedule` is generated again, from its week's parts (`weekParts`, the
 * month read's, this one included). A whole week never published takes the
 * month run; a part of its week or a withdrawn roster takes its own route,
 * which also generates the later parts again after it; a part with a later
 * published part can't be generated again (`SCHEDULE_LATER_PART_PUBLISHED`).
 * `offer` says whether the page offers it. Pure.
 */
export const regenerationOf = (
	schedule: Schedule,
	weekParts: ReadonlyArray<WeekPart>,
	offer: RegenerationOffer
): Regeneration => {
	const partOfWeek = coversPartOfWeek(schedule);
	const oncePublished = schedule.publicationWithdrawnAt !== null;
	const laterParts = weekParts
		.filter((part) => part.coveredFrom > schedule.coveredTo)
		.sort((first, second) =>
			first.coveredFrom.localeCompare(second.coveredFrom)
		);
	const generatedAgain = laterParts.filter((part) =>
		GENERATED_AGAIN_AFTER.includes(part.state)
	);
	const firstAgain = generatedAgain[0];
	const lastAgain = generatedAgain[generatedAgain.length - 1];
	const path: RegenerationPath =
		!partOfWeek && !oncePublished
			? "monthRun"
			: lastPublishedPartStartOf(laterParts) === undefined
				? "ownRoute"
				: "laterPartPublished";
	return {
		path,
		offered: regenerationOffered(path, offer),
		days: { from: schedule.coveredFrom, to: schedule.coveredTo },
		laterDays:
			firstAgain && lastAgain
				? { from: firstAgain.coveredFrom, to: lastAgain.coveredTo }
				: undefined,
		partOfWeek,
		oncePublished,
	};
};
