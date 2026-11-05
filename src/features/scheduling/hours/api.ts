import {
	queryOptions,
	skipToken,
	type UndefinedInitialDataOptions,
} from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/common/api-client";
import { schedulePath, type DepartmentPath } from "@/features/scheduling/paths";
import { scheduleKey } from "@/features/scheduling/schedules/api";
import { administrativeMeta } from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";

/*
 * A schedule's opening balances (the API's hours ledger): the hours and the
 * overtime each member already worked in the month before this roster, typed
 * once when no roster in Horaion covers those days, so monthly overtime limits
 * count from the 1st. Minutes travel as whole numbers; the grid shows hours.
 */

const openingMemberSchema = z.object({
	memberProfileId: z.string(),
	/** Null when nothing is entered for the month. */
	workedMinutes: z.number().nullable(),
	overtimeMinutes: z.number().nullable(),
	/** The roster's first day the opening was entered for; another week's when entered earlier in the month. */
	enteredAsOf: z.string().nullable(),
	/** A roster already covers this member's earlier days of the month, so nothing is asked. */
	rosteredBefore: z.boolean(),
	/** Whether the opening may be set here. */
	editable: z.boolean(),
});

/** One member's opening balance. */
export type OpeningMember = z.infer<typeof openingMemberSchema>;

const openingBalancesSchema = z.object({
	/** The first day of the month the roster starts in. */
	monthStart: z.string(),
	/** The roster's first day; openings cover the days of the month before it. */
	asOf: z.string(),
	/** False when the roster starts on the 1st: nothing comes before it. */
	applies: z.boolean(),
	members: z.array(openingMemberSchema),
});

/** A schedule's opening balances, as the Generate step shows them. */
export type OpeningBalances = z.infer<typeof openingBalancesSchema>;

/** One changed member, as the save sends them; both figures null clears the opening entered here. */
export type OpeningEntry = {
	memberProfileId: string;
	workedMinutes: number | null;
	overtimeMinutes: number | null;
};

const openingBalancesPath = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string
): string => `${schedulePath(companyId, unit, scheduleId)}/opening-balances`;

/** A schedule's opening balances. */
export const fetchOpeningBalances = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string,
	signal?: AbortSignal
): Promise<OpeningBalances> =>
	apiRequest(
		openingBalancesPath(companyId, unit, scheduleId),
		openingBalancesSchema,
		{ signal }
	);

/** Applies the changed members' openings; everyone else keeps theirs. Answers them as they now stand. */
export const saveOpeningBalances = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string,
	openings: Array<OpeningEntry>
): Promise<OpeningBalances> =>
	apiRequest(
		openingBalancesPath(companyId, unit, scheduleId),
		openingBalancesSchema,
		{
			method: "PUT",
			body: { openings },
		}
	);

/** The key a schedule's opening balances are cached under, below the schedule's own. */
export const openingBalancesKey = (
	companyId: string,
	scheduleId: string
): readonly ["scheduling", string, "schedules", string, "opening-balances"] =>
	[...scheduleKey(companyId, scheduleId), "opening-balances"] as const;

/** A schedule's opening balances; `unit` undefined, or `allowed` false, asks for nothing. */
export const openingBalancesQuery = (
	companyId: string,
	unit: DepartmentPath | undefined,
	scheduleId: string,
	allowed = true
): UndefinedInitialDataOptions<
	OpeningBalances,
	Error,
	OpeningBalances,
	ReturnType<typeof openingBalancesKey>
> =>
	queryOptions({
		queryKey: openingBalancesKey(companyId, scheduleId),
		queryFn:
			allowed && unit
				? ({ signal }): Promise<OpeningBalances> =>
						fetchOpeningBalances(companyId, unit, scheduleId, signal)
				: skipToken,
		meta: administrativeMeta(companyId),
		staleTime: 30_000,
		retry,
	});
