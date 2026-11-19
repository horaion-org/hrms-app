import { queryOptions, skipToken } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/common/api-client";
import type { QueryOptionsFor } from "@/common/query-client";
import type { CoverGapRequest } from "@/features/scheduling/cover/api";
import { schedulePath } from "@/features/scheduling/paths";
import type { RosterChangeTarget } from "@/features/scheduling/rosterChanges/useRosterChangeActions";
import { scheduleKey } from "@/features/scheduling/schedules/api";
import { administrativeMeta } from "@/features/workspace/queryAccess";

/*
 * The scheduling engine's repair options for one short shift (the API's
 * `…/repair-options`, engine ADR-0018), under `schedule:edit_shift`: the
 * engine's own ways to fill the gap the generation left, against the roster
 * as it stands now. Nothing is stored, and the engine checks no
 * working-time rule, so every option says so.
 */

// A kind a newer API adds still reads, as a change the app can't describe yet.
const moveKindSchema = z
	.enum(["REASSIGN", "CALL_IN", "OVERTIME_EXTENSION", "UNKNOWN"])
	.catch("UNKNOWN");

/** What one move does: a move between shifts, a call-in on a day off, or a shift stretched into overtime. */
export type RepairMoveKind = z.infer<typeof moveKindSchema>;

/** A span of local time, `yyyy-MM-ddTHH:mm:ss`; an end the engine wrote unreadably is null. */
const spanSchema = z.object({
	start: z.string().nullable(),
	end: z.string().nullable(),
});

/** A span of local time; an unreadable end is null. */
export type RepairSpan = z.infer<typeof spanSchema>;

const moveSchema = z.object({
	kind: moveKindSchema,
	/** Null for someone the roster no longer names. */
	membershipId: z.string().nullable(),
	displayName: z.string().nullable(),
	/** Where a move between shifts leaves (a frozen shift's id and name); null for the other kinds. */
	fromShiftId: z.string().nullable(),
	fromShiftName: z.string().nullable(),
	fromDate: z.string().nullable(),
	/** The frozen shift worked after the move, its name, and its day. */
	shiftId: z.string().nullable(),
	shiftName: z.string().nullable(),
	date: z.string().nullable(),
	period: spanSchema,
	/** How long a stretch is; null for the other kinds. */
	extensionMinutes: z.number().nullable(),
	/**
	 * Which edge of the shift a stretch hangs off (the API's ADR-0110): the
	 * person starts early, or stays on after it. Null for the other kinds, for
	 * a side the API does not know, and absent from an older API.
	 */
	side: z.enum(["BEFORE_SHIFT", "AFTER_SHIFT"]).nullish().catch(null),
});

/** One move of an engine option: who, from where, to which shift and day. */
export type RepairMove = z.infer<typeof moveSchema>;

const optionSchema = z.object({
	feasible: z.boolean(),
	/** Always false tonight: the engine checks no working-time rule. */
	workingTimeRulesChecked: z.boolean(),
	moves: z.array(moveSchema),
	/** The engine's own sentences, quoted, never the app's copy. */
	summary: z.string().nullable(),
	infeasibleReason: z.string().nullable(),
	/** The gap's spans this option still leaves short. */
	leftShort: z.array(spanSchema),
	leftShortBy: z.number().nullable(),
	warnings: z.array(z.string()),
	/**
	 * What the option does, as the engine names it ("call_in", "move", or one
	 * added later); absent from the older repair.
	 */
	kind: z.string().nullish(),
	/**
	 * How the person's minutes of each kind change that week if the option is
	 * applied, all 0 when it costs no extra hours; absent from the older repair.
	 */
	extraMinutes: z
		.object({
			overtime: z.number(),
			restDayWork: z.number(),
			timeOffEarned: z.number(),
		})
		.nullish(),
});

/** One of the engine's ways to fill the gap, or its honest no. */
export type RepairOption = z.infer<typeof optionSchema>;

/** An option's extra minutes that week, by kind. */
export type RepairExtraMinutes = NonNullable<RepairOption["extraMinutes"]>;

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
	/** Whether they could take the shift after all. */
	couldTake: z.boolean(),
	reasons: z.array(notAssignedReasonSchema),
});

/** Someone with the gap's job title who was not assigned, and why. */
export type NotAssignedPerson = z.infer<typeof notAssignedPersonSchema>;

const repairOptionsSchema = z.object({
	conflictId: z.string(),
	options: z.array(optionSchema),
	/**
	 * Why each person with the gap's job title was not assigned; null when the
	 * engine could not work it out, and from an older API. Empty: nobody else
	 * holds the job title.
	 */
	notAssigned: z.array(notAssignedPersonSchema).nullable().default(null),
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
		{ method: "POST", body, signal }
	);

/** The key one gap's engine options at `revision` are cached under, below the schedule's own. */
export const repairOptionsKey = (
	companyId: string,
	scheduleId: string,
	gap: CoverGapRequest,
	revision: number
): readonly [
	"scheduling",
	string,
	"schedules",
	string,
	"repairOptions",
	string,
	string,
	number,
] =>
	[
		...scheduleKey(companyId, scheduleId),
		"repairOptions",
		gap.shiftId,
		gap.day,
		revision,
	] as const;

/**
 * The engine's options for `gap`, asked for only once `asked` (the engine
 * takes a moment, so a button asks); never cached past its use, as Find
 * cover's own list.
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
		staleTime: 0,
		gcTime: 0,
		retry: false,
	});
