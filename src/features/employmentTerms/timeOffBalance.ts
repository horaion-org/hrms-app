import { queryOptions, skipToken, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/common/api-client";
import { companyPath } from "@/common/companyPath";
import type { QueryOptionsFor } from "@/common/query-client";
import {
	memberTermsQuery,
	myTermsQuery,
	termsRoot,
} from "@/features/employmentTerms/api";
import { administrativeMeta, selfMeta } from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";

/*
 * A person's time off for extra hours (API ADR-0126): hours past their week
 * on terms that give time off instead of pay add to a balance, and Off in
 * lieu draws on it. The API works the balance out on read; the app shows it.
 */

const timeOffEntrySchema = z.object({
	/** A kind a newer API adds reads as UNKNOWN. */
	kind: z.enum(["EARNED", "TAKEN", "UNKNOWN"]).catch("UNKNOWN"),
	/** For time off earned: the week's Monday. */
	weekStart: z.string().optional(),
	/** For time off taken: the Off in lieu request and its first day. */
	leaveRequestId: z.string().optional(),
	date: z.string().optional(),
	/** Positive when earned, negative when taken. */
	minutes: z.number().int(),
});

/** One line of a time off balance. */
export type TimeOffEntry = z.infer<typeof timeOffEntrySchema>;

const timeOffBalanceSchema = z.object({
	/** Time off earned less time off taken. */
	balanceMinutes: z.number().int(),
	/** Every line, oldest first. */
	entries: z.array(timeOffEntrySchema).catch([]),
});

/** A person's time off balance and its lines. */
export type TimeOffBalance = z.infer<typeof timeOffBalanceSchema>;

/** One person's balance, read where their terms may be read. */
export const fetchMemberTimeOffBalance = (
	companyId: string,
	membershipId: string,
	signal?: AbortSignal
): Promise<TimeOffBalance> =>
	apiRequest(
		`${companyPath(companyId)}/member-profiles/${encodeURIComponent(membershipId)}/time-off-balance`,
		timeOffBalanceSchema,
		{ signal }
	);

/** The caller's own balance. */
export const fetchMyTimeOffBalance = (
	companyId: string,
	signal?: AbortSignal
): Promise<TimeOffBalance> =>
	apiRequest(
		`${companyPath(companyId)}/me/time-off-balance`,
		timeOffBalanceSchema,
		{ signal }
	);

/** One person's balance, beside their terms so a terms change reloads it; `allowed` false asks for nothing. */
export const memberTimeOffBalanceQuery = (
	companyId: string,
	membershipId: string,
	allowed = true
): QueryOptionsFor<
	TimeOffBalance,
	readonly [string, string, "time-off-balance", string]
> =>
	queryOptions({
		queryKey: [
			...termsRoot(companyId),
			"time-off-balance",
			membershipId,
		] as const,
		queryFn: allowed
			? ({ signal }): Promise<TimeOffBalance> =>
					fetchMemberTimeOffBalance(companyId, membershipId, signal)
			: skipToken,
		meta: administrativeMeta(companyId, { record: true }),
		staleTime: 30_000,
		retry,
	});

/** The caller's own balance; `allowed` false asks for nothing. */
export const myTimeOffBalanceQuery = (
	companyId: string,
	allowed = true
): QueryOptionsFor<
	TimeOffBalance,
	readonly [string, string, "time-off-balance"]
> =>
	queryOptions({
		queryKey: [...termsRoot(companyId), "time-off-balance"] as const,
		queryFn: allowed
			? ({ signal }): Promise<TimeOffBalance> =>
					fetchMyTimeOffBalance(companyId, signal)
			: skipToken,
		meta: selfMeta(companyId),
		staleTime: 30_000,
		retry,
	});

/**
 * The balance to show on a profile: when their terms give time off instead
 * of pay, or anything is left to take. Undefined otherwise, while loading,
 * or when it can't be read (an API without the route included).
 */
export const useTimeOffEarned = (
	companyId: string,
	membershipId: string,
	options: { self: boolean; allowed: boolean }
): TimeOffBalance | undefined => {
	// Both reads are declared; only the caller's own, or only the person's, asks the API.
	const ownBalance = useQuery(
		myTimeOffBalanceQuery(companyId, options.allowed && options.self)
	).data;
	const memberBalance = useQuery(
		memberTimeOffBalanceQuery(
			companyId,
			membershipId,
			options.allowed && !options.self
		)
	).data;
	const ownTerms = useQuery(
		myTermsQuery(companyId, options.allowed && options.self)
	).data;
	const memberTerms = useQuery(
		memberTermsQuery(companyId, membershipId, options.allowed && !options.self)
	).data;
	const balance = options.self ? ownBalance : memberBalance;
	const terms = options.self ? ownTerms : memberTerms;
	if (!balance) return undefined;
	const inForce = terms?.inForce;
	const earnsTimeOff =
		inForce != null &&
		"extraHoursPaidAs" in inForce &&
		inForce.extraHoursPaidAs === "TIME_OFF";
	return earnsTimeOff || balance.balanceMinutes !== 0 ? balance : undefined;
};
