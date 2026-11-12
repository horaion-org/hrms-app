import {
	queryOptions,
	skipToken,
	type QueryClient,
} from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest, apiRequestVoid } from "@/common/api-client";
import { companyPath } from "@/common/companyPath";
import type { QueryOptionsFor } from "@/common/query-client";
import { WEEKDAYS } from "@/common/weekdays";
import type { IsoDate } from "@/components/forms/Calendar";
import { SCHEDULING_QUERY_ROOT } from "@/features/scheduling/paths";
import { administrativeMeta, selfMeta } from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";

/*
 * Employment terms: the working week each kind of contract sets (working
 * days, normal hours a week and a day, the rest day, shift work, and whether
 * the Employment Act's hour limits apply), and which terms each person works
 * on from which date. The catalogue is read and changed under
 * `employment_terms:read`/`:update`, held company-wide; a person's terms
 * under `member_employment_terms:read`/`:update` where their profile is
 * filed. Hours travel as whole minutes; the app shows them as hours.
 */

// A value a newer API adds reads as UNKNOWN instead of failing the whole answer.
const termsStatusSchema = z
	.enum(["ACTIVE", "INACTIVE", "UNKNOWN"])
	.catch("UNKNOWN");

const restDaySchema = z
	.enum([...WEEKDAYS, "ROSTERED", "UNKNOWN"])
	.catch("UNKNOWN");

/** A fixed weekday, set on the roster (ROSTERED), or UNKNOWN when newer than the app. */
export type RestDay = z.infer<typeof restDaySchema>;

export type TermsStatus = z.infer<typeof termsStatusSchema>;

/** The fields that say what a working week is; shared by terms, presets and a person's terms in force. */
const weekFieldsSchema = z.object({
	/** Working days a week, in half days; empty for part-time terms without set days. */
	daysPerWeek: z.number().nullable(),
	weekMinutes: z.number().int(),
	/** Normal hours a day; empty when the terms set none. */
	dayMinutes: z.number().int().nullable(),
	/** The most hours a week anyone on the terms is rostered, overtime included; empty for no limit. */
	mostWeekMinutes: z.number().int().nullable().catch(null),
	restDay: restDaySchema,
	/** Overtime also starts past the normal day, not only past the week. */
	dailyOvertime: z.boolean(),
	/** Shift work: no daily overtime, and the week is averaged. */
	shiftWork: z.boolean(),
	/** Whether the Employment Act's hour limits apply to people on these terms. */
	hoursLimitsApply: z.boolean(),
});

/** What a working week is made of, as the summary sentence reads it. */
export type WeekFields = z.infer<typeof weekFieldsSchema>;

const employmentTermsSchema = weekFieldsSchema.extend({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	status: termsStatusSchema,
	/** The terms people without their own are counted under; exactly one is. */
	isDefault: z.boolean(),
});

/** One terms of the company's catalogue. */
export type EmploymentTerms = z.infer<typeof employmentTermsSchema>;

const termsOverviewItemSchema = z
	.object({
		terms: employmentTermsSchema,
		/** People whose terms in force today are these, company-wide (the API's one holder count). */
		holderCount: z.number().int(),
		/** How many more move onto them from a later date. */
		scheduledCount: z.number().int().catch(0),
	})
	.transform(({ terms, holderCount, scheduledCount }) => ({
		...terms,
		holderCount,
		scheduledCount,
	}));

/** A terms as Settings › Employment lists it, with how many people are on it. */
export type TermsOverviewItem = z.infer<typeof termsOverviewItemSchema>;

const termsOverviewSchema = z.object({
	terms: z.array(termsOverviewItemSchema),
});

export type TermsOverview = z.infer<typeof termsOverviewSchema>;

const referenceSchema = z.object({
	/** Below this week, terms are part-time; none when the country has no line. */
	partTimeBelowMinutes: z.number().int().nullable().catch(null),
	/** A full-timer's normal week: where a part-timer's extra hours end and overtime starts. */
	fullTimeWeekMinutes: z.number().int().nullable().catch(null),
	/** The longest normal day terms may set. */
	maxNormalDayMinutes: z.number().int().nullable().catch(null),
});

/** The country's figures the API reads terms against; the app holds none of its own. */
export type TermsReference = z.infer<typeof referenceSchema>;

const termsPresetSchema = weekFieldsSchema.extend({
	key: z.string(),
	name: z.string(),
});

/** A common week to start new terms from, as the company's country has them. */
export type TermsPreset = z.infer<typeof termsPresetSchema>;

const termsPresetsSchema = referenceSchema.extend({
	presets: z.array(termsPresetSchema).catch([]),
});

/** The country's figures and common weeks new terms start from; the app holds none of its own. */
export type TermsPresets = z.infer<typeof termsPresetsSchema>;

/** What creating or saving terms sends. */
export type EmploymentTermsBody = WeekFields & {
	name: string;
	description: string | null;
};

/**
 * How a change to terms people hold applies: corrected for everyone (their
 * hours are counted again under the new week), or as new terms that
 * everyone on them moves to from a Monday.
 */
export type ApplyChange =
	| { mode: "CORRECT" }
	| { mode: "FROM_DATE"; startsOn: IsoDate; newName: string };

const termsChangeSchema = z.object({
	/** The terms left behind, keeping today's figures before the date. */
	previousTerms: employmentTermsSchema,
	newTerms: employmentTermsSchema,
	/** How many people moved to the new terms. */
	moved: z.number().int().catch(0),
	/** How many people's own hours were cleared because they were above the new week. */
	ownHoursCleared: z.number().int().catch(0),
});

export type TermsChange = z.infer<typeof termsChangeSchema>;

const assignmentSourceSchema = z
	.enum([
		"MANUAL",
		"BULK",
		"IMPORT",
		"HIRE",
		"BACKFILL",
		"TERMS_CHANGE",
		"UNKNOWN",
	])
	.catch("UNKNOWN");

/** How an entry of someone's history was made. */
export type AssignmentSource = z.infer<typeof assignmentSourceSchema>;

const termsBasisSchema = z
	.enum(["ASSIGNED", "DEFAULT", "UNKNOWN"])
	.catch("UNKNOWN");

/** ASSIGNED for every member's own entry; DEFAULT only for a day before their first entry. */
export type TermsBasis = z.infer<typeof termsBasisSchema>;

const historyEntrySchema = z.object({
	id: z.string(),
	effectiveFrom: z.string(),
	termsId: z.string(),
	termsName: z.string(),
	contractedWeekMinutes: z.number().int().nullable(),
	contractedDayMinutes: z.number().int().nullable(),
	source: assignmentSourceSchema,
	/** Who last recorded or corrected it; none for entries the system made. Their name is null once they have left. */
	recordedBy: z
		.object({ displayName: z.string().nullable() })
		.nullable()
		.catch(null),
	recordedAt: z.string().nullable().catch(null),
	/** It starts after today, so it can still be cancelled. */
	scheduled: z.boolean(),
});

/** One entry of a person's terms history. */
export type HistoryEntry = z.infer<typeof historyEntrySchema>;

const termsInForceSchema = weekFieldsSchema.extend({
	termsId: z.string(),
	name: z.string(),
	basis: termsBasisSchema,
	/** Their own hours, when they have any; never above the terms. */
	contractedWeekMinutes: z.number().int().nullable(),
	contractedDayMinutes: z.number().int().nullable(),
	/** The day these terms started for them; none when they follow the Default. */
	since: z.string().nullable().catch(null),
});

/** The terms a person works on today. */
export type TermsInForce = z.infer<typeof termsInForceSchema>;

const mismatchSchema = z.object({
	employmentType: z.string(),
	effectiveWeekMinutes: z.number().int(),
});

const memberTermsSchema = z.object({
	/** Null only when the company has no Default, which never happens once set up. */
	inForce: termsInForceSchema.nullable().catch(null),
	/** Their Employment type disagrees with the terms' week (part-time vs full-time); `/me` has none. */
	mismatch: mismatchSchema.nullable().catch(null),
	/** Newest first, the first entry last; `/me` has none. */
	history: z.array(historyEntrySchema).catch([]),
	/** What the terms are read against; absent from an older API. */
	reference: referenceSchema.optional().catch(undefined),
});

/** A person's terms: those in force, how they got them, and their history. */
export type MemberTerms = z.infer<typeof memberTermsSchema>;

/** What giving someone terms from a date, or correcting an entry, sends (POST and PUT share it). */
export type MemberTermsBody = {
	employmentTermsId: string;
	effectiveFrom: IsoDate;
	contractedWeekMinutes: number | null;
	contractedDayMinutes: number | null;
};

const bulkOutcomeSchema = z.object({
	moved: z.number().int(),
	unchanged: z.number().int(),
	skipped: z
		.array(z.object({ membershipId: z.string(), reason: z.string() }))
		.catch([]),
	/** How many were skipped for each reason. */
	skippedByReason: z.record(z.string(), z.number().int()).catch({}),
});

/** What moving many people at once did. */
export type BulkOutcome = z.infer<typeof bulkOutcomeSchema>;

/** The most people one bulk change reaches. */
export const BULK_TERMS_MAX_PEOPLE = 500;

const termsPath = (companyId: string): string =>
	`${companyPath(companyId)}/employment-terms`;

const onePath = (companyId: string, termsId: string): string =>
	`${termsPath(companyId)}/${encodeURIComponent(termsId)}`;

const memberPath = (companyId: string, membershipId: string): string =>
	`${companyPath(companyId)}/member-profiles/${encodeURIComponent(membershipId)}/employment-terms`;

/** Settings › Employment: every terms with its people, and the counts without terms. */
export const fetchTermsOverview = (
	companyId: string,
	signal?: AbortSignal
): Promise<TermsOverview> =>
	apiRequest(`${termsPath(companyId)}/overview`, termsOverviewSchema, {
		signal,
	});

const termsListSchema = z.object({
	terms: z.array(employmentTermsSchema),
	reference: referenceSchema.optional().catch(undefined),
});

/** The pickers' list: terms, and the figures to read them against. */
export type TermsList = z.infer<typeof termsListSchema>;

/** The company's active terms, for pickers. */
export const fetchActiveTerms = (
	companyId: string,
	signal?: AbortSignal
): Promise<TermsList> =>
	apiRequest(`${termsPath(companyId)}?status=ACTIVE`, termsListSchema, {
		signal,
	});

/** Every live terms of the company, active or not, as the People filter names them. */
export const fetchAllTerms = (
	companyId: string,
	signal?: AbortSignal
): Promise<TermsList> =>
	apiRequest(termsPath(companyId), termsListSchema, { signal });

/** The country's figures and the common weeks new terms may start from. */
export const fetchTermsPresets = (
	companyId: string,
	signal?: AbortSignal
): Promise<TermsPresets> =>
	apiRequest(`${termsPath(companyId)}/presets`, termsPresetsSchema, {
		signal,
	});

export const createTerms = (
	companyId: string,
	body: EmploymentTermsBody
): Promise<EmploymentTerms> =>
	apiRequest(termsPath(companyId), employmentTermsSchema, {
		method: "POST",
		body,
	});

/**
 * Saves terms in place. A new working week on terms people hold is refused
 * (`409 EMPLOYMENT_TERMS_HELD`) unless it is a correction for everyone,
 * whose hours are then counted again.
 */
export const correctTerms = (
	companyId: string,
	termsId: string,
	body: EmploymentTermsBody,
	correctForEveryone = false
): Promise<EmploymentTerms> =>
	apiRequest(
		`${onePath(companyId, termsId)}?correctForEveryone=${String(correctForEveryone)}`,
		employmentTermsSchema,
		{ method: "PUT", body }
	);

/**
 * Changes terms from a Monday: new terms with the new week, which everyone
 * on these moves to from that day; these keep today's figures before it,
 * renamed to `previousTermsName` when given.
 */
export const changeTermsFromDate = (
	companyId: string,
	termsId: string,
	body: {
		startsOn: IsoDate;
		newTerms: EmploymentTermsBody;
		previousTermsName?: string;
	}
): Promise<TermsChange> =>
	apiRequest(`${onePath(companyId, termsId)}/changes`, termsChangeSchema, {
		method: "POST",
		body,
	});

export const changeTermsStatus = (
	companyId: string,
	termsId: string,
	status: "ACTIVE" | "INACTIVE"
): Promise<EmploymentTerms> =>
	apiRequest(`${onePath(companyId, termsId)}/status`, employmentTermsSchema, {
		method: "PUT",
		body: { status },
	});

/** Makes these the terms people without their own are counted under; moves nobody. */
export const makeDefaultTerms = (
	companyId: string,
	termsId: string
): Promise<EmploymentTerms> =>
	apiRequest(`${onePath(companyId, termsId)}/default`, employmentTermsSchema, {
		method: "PUT",
	});

/** Deletes terms nobody has ever held. */
export const deleteTerms = (
	companyId: string,
	termsId: string
): Promise<void> =>
	apiRequestVoid(onePath(companyId, termsId), { method: "DELETE" });

/** Moves the chosen people onto terms from a date. */
export const assignTermsInBulk = (
	companyId: string,
	termsId: string,
	body: { membershipIds: ReadonlyArray<string>; effectiveFrom: IsoDate }
): Promise<BulkOutcome> =>
	apiRequest(`${onePath(companyId, termsId)}/assignments`, bulkOutcomeSchema, {
		method: "POST",
		body: { ...body, fromHireDate: false },
	});

export const fetchMemberTerms = (
	companyId: string,
	membershipId: string,
	signal?: AbortSignal
): Promise<MemberTerms> =>
	apiRequest(memberPath(companyId, membershipId), memberTermsSchema, {
		signal,
	});

export const fetchMyTerms = (
	companyId: string,
	signal?: AbortSignal
): Promise<MemberTerms> =>
	apiRequest(
		`${companyPath(companyId)}/me/employment-terms`,
		memberTermsSchema,
		{ signal }
	);

/** Gives someone terms from a date: a new entry of their history. */
export const addMemberTerms = (
	companyId: string,
	membershipId: string,
	body: MemberTermsBody
): Promise<MemberTerms> =>
	apiRequest(memberPath(companyId, membershipId), memberTermsSchema, {
		method: "POST",
		body,
	});

/** Corrects one entry of someone's history in place. */
export const correctMemberTerms = (
	companyId: string,
	membershipId: string,
	entryId: string,
	body: MemberTermsBody
): Promise<MemberTerms> =>
	apiRequest(
		`${memberPath(companyId, membershipId)}/${encodeURIComponent(entryId)}`,
		memberTermsSchema,
		{ method: "PUT", body }
	);

/** Cancels a change that hasn't started yet. */
export const cancelMemberTerms = (
	companyId: string,
	membershipId: string,
	entryId: string
): Promise<void> =>
	apiRequestVoid(
		`${memberPath(companyId, membershipId)}/${encodeURIComponent(entryId)}`,
		{ method: "DELETE" }
	);

/** Every employment terms query of a company starts with this. */
export const termsRoot = (companyId: string): readonly [string, string] =>
	["employment-terms", companyId] as const;

/**
 * Reloads what a change of terms can move: every employment terms query,
 * and the hours ledger's reads that sit under the company's schedules
 * (opening balances), whose figures depend on people's terms.
 */
export const reloadTermsReads = (
	client: QueryClient,
	companyId: string
): Promise<void> =>
	Promise.all([
		client.invalidateQueries({ queryKey: termsRoot(companyId) }),
		client.invalidateQueries({
			queryKey: [SCHEDULING_QUERY_ROOT, companyId],
			predicate: (query) => query.queryKey.includes("opening-balances"),
		}),
	]).then(() => undefined);

/** Settings › Employment's list; `allowed` false asks for nothing. */
export const termsOverviewQuery = (
	companyId: string,
	allowed = true
): QueryOptionsFor<TermsOverview, readonly [string, string, "overview"]> =>
	queryOptions({
		queryKey: [...termsRoot(companyId), "overview"] as const,
		queryFn: allowed
			? ({ signal }): Promise<TermsOverview> =>
					fetchTermsOverview(companyId, signal)
			: skipToken,
		meta: administrativeMeta(companyId),
		staleTime: 30_000,
		retry,
	});

/** The active terms a picker offers; `allowed` false asks for nothing. */
export const activeTermsQuery = (
	companyId: string,
	allowed = true
): QueryOptionsFor<TermsList, readonly [string, string, "active"]> =>
	queryOptions({
		queryKey: [...termsRoot(companyId), "active"] as const,
		queryFn: allowed
			? ({ signal }): Promise<TermsList> => fetchActiveTerms(companyId, signal)
			: skipToken,
		meta: administrativeMeta(companyId),
		staleTime: 60_000,
		retry,
	});

/** Every live terms, for the People filter; `allowed` false asks for nothing. */
export const allTermsQuery = (
	companyId: string,
	allowed = true
): QueryOptionsFor<TermsList, readonly [string, string, "all"]> =>
	queryOptions({
		queryKey: [...termsRoot(companyId), "all"] as const,
		queryFn: allowed
			? ({ signal }): Promise<TermsList> => fetchAllTerms(companyId, signal)
			: skipToken,
		meta: administrativeMeta(companyId),
		staleTime: 60_000,
		retry,
	});

/** The country's figures and the weeks to start from; `allowed` false asks for nothing. */
export const termsPresetsQuery = (
	companyId: string,
	allowed = true
): QueryOptionsFor<TermsPresets, readonly [string, string, "presets"]> =>
	queryOptions({
		queryKey: [...termsRoot(companyId), "presets"] as const,
		queryFn: allowed
			? ({ signal }): Promise<TermsPresets> =>
					fetchTermsPresets(companyId, signal)
			: skipToken,
		meta: administrativeMeta(companyId),
		staleTime: 300_000,
		retry,
	});

/** One person's terms; `allowed` false asks for nothing. */
export const memberTermsQuery = (
	companyId: string,
	membershipId: string,
	allowed = true
): QueryOptionsFor<MemberTerms, readonly [string, string, "member", string]> =>
	queryOptions({
		queryKey: [...termsRoot(companyId), "member", membershipId] as const,
		queryFn: allowed
			? ({ signal }): Promise<MemberTerms> =>
					fetchMemberTerms(companyId, membershipId, signal)
			: skipToken,
		meta: administrativeMeta(companyId, { record: true }),
		staleTime: 30_000,
		retry,
	});

/** The caller's own terms, read-only; `allowed` false asks for nothing. */
export const myTermsQuery = (
	companyId: string,
	allowed = true
): QueryOptionsFor<MemberTerms, readonly [string, string, "me"]> =>
	queryOptions({
		queryKey: [...termsRoot(companyId), "me"] as const,
		queryFn: allowed
			? ({ signal }): Promise<MemberTerms> => fetchMyTerms(companyId, signal)
			: skipToken,
		meta: selfMeta(companyId),
		staleTime: 60_000,
		retry,
	});
