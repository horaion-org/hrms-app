import { queryOptions, skipToken } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/common/api-client";
import type { QueryOptionsFor } from "@/common/query-client";
import { schedulePath } from "@/features/scheduling/paths";
import type { RosterChangeTarget } from "@/features/scheduling/rosterChanges/useRosterChangeActions";
import { scheduleKey } from "@/features/scheduling/schedules/api";
import { administrativeMeta } from "@/features/workspace/queryAccess";

/*
 * Validate schedule: whether the roster as it stands keeps the working-time
 * rules, and where it is short of staff, as the scheduling engine checks it
 * (the API's `…/roster-check`, ADR-0082), under `schedule:edit_shift`. A
 * roster can keep every rule and still be short. Nothing is stored.
 */

// A status a newer API adds reads as not checked, never as holding.
const statusSchema = z
	.enum(["HOLDS", "BROKEN", "UNCHECKED"])
	.catch("UNCHECKED");

/** Every rule holds, at least one is broken, or the engine could not check. */
export type RosterRulesCheckStatus = z.infer<typeof statusSchema>;

const brokenRuleSchema = z.object({
	/** The engine's snake_case rule name, e.g. `most_minutes_a_day`. */
	rule: z.string(),
	constraintId: z.string().nullable(),
	/** The company constraint's own name, when the engine's id is one of the schedule's. */
	constraintName: z.string().nullable(),
});

export type BrokenRule = z.infer<typeof brokenRuleSchema>;

const staffingGapSchema = z.object({
	date: z.string(),
	/** The engine's own sentence for the gap, quoted. */
	message: z.string().nullable(),
	missing: z.number().nullable(),
	constraintId: z.string().nullable(),
	/** The company constraint's own name, when the gap's rule is one of the schedule's. */
	constraintName: z.string().nullable(),
});

export type StaffingGap = z.infer<typeof staffingGapSchema>;

const rosterRulesCheckSchema = z.object({
	status: statusSchema,
	/** The rules broken the engine could name; empty unless broken, and possibly empty then. */
	brokenRules: z.array(brokenRuleSchema),
	/** The roster's staffing gaps; null when the engine could not work them out. */
	staffingGaps: z.array(staffingGapSchema).nullable(),
});

export type RosterRulesCheck = z.infer<typeof rosterRulesCheckSchema>;

/** Checks the roster at `expectedRevision`; nothing is written. */
export const fetchRosterRulesCheck = (
	{ companyId, unit, scheduleId }: RosterChangeTarget,
	body: { expectedRevision: number },
	signal?: AbortSignal
): Promise<RosterRulesCheck> =>
	apiRequest(
		`${schedulePath(companyId, unit, scheduleId)}/roster-check`,
		rosterRulesCheckSchema,
		{ method: "POST", body, signal }
	);

/** The key one revision's check is cached under, below the schedule's own. */
export const rosterRulesCheckKey = (
	companyId: string,
	scheduleId: string,
	revision: number
): readonly ["scheduling", string, "schedules", string, "rulesCheck", number] =>
	[...scheduleKey(companyId, scheduleId), "rulesCheck", revision] as const;

/**
 * The check at `revision`, asked for only once `asked` (the engine takes a
 * moment, so a button asks); never cached past its use.
 */
export const rosterRulesCheckQuery = (
	target: RosterChangeTarget,
	revision: number,
	asked: boolean
): QueryOptionsFor<RosterRulesCheck, ReturnType<typeof rosterRulesCheckKey>> =>
	queryOptions({
		queryKey: rosterRulesCheckKey(
			target.companyId,
			target.scheduleId,
			revision
		),
		queryFn: asked
			? ({ signal }): Promise<RosterRulesCheck> =>
					fetchRosterRulesCheck(target, { expectedRevision: revision }, signal)
			: skipToken,
		meta: administrativeMeta(target.companyId),
		staleTime: 0,
		gcTime: 0,
		retry: false,
	});
