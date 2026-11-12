import { dateTimeFormatIn } from "@/common/dateTimeFormatIn";
import { minutesOfDay, TIME_STEP_MINUTES, timeOfDay } from "@/common/timeOfDay";
import type {
	CoverOffer,
	CoverOptionKind,
} from "@/features/scheduling/coverOffers/api";
import { isoDateIn } from "@/features/scheduling/roster/roster";
import {
	rosterCellKey,
	type RosterEditChoice,
} from "@/features/scheduling/rosterChanges/rosterEdit";
import {
	hoursFromMinutes,
	paidShiftHours,
} from "@/features/scheduling/scheduleDraft";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";

/*
 * What cover offers show when, without any I/O: which cell-panel changes
 * need the member's yes, how an offer reads (its pay in words, where it
 * stands), which offers the member's card and the manager's Issues list
 * show, and the instant a recorded yes was given.
 */

/** A kind the app sends: never the UNKNOWN a newer API's value reads as. */
export type SentOptionKind = Exclude<CoverOptionKind, "UNKNOWN">;

/** At most this many offers race for one gap (R2); the API refuses a fourth. */
export const MAX_PARALLEL_OFFERS = 3;

/**
 * The offer kind a cell-panel change is when it needs the member's yes, or
 * undefined when it keeps Apply. Only a published roster asks, and only for
 * a change that adds or moves work: another shift on a working day (MOVE),
 * a shift on a day they don't work (OFF_DAY_SHIFT), whatever its type and
 * absent days too. A day off, a swap and the roster half of a leave move
 * keep "Apply and notify" (Q1 = A). A day's type is data the app doesn't
 * branch on, so it never sends REST_DAY_SHIFT.
 */
export const consentKindOf = ({
	published,
	assignment,
	choice,
	leaveMove,
}: {
	published: boolean;
	assignment: Pick<ScheduleAssignment, "shift" | "offReason">;
	choice: RosterEditChoice | undefined;
	leaveMove: boolean;
}): SentOptionKind | undefined => {
	if (!published || leaveMove || choice?.kind !== "shift") return undefined;
	if (assignment.offReason === "LEAVE") return undefined;
	return assignment.shift === null ? "OFF_DAY_SHIFT" : "MOVE";
};

/** The member's open offer for one day, if any: the API allows one per member and day. */
export const openOfferOf = (
	offers: ReadonlyArray<CoverOffer>,
	membershipId: string | null,
	day: string
): CoverOffer | undefined =>
	membershipId === null
		? undefined
		: offers.find(
				(offer) =>
					offer.status === "OPEN" &&
					offer.rosterDate === day &&
					offer.member?.membershipId === membershipId
			);

/** The other members' open offers for the same gap: the same day and shift. */
export const rivalOffers = (
	offers: ReadonlyArray<CoverOffer>,
	gap: { day: string; shiftId: string; membershipId: string | null }
): Array<CoverOffer> =>
	offers.filter(
		(offer) =>
			offer.status === "OPEN" &&
			offer.rosterDate === gap.day &&
			offer.shift?.shiftId === gap.shiftId &&
			offer.member?.membershipId !== gap.membershipId
	);

/**
 * The open offer a new one joins, so the first yes wins: a rival of the same
 * kind whose group has room. Undefined sends it on its own; a yes on either
 * still withdraws the other, as both cover the same gap.
 */
export const parallelToOf = (
	rivals: ReadonlyArray<CoverOffer>,
	kind: SentOptionKind
): string | undefined => {
	const sameKind = rivals.filter((offer) => offer.optionKind === kind);
	const roomy = sameKind.find(
		(offer) =>
			sameKind.filter((other) => other.groupId === offer.groupId).length <
			MAX_PARALLEL_OFFERS
	);
	return roomy?.offerId;
};

/** How an offer's pay reads in words (Q3 = A: the kind, no multipliers). */
export type PayWords =
	| { key: "sameHours" }
	| { key: "longer" }
	| { key: "withinContract" }
	| { key: "extraHours"; hours: number }
	| { key: "overtime"; hours: number }
	| { key: "restDay" }
	| { key: "unknown" };

/**
 * A shift on a day off reads by what it adds to the member's week, as the
 * API's hours ledger says: overtime, a part-timer's extra hours, or within
 * contracted hours. Without the API's pay (an older API) every such shift
 * reads as overtime, as before.
 */
const dayOffPayWords = (offer: Pick<CoverOffer, "shift" | "pay">): PayWords => {
	if (!offer.pay)
		return offer.shift
			? { key: "overtime", hours: paidShiftHours(offer.shift) }
			: { key: "unknown" };
	if (offer.pay.overtimeMinutes > 0)
		return {
			key: "overtime",
			hours: hoursFromMinutes(offer.pay.overtimeMinutes),
		};
	if (offer.pay.extraMinutes > 0)
		return {
			key: "extraHours",
			hours: hoursFromMinutes(offer.pay.extraMinutes),
		};
	return { key: "withinContract" };
};

export const payWordsOf = (
	offer: Pick<CoverOffer, "optionKind" | "shift" | "pay">
): PayWords => {
	switch (offer.optionKind) {
		case "MOVE":
			return { key: "sameHours" };
		case "STRETCH":
			return { key: "longer" };
		case "OFF_DAY_SHIFT":
			return dayOffPayWords(offer);
		case "REST_DAY_SHIFT":
			return { key: "restDay" };
		default:
			return { key: "unknown" };
	}
};

/**
 * Where an offer stands for whoever reads it, with the time that goes with
 * it. An open offer past its deadline reads as expired before the API's
 * sweep catches up; a WITHDRAWN one doesn't say whether someone else took
 * the gap or the manager withdrew it, as the API doesn't either.
 */
export type OfferStanding =
	| { kind: "open"; until: string | null }
	| { kind: "accepted"; at: string | null }
	| { kind: "declined"; at: string | null }
	| { kind: "expired"; at: string | null }
	| { kind: "withdrawn" }
	| { kind: "unavailable" };

export const offerStanding = (
	offer: Pick<CoverOffer, "status" | "expiresAt" | "answeredAt">,
	now: Date
): OfferStanding => {
	switch (offer.status) {
		case "OPEN":
			return offer.expiresAt !== null &&
				new Date(offer.expiresAt).getTime() <= now.getTime()
				? { kind: "expired", at: offer.expiresAt }
				: { kind: "open", until: offer.expiresAt };
		case "ACCEPTED":
		case "APPLIED":
			return { kind: "accepted", at: offer.answeredAt };
		case "DECLINED":
			return { kind: "declined", at: offer.answeredAt };
		case "EXPIRED":
			return { kind: "expired", at: offer.expiresAt };
		case "WITHDRAWN":
			return { kind: "withdrawn" };
		default:
			return { kind: "unavailable" };
	}
};

/** What the member's roster page shows on cards: the offers, and whether the linked one couldn't be found. */
export type CardOffers = {
	offers: Array<CoverOffer>;
	linkedMissing: boolean;
};

/**
 * The offers the member's roster page shows as cards: every open one on this
 * roster, by day, and the one a link named (`?offer=`) whatever its status,
 * so its outcome can be read. At rest closed offers don't linger.
 */
export const cardOffers = (
	offers: ReadonlyArray<CoverOffer>,
	scheduleId: string,
	linkedOfferId: string | undefined,
	now: Date
): CardOffers => {
	const shown = offers.filter(
		(offer) =>
			offer.scheduleId === scheduleId &&
			(offer.offerId === linkedOfferId ||
				offerStanding(offer, now).kind === "open")
	);
	return {
		offers: [...shown].sort((a, b) => a.rosterDate.localeCompare(b.rosterDate)),
		linkedMissing:
			linkedOfferId !== undefined &&
			!offers.some((offer) => offer.offerId === linkedOfferId),
	};
};

/** One offer under its gap in the Issues list. */
export type OfferLine = {
	offerId: string;
	name: string | null;
	pay: PayWords;
	standing: "waiting" | "declined" | "expired";
	/** The deadline while waiting, else when it was declined or ran out. */
	at: string | null;
	reason: string | null;
};

/** A gap (one shift on one day) with the offers sent to cover it. */
export type OffersOutGroup = {
	key: string;
	day: string;
	shift: NonNullable<CoverOffer["shift"]>;
	lines: Array<OfferLine>;
	/** How many of its lines still wait for an answer. */
	waiting: number;
};

const lineStanding = (
	offer: CoverOffer,
	now: Date
): OfferLine["standing"] | undefined => {
	const standing = offerStanding(offer, now);
	if (standing.kind === "open") return "waiting";
	if (standing.kind === "declined" || standing.kind === "expired")
		return standing.kind;
	return undefined;
};

/**
 * The Issues list's "Offers out", one group per gap, by day then shift start.
 * A gap a yes filled is left out. Waiting offers always show; a declined or
 * expired one stays as a note while the roster still marks that shift short
 * on that day. Withdrawn offers never show.
 */
export const offersOutGroups = (
	offers: ReadonlyArray<CoverOffer>,
	assignments: ReadonlyArray<
		Pick<ScheduleAssignment, "day" | "uncoveredShift">
	>,
	now: Date
): Array<OffersOutGroup> => {
	const gapKey = (day: string, shiftId: string): string => `${day}|${shiftId}`;
	const shortNow = new Set(
		assignments.flatMap((row) =>
			row.uncoveredShift ? [gapKey(row.day, row.uncoveredShift.shiftId)] : []
		)
	);
	const byGap = new Map<string, Array<CoverOffer>>();
	offers.forEach((offer) => {
		if (!offer.shift) return;
		const key = gapKey(offer.rosterDate, offer.shift.shiftId);
		byGap.set(key, [...(byGap.get(key) ?? []), offer]);
	});
	return [...byGap.entries()]
		.flatMap(([key, gapOffers]): Array<OffersOutGroup> => {
			const first = gapOffers[0];
			if (!first?.shift) return [];
			const filled = gapOffers.some(
				(offer) => offerStanding(offer, now).kind === "accepted"
			);
			if (filled) return [];
			const lines = gapOffers
				.flatMap((offer): Array<OfferLine> => {
					const standing = lineStanding(offer, now);
					if (!standing) return [];
					return [
						{
							offerId: offer.offerId,
							name: offer.member?.displayName ?? null,
							pay: payWordsOf(offer),
							standing,
							at: standing === "declined" ? offer.answeredAt : offer.expiresAt,
							reason: standing === "declined" ? offer.answerReason : null,
						},
					];
				})
				.sort(
					(a, b) =>
						Number(b.standing === "waiting") - Number(a.standing === "waiting")
				);
			const waiting = lines.filter(
				(line) => line.standing === "waiting"
			).length;
			if (lines.length === 0 || (waiting === 0 && !shortNow.has(key)))
				return [];
			return [
				{ key, day: first.rosterDate, shift: first.shift, lines, waiting },
			];
		})
		.sort(
			(a, b) =>
				a.day.localeCompare(b.day) ||
				a.shift.startTime.localeCompare(b.shift.startTime)
		);
};

/** Minutes since midnight of `now` on the clock of `timeZone`. */
const minutesNowIn = (now: Date, timeZone: string): number => {
	const parts = dateTimeFormatIn("en-GB", timeZone, {
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	}).formatToParts(now);
	const part = (type: Intl.DateTimeFormatPartTypes): number =>
		Number(parts.find((item) => item.type === type)?.value ?? 0);
	return part("hour") * 60 + part("minute");
};

/** The latest time step at or before `now` in `timeZone`: a recorded yes's default "when". */
export const latestTimeStep = (now: Date, timeZone: string): string => {
	const minutes = minutesNowIn(now, timeZone);
	return timeOfDay(minutes - (minutes % TIME_STEP_MINUTES));
};

/**
 * The instant a yes recorded at `time` ("HH:mm", today in `timeZone`) was
 * given, or undefined when that is later than now. Counted back from now,
 * so no zone offset is needed.
 */
export const recordedInstant = (
	now: Date,
	timeZone: string,
	time: string
): string | undefined => {
	const minutesAgo = minutesNowIn(now, timeZone) - minutesOfDay(time);
	if (minutesAgo < 0) return undefined;
	const thisMinute = Math.floor(now.getTime() / 60_000) * 60_000;
	return new Date(thisMinute - minutesAgo * 60_000).toISOString();
};

/**
 * An offer's time on the roster's clock: "15:30" today, else with its day,
 * "Sat, 17 Oct, 15:30". Without a zone (the inbox), the browser's own.
 */
export const formatOfferTime = (
	instant: string,
	language: string,
	timeZone: string | undefined,
	now: Date
): string => {
	const date = new Date(instant);
	const zone = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
	const today = isoDateIn(zone, now) === isoDateIn(zone, date);
	return dateTimeFormatIn(language, zone, {
		...(today ? {} : { weekday: "short", day: "numeric", month: "short" }),
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
};

/**
 * The member's days on this roster with an open offer that has a deadline,
 * as `rosterCellKey` names them, each with that deadline: what the tiles
 * of their own roster add to their labels.
 */
export const offeredDeadlines = (
	offers: ReadonlyArray<CoverOffer>,
	scheduleId: string,
	now: Date
): Map<string, string> =>
	new Map(
		offers.flatMap((offer): Array<[string, string]> => {
			const standing = offerStanding(offer, now);
			return offer.scheduleId === scheduleId &&
				offer.member &&
				standing.kind === "open" &&
				standing.until !== null
				? [
						[
							rosterCellKey(offer.member.membershipId, offer.rosterDate),
							standing.until,
						],
					]
				: [];
		})
	);
