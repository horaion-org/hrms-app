import { queryOptions, skipToken } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/common/api-client";
import type { DepartmentPath } from "@/common/companyPath";
import type { QueryOptionsFor } from "@/common/query-client";
import { schedulePath } from "@/features/scheduling/paths";
import { checkCodeSchema } from "@/features/scheduling/rosterChanges/api";
import type { RosterChangeTarget } from "@/features/scheduling/rosterChanges/useRosterChangeActions";
import { scheduleKey } from "@/features/scheduling/schedules/api";
import { administrativeMeta } from "@/features/workspace/queryAccess";

/*
 * Find cover (repair ladder, phase 1): who on a roster could cover one short
 * shift, ranked by what it costs them, and why everyone else can't, under
 * `schedule:edit_shift`. Nothing is stored and no scheduling rule is checked:
 * an option is applied through the roster-change preview and apply, or as a
 * cover offer, which check it again.
 */

// A value a newer API adds still reads, as the nearest plain one.
const optionKindSchema = z
	.enum(["FREE", "EXTRA_HOURS", "OVERTIME", "UNKNOWN"])
	.catch("UNKNOWN");

/** What covering costs: no extra pay, a part-timer's extra hours, or overtime. */
export type CoverOptionKind = z.infer<typeof optionKindSchema>;

const unavailableReasonSchema = z
	.enum([
		"MEMBER_GONE",
		"ON_LEAVE",
		"NOT_AVAILABLE",
		"ROLE_NOT_HELD",
		"SHIFT_NOT_ON_DAY",
		"NOT_SCHEDULABLE_NOW",
		"ALREADY_WORKING",
		"REST_DAY",
		"OUTSIDE_AVAILABILITY",
		"HOURS_UNKNOWN",
		"UNKNOWN",
	])
	.catch("UNKNOWN");

/** Why someone on the roster can't cover the shift; the first reason only. */
export type CoverUnavailableReason = z.infer<typeof unavailableReasonSchema>;

/** What a shift adds to someone's week, by label, in minutes; shared with cover offers. */
export const payMinutesSchema = z.object({
	normalMinutes: z.number(),
	extraMinutes: z.number(),
	overtimeMinutes: z.number(),
});

export type PayMinutes = z.infer<typeof payMinutesSchema>;

const optionSchema = z.object({
	membershipId: z.string(),
	kind: optionKindSchema,
	/** The change, exactly as a roster-change preview takes it. */
	cells: z.array(
		z.object({
			membershipId: z.string(),
			day: z.string(),
			kind: z.literal("WORK"),
			shiftId: z.string(),
		})
	),
	pay: payMinutesSchema,
	weekMinutes: z.object({
		before: z.number(),
		after: z.number(),
		contract: z.number(),
	}),
	monthOvertimeMinutes: z.object({ before: z.number(), after: z.number() }),
	/** Their shifts on this roster the day before and after, as plain facts. */
	neighbours: z.array(z.object({ day: z.string(), shiftId: z.string() })),
	/** Checks that will ask for a tick, such as working on another roster that day. */
	warnings: z.array(checkCodeSchema),
});

export type CoverOption = z.infer<typeof optionSchema>;

const gapSchema = z.object({
	shiftId: z.string(),
	day: z.string(),
	/** How many people it is short now; 0 once covered elsewhere. */
	shortBy: z.number(),
	/** How many of those are the generation's holes still open. */
	shortSinceGeneration: z.number(),
	/** Whose leave left it short; empty for a viewer who may not see leave. */
	absentMembershipIds: z.array(z.string()),
});

export type CoverGap = z.infer<typeof gapSchema>;

const unavailableSchema = z.object({
	membershipId: z.string(),
	reason: unavailableReasonSchema,
});

export type CoverUnavailable = z.infer<typeof unavailableSchema>;

const coverOptionsSchema = z.object({
	revision: z.number(),
	gap: gapSchema,
	/** Ranked, all of them; the list shows the first five. */
	options: z.array(optionSchema),
	unavailable: z.array(unavailableSchema),
	ruleCheck: z.string(),
});

export type CoverOptions = z.infer<typeof coverOptionsSchema>;

/** The short shift-day the list is for. */
export type CoverGapRequest = { shiftId: string; day: string };

const coverOptionsPath = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string
): string => `${schedulePath(companyId, unit, scheduleId)}/cover-options`;

/** Who could cover `gap` at `expectedRevision`; nothing is written. */
export const fetchCoverOptions = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string,
	body: CoverGapRequest & { expectedRevision: number },
	signal?: AbortSignal
): Promise<CoverOptions> =>
	apiRequest(
		coverOptionsPath(companyId, unit, scheduleId),
		coverOptionsSchema,
		{
			method: "POST",
			body,
			signal,
		}
	);

/** The key one gap's list at `revision` is cached under, below the schedule's own. */
export const coverOptionsKey = (
	companyId: string,
	scheduleId: string,
	gap: CoverGapRequest | undefined,
	revision: number
): readonly [
	"scheduling",
	string,
	"schedules",
	string,
	"coverOptions",
	string | null,
	string | null,
	number,
] =>
	[
		...scheduleKey(companyId, scheduleId),
		"coverOptions",
		gap?.shiftId ?? null,
		gap?.day ?? null,
		revision,
	] as const;

/**
 * The list for `gap`; `gap` undefined asks for nothing. Keyed by the revision,
 * so a roster that moved lists again; never cached past its use.
 */
export const coverOptionsQuery = (
	{ companyId, unit, scheduleId }: RosterChangeTarget,
	gap: CoverGapRequest | undefined,
	revision: number
): QueryOptionsFor<CoverOptions, ReturnType<typeof coverOptionsKey>> =>
	queryOptions({
		queryKey: coverOptionsKey(companyId, scheduleId, gap, revision),
		queryFn: gap
			? ({ signal }): Promise<CoverOptions> =>
					fetchCoverOptions(
						companyId,
						unit,
						scheduleId,
						{ ...gap, expectedRevision: revision },
						signal
					)
			: skipToken,
		meta: administrativeMeta(companyId),
		staleTime: 0,
		gcTime: 0,
		retry: false,
	});
