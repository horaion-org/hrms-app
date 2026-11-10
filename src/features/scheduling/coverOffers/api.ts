import { queryOptions, skipToken } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/common/api-client";
import { companyPath } from "@/common/companyPath";
import type { QueryOptionsFor } from "@/common/query-client";
import {
	SCHEDULING_QUERY_ROOT,
	schedulePath,
	type DepartmentPath,
} from "@/features/scheduling/paths";
import type { RosterChangeCell } from "@/features/scheduling/rosterChanges/api";
import {
	scheduleAssignmentSchema,
	scheduleKey,
} from "@/features/scheduling/schedules/api";
import { administrativeMeta, selfMeta } from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";

/*
 * Cover offers (hrms-backend-v2 docs/adr/0066): a change that adds or moves
 * work on a published roster waits for the member's yes. The manager sends
 * the offer, or records a yes given outside the app, under
 * `schedule:edit_shift`; the member reads and answers their own under `/me`.
 * Creating one asks what a roster change asks: the revision previewed, the
 * preview's checks fingerprint and a remark when a check asks for one.
 */

// A value a newer API adds still reads, as the nearest plain one.
const optionKindSchema = z
	.enum(["MOVE", "STRETCH", "OFF_DAY_SHIFT", "REST_DAY_SHIFT", "UNKNOWN"])
	.catch("UNKNOWN");

/** What the member is asked to do: move shift, stay longer, or work a day off or rest day. */
export type CoverOptionKind = z.infer<typeof optionKindSchema>;

const statusSchema = z
	.enum([
		"OPEN",
		"ACCEPTED",
		"DECLINED",
		"EXPIRED",
		"WITHDRAWN",
		"APPLIED",
		"UNKNOWN",
	])
	.catch("UNKNOWN");

/** Where an offer stands. A yes is applied at once, so ACCEPTED reads as APPLIED. */
export type CoverOfferStatus = z.infer<typeof statusSchema>;

/** How a yes given outside the app was given. */
export const RECORDED_HOW = ["PHONE", "IN_PERSON", "MESSAGE"] as const;

export type CoverOfferRecordedHow = (typeof RECORDED_HOW)[number];

const participantSchema = z.object({
	membershipId: z.string(),
	displayName: z.string().nullable(),
});

const cellSchema = z.object({
	membershipId: z.string(),
	day: z.string(),
	kind: z.enum(["WORK", "OFF"]).catch("OFF"),
	shiftId: z.string().nullish(),
});

const coverOfferSchema = z.object({
	offerId: z.string(),
	scheduleId: z.string(),
	/** The day the offer covers, as an ISO date. */
	rosterDate: z.string(),
	/** Null once the member no longer resolves. */
	member: scheduleAssignmentSchema.shape.member,
	/** The frozen shift the member is asked to work that day. */
	shift: scheduleAssignmentSchema.shape.shift,
	optionKind: optionKindSchema,
	cells: z.array(cellSchema),
	status: statusSchema,
	channel: z.enum(["APP", "RECORDED"]).catch("APP"),
	/** The deadline of an offer sent in the app; null for a recorded yes. */
	expiresAt: z.string().nullable(),
	/** The parallel offers it races in: the first yes wins. */
	groupId: z.string(),
	remark: z.string().nullable(),
	/** What the member added to their answer. */
	answerReason: z.string().nullable(),
	answeredAt: z.string().nullable(),
	recordedHow: z.enum(RECORDED_HOW).nullable().catch(null),
	recordedBy: participantSchema.nullable(),
	appliedChangeId: z.string().nullable(),
	createdBy: participantSchema,
	createdAt: z.string(),
});

export type CoverOffer = z.infer<typeof coverOfferSchema>;

const coverOffersSchema = z.array(coverOfferSchema);

/** The longest reason the API keeps with an answer, in characters. */
export const COVER_OFFER_ANSWER_REASON_MAX_LENGTH = 200;

/** What sending an offer, or recording a yes, sends. */
export type CoverOfferBody = {
	optionKind: Exclude<CoverOptionKind, "UNKNOWN">;
	rosterDate: string;
	/** The roster revision previewed. */
	expectedRevision: number;
	/** The cells a yes applies, as the preview sent them. */
	cells: Array<RosterChangeCell>;
	remark?: string;
	/** The preview's `checksFingerprint`, once the checks were ticked. */
	checksFingerprint?: string;
	/** An open offer for the same gap this one races, so the first yes wins. */
	parallelTo?: string;
} & (
	| { send: true; recorded?: never }
	| {
			send?: never;
			/** A yes given outside the app: how, and when (an instant, not in the future). */
			recorded: { how: CoverOfferRecordedHow; when: string };
	  }
);

const coverOffersPath = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string
): string => `${schedulePath(companyId, unit, scheduleId)}/cover-offers`;

const myCoverOffersPath = (companyId: string): string =>
	`${companyPath(companyId)}/me/cover-offers`;

/** Every offer on the schedule, newest first. */
export const fetchCoverOffers = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string,
	signal?: AbortSignal
): Promise<Array<CoverOffer>> =>
	apiRequest(coverOffersPath(companyId, unit, scheduleId), coverOffersSchema, {
		signal,
	});

/** Sends an offer (OPEN), or records a yes and applies it at once (APPLIED). */
export const createCoverOffer = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string,
	body: CoverOfferBody
): Promise<CoverOffer> =>
	apiRequest(coverOffersPath(companyId, unit, scheduleId), coverOfferSchema, {
		method: "POST",
		body,
	});

/** Withdraws an open offer. */
export const withdrawCoverOffer = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string,
	offerId: string
): Promise<CoverOffer> =>
	apiRequest(
		`${coverOffersPath(companyId, unit, scheduleId)}/${encodeURIComponent(offerId)}/withdrawal`,
		coverOfferSchema,
		{ method: "POST" }
	);

/** The caller's own offers, newest 50. */
export const fetchMyCoverOffers = (
	companyId: string,
	signal?: AbortSignal
): Promise<Array<CoverOffer>> =>
	apiRequest(myCoverOffersPath(companyId), coverOffersSchema, { signal });

/** How the member answers: yes applies the change at once; a reason is optional either way. */
export type CoverOfferAnswer = "acceptance" | "decline";

/** Answers one of the caller's own open offers. */
export const answerCoverOffer = (
	companyId: string,
	offerId: string,
	answer: CoverOfferAnswer,
	reason?: string
): Promise<CoverOffer> =>
	apiRequest(
		`${myCoverOffersPath(companyId)}/${encodeURIComponent(offerId)}/${answer}`,
		coverOfferSchema,
		{
			method: "POST",
			body: reason === undefined ? {} : { reason },
		}
	);

/** The key a schedule's offers are cached under, below the schedule's own, so a schedule refresh reads them again. */
export const coverOffersKey = (
	companyId: string,
	scheduleId: string
): readonly ["scheduling", string, "schedules", string, "coverOffers"] =>
	[...scheduleKey(companyId, scheduleId), "coverOffers"] as const;

/** The key the caller's own offers are cached under. */
export const myCoverOffersKey = (
	companyId: string
): readonly ["scheduling", string, "myCoverOffers"] =>
	[SCHEDULING_QUERY_ROOT, companyId, "myCoverOffers"] as const;

/** A schedule's offers; `unit` undefined, or `allowed` false, asks for nothing. */
export const coverOffersQuery = (
	companyId: string,
	unit: DepartmentPath | undefined,
	scheduleId: string,
	allowed: boolean
): QueryOptionsFor<Array<CoverOffer>, ReturnType<typeof coverOffersKey>> =>
	queryOptions({
		queryKey: coverOffersKey(companyId, scheduleId),
		queryFn:
			allowed && unit
				? ({ signal }): Promise<Array<CoverOffer>> =>
						fetchCoverOffers(companyId, unit, scheduleId, signal)
				: skipToken,
		meta: administrativeMeta(companyId),
		staleTime: 30_000,
		retry: false,
	});

/** The caller's own offers. */
export const myCoverOffersQuery = (
	companyId: string
): QueryOptionsFor<Array<CoverOffer>, ReturnType<typeof myCoverOffersKey>> =>
	queryOptions({
		queryKey: myCoverOffersKey(companyId),
		queryFn: ({ signal }): Promise<Array<CoverOffer>> =>
			fetchMyCoverOffers(companyId, signal),
		// Own read: never gated by, or withdrawn for, administrative grants.
		meta: selfMeta(companyId),
		staleTime: 30_000,
		retry,
	});
