import { queryOptions, skipToken } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/common/api-client";
import type { QueryOptionsFor } from "@/common/query-client";
import type { CoverGapRequest } from "@/features/scheduling/cover/api";
import { ENGINE_ANSWER_WAIT_MILLISECONDS } from "@/features/scheduling/engineWait";
import {
	SCHEDULING_QUERY_ROOT,
	schedulePath,
} from "@/features/scheduling/paths";
import {
	REPAIR_OPTION_KINDS,
	rosterChangeCellSchema,
} from "@/features/scheduling/rosterChanges/api";
import type { RosterChangeTarget } from "@/features/scheduling/rosterChanges/useRosterChangeActions";
import { administrativeMeta } from "@/features/workspace/queryAccess";

/*
 * The scheduling engine's repair options for one short shift (the API's
 * `…/repair-options`, engine ADR-0018), under `schedule:edit_shift`: the
 * engine's own ways to fill the gap, against the roster as it stands now,
 * each ready to show and apply (its kind, how much it fills, its cost, its
 * cells and each person's week). Nothing is stored.
 */

/** A span of local time, `yyyy-MM-ddTHH:mm:ss`. */
export type RepairSpan = { start: string | null; end: string | null };

/** What an option does; OTHER for the older repair's options and a kind this app does not know. */
const repairOptionKindSchema = z.enum(REPAIR_OPTION_KINDS).catch("OTHER");

/**
 * How much of the gap an option fills: all of it, one person of several for
 * all its hours, or only some hours. Null from the engine's older model,
 * which does not say.
 */
const repairFillsSchema = z
	.enum(["GAP", "ONE_PERSON", "PART"])
	.nullable()
	.catch(null);

/** A span of local time and how many people it is short. */
const shortSpanSchema = z.object({
	start: z.string(),
	end: z.string(),
	shortBy: z.number(),
});

/** A span of local time, `yyyy-MM-ddTHH:mm:ss`, and how many people it is short. */
export type RepairShortSpan = z.infer<typeof shortSpanSchema>;

/** Someone an option changes, with their week's minutes before and after it, from the hours ledger. */
const repairPersonSchema = z.object({
	membershipId: z.string(),
	displayName: z.string().nullable(),
	/** Null when the ledger could not price the change. */
	weekMinutes: z
		.object({
			before: z.number(),
			after: z.number(),
			contract: z.number(),
			/** Minutes of approved leave counted inside `before` and `after`; 0 when none, or from an API that does not send it yet. */
			countedLeave: z
				.number()
				.nullish()
				.transform((minutes) => minutes ?? 0),
		})
		.nullable(),
	/** Taken off this shift by hand earlier: the engine ranks such options last, and the app never suggests one. */
	takenOffThisShift: z.boolean(),
});

/** Someone an option changes, and their week's minutes. */
export type RepairPerson = z.infer<typeof repairPersonSchema>;

const optionSchema = z.object({
	/** Whether the option was checked against the working-time rules; false shows "Not rule-checked". */
	workingTimeRulesChecked: z.boolean(),
	kind: repairOptionKindSchema,
	fills: repairFillsSchema,
	/** The gap's hours still short with the option applied, each run with its count; empty when it fills the gap. */
	stillShort: z.array(shortSpanSchema),
	/**
	 * How the person's minutes of each kind change that week if the option is
	 * applied, all 0 when it costs no extra hours; `pastContract` is a
	 * part-timer's hours past their own contract. Null when the engine gave none.
	 */
	extraMinutes: z
		.object({
			overtime: z.number(),
			restDayWork: z.number(),
			timeOffEarned: z.number(),
			pastContract: z.number(),
		})
		.nullable(),
	/** The change, exactly as the roster-change preview, the apply and a cover offer take it. */
	cells: z.array(rosterChangeCellSchema),
	/** Each person the option changes, in the order of `cells`. */
	people: z.array(repairPersonSchema),
});

/** One of the engine's ways to fill the gap, ready to show and apply. */
export type RepairOption = z.infer<typeof optionSchema>;

/** One reason the engine gives for not putting someone on the short shift; `code` is open, so a new one still reads. */
const notAssignedReasonSchema = z.object({
	code: z.string(),
	/** The engine's snake_case rule name, for a rule the shift would break. */
	rule: z.string().nullable(),
	constraintId: z.string().nullable(),
	/** The company constraint's own name, when the engine's id is one of the schedule's. */
	constraintName: z.string().nullable(),
});

/** One reason someone was not put on the short shift. */
export type NotAssignedReason = z.infer<typeof notAssignedReasonSchema>;

/** Someone with the gap's job title the engine did not put on the shift, and why. */
const notAssignedPersonSchema = z.object({
	memberProfileId: z.string(),
	name: z.string(),
	/** Whether they could take the shift after all; null when the engine did not say. */
	couldTake: z.boolean().nullable(),
	reasons: z.array(notAssignedReasonSchema),
});

/** Someone with the gap's job title who was not assigned, and why. */
export type NotAssignedPerson = z.infer<typeof notAssignedPersonSchema>;

const repairOptionsSchema = z.object({
	/** The roster revision the options were worked out at; applying one sends it back. */
	revision: z.number(),
	conflictId: z.string(),
	/**
	 * Whether the engine tried everything it set out to before its deadline,
	 * and how many options it found before it kept the best; null when not said.
	 */
	search: z
		.object({ complete: z.boolean(), optionsFound: z.number() })
		.nullable(),
	/** What the roster has short on this gap now; null when the engine could not read it. */
	shortNow: z.array(shortSpanSchema).nullable(),
	options: z.array(optionSchema),
	/**
	 * Why each person with the gap's job title was not assigned; null when the
	 * engine could not work it out. Empty: nobody else holds the job title.
	 */
	notAssigned: z.array(notAssignedPersonSchema).nullable(),
});

/** The engine's answer for one gap: its options, and why nobody else was assigned. */
export type RepairOptions = z.infer<typeof repairOptionsSchema>;

/** The engine's options for `gap` at `expectedRevision`; nothing is written. */
export const fetchRepairOptions = (
	{ companyId, unit, scheduleId }: RosterChangeTarget,
	body: CoverGapRequest & { expectedRevision: number },
	signal?: AbortSignal
): Promise<RepairOptions> =>
	apiRequest(
		`${schedulePath(companyId, unit, scheduleId)}/repair-options`,
		repairOptionsSchema,
		{
			method: "POST",
			body,
			signal,
			timeoutMilliseconds: ENGINE_ANSWER_WAIT_MILLISECONDS,
		}
	);

/**
 * The key one gap's engine options at `revision` are cached under. Not below
 * the schedule's own key, which every refresh of the schedule invalidates:
 * that would ask the engine again at a revision already known to be stale;
 * the next revision is asked afresh under its own key.
 */
export const repairOptionsKey = (
	companyId: string,
	scheduleId: string,
	gap: CoverGapRequest,
	revision: number
): readonly [
	"scheduling",
	string,
	"repairOptions",
	string,
	string,
	string,
	number,
] =>
	[
		SCHEDULING_QUERY_ROOT,
		companyId,
		"repairOptions",
		scheduleId,
		gap.shiftId,
		gap.day,
		revision,
	] as const;

/** How long one gap's engine options are kept: reopening the same gap at the same revision shows them again. */
const REPAIR_OPTIONS_KEPT_MS = 5 * 60 * 1000;

/**
 * The engine's options for `gap` at `revision`, asked for only while `asked`
 * (Find cover asks as it opens, but not while a change lands). Kept for a
 * while under the gap and revision, so reopening the gap does not solve
 * again; never asked again by itself when the window regains focus or the
 * network returns.
 */
export const repairOptionsQuery = (
	target: RosterChangeTarget,
	gap: CoverGapRequest,
	revision: number,
	asked: boolean
): QueryOptionsFor<RepairOptions, ReturnType<typeof repairOptionsKey>> =>
	queryOptions({
		queryKey: repairOptionsKey(
			target.companyId,
			target.scheduleId,
			gap,
			revision
		),
		queryFn: asked
			? ({ signal }): Promise<RepairOptions> =>
					fetchRepairOptions(
						target,
						{ ...gap, expectedRevision: revision },
						signal
					)
			: skipToken,
		meta: administrativeMeta(target.companyId),
		staleTime: REPAIR_OPTIONS_KEPT_MS,
		gcTime: REPAIR_OPTIONS_KEPT_MS,
		retry: false,
		// A solve takes seconds and the answer belongs to its revision: never asked again by itself.
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
	});
