import { queryOptions, skipToken } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/common/api-client";
import type { QueryOptionsFor } from "@/common/query-client";
import { schedulePath } from "@/features/scheduling/paths";
import type { RosterChangeTarget } from "@/features/scheduling/rosterChanges/useRosterChangeActions";
import {
	findingsConflictSchema,
	findingsMemberSchema,
	findingsViolationSchema,
	scheduleKey,
	type FindingsConflict,
} from "@/features/scheduling/schedules/api";
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
	/**
	 * Who and which days, in the shape a generation's findings carry their
	 * violations (one per person and day); null when the engine cannot say,
	 * and from an older API.
	 */
	violations: z.array(findingsViolationSchema).nullable().default(null),
});

/** One working-time rule the roster breaks, or does not meet "if possible", by the engine's name and the constraint behind it. */
export type BrokenRule = z.infer<typeof brokenRuleSchema>;

/** Who and which day a rule is not kept, as a generation's findings say it. */
export type RuleViolation = z.infer<typeof findingsViolationSchema>;

/** A staffing gap of the roster as it stands, in the shape a generation's findings carry its conflicts. */
export type StaffingGap = FindingsConflict;

const rosterRulesCheckSchema = z.object({
	status: statusSchema,
	/** The rules broken the engine could name; empty unless broken, and possibly empty then. */
	brokenRules: z.array(brokenRuleSchema),
	/** The roster's staffing gaps, read as the Issues list reads a generation's; null when not worked out. */
	staffingGaps: z.array(findingsConflictSchema).nullable(),
	/**
	 * The rules asked "if possible" that the roster does not meet; they never
	 * change the status. Null when not worked out, and from an older API.
	 */
	notMet: z.array(brokenRuleSchema).nullable().default(null),
	/** Every member the violations name, as a generation's findings list theirs. */
	members: z.array(findingsMemberSchema).default([]),
	/** Whether the engine ran out of time, so the lists may be incomplete. */
	mayBeShort: z.boolean().default(false),
});

/** Validate schedule's answer: whether the rules hold, which are broken, and the staffing gaps. */
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
 * moment); never cached past its use, and never asked again by itself when
 * the window regains focus or the network returns.
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
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
	});
