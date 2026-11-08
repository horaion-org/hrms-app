import type {
	CoverOffer,
	CoverOfferBody,
	CoverOfferRecordedHow,
} from "@/features/scheduling/coverOffers/api";
import {
	coverOfferRefusal,
	type CoverOfferRefusal,
} from "@/features/scheduling/coverOffers/coverOfferRefusal";
import {
	consentKindOf,
	openOfferOf,
	parallelToOf,
	rivalOffers,
	type SentOptionKind,
} from "@/features/scheduling/coverOffers/coverOfferRules";
import { useCoverOfferActions } from "@/features/scheduling/coverOffers/useCoverOfferActions";
import type { RosterChangeBody } from "@/features/scheduling/rosterChanges/api";
import type { RosterEditChoice } from "@/features/scheduling/rosterChanges/rosterEdit";
import type { RosterChangeTarget } from "@/features/scheduling/rosterChanges/useRosterChangeActions";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";

/** What the cell panel knows when it asks about offers for its day. */
export type CellCoverOfferInput = {
	target: RosterChangeTarget;
	/** The schedule's offers; undefined on a roster that asks nobody (a draft). */
	offers: ReadonlyArray<CoverOffer> | undefined;
	published: boolean;
	assignment: ScheduleAssignment;
	choice: RosterEditChoice | undefined;
	leaveMove: boolean;
	/** The change previewed, as the panel sends it to the preview. */
	body: RosterChangeBody | undefined;
	/** The preview's fingerprint; null until previewed or when no check asks for a tick. */
	checksFingerprint: string | null;
	remark: string;
	/** The checks changed under the offer: preview again. */
	onChecksChanged: () => void;
	/** A recorded yes applied the change. */
	onRecorded?: () => void;
};

export type CellCoverOffer = {
	/** The offer kind the chosen change is, when it needs the member's yes. */
	consentKind: SentOptionKind | undefined;
	/** The member's open offer for this day, already out. */
	openOffer: CoverOffer | undefined;
	/** The offer this panel just sent, shown in place of the review. */
	justSent: CoverOffer | undefined;
	/** Other members' open offers for the same gap. */
	rivals: Array<CoverOffer>;
	createPending: "send" | "record" | undefined;
	createRefusal: CoverOfferRefusal | undefined;
	withdrawing: boolean;
	withdrawRefusal: CoverOfferRefusal | undefined;
	send: () => void;
	record: (recorded: { how: CoverOfferRecordedHow; when: string }) => void;
	withdraw: (offerId: string) => void;
	/** Forgets the last result, as a new choice does. */
	reset: () => void;
};

/**
 * The cover offer side of one roster day in the cell panel: whether the
 * chosen change needs the member's yes, what is already out for the day
 * and its gap, and the send, record and withdraw actions. Sending reuses
 * the preview's revision, cells and fingerprint and the panel's remark,
 * so an offer asks exactly what an edit would.
 */
export const useCellCoverOffer = ({
	target,
	offers = [],
	published,
	assignment,
	choice,
	leaveMove,
	body,
	checksFingerprint,
	remark,
	onChecksChanged,
	onRecorded,
}: CellCoverOfferInput): CellCoverOffer => {
	const { create, withdraw } = useCoverOfferActions(target);
	const membershipId = assignment.member?.membershipId ?? null;
	const consentKind = consentKindOf({
		published,
		assignment,
		choice,
		leaveMove,
	});
	const rivals =
		consentKind && choice?.kind === "shift"
			? rivalOffers(offers, {
					day: assignment.day,
					shiftId: choice.shiftId,
					membershipId,
				})
			: [];

	const createOffer = (
		channel:
			| { send: true }
			| { recorded: { how: CoverOfferRecordedHow; when: string } }
	): void => {
		if (!body || !consentKind) return;
		const parallelTo =
			"send" in channel ? parallelToOf(rivals, consentKind) : undefined;
		const offerBody: CoverOfferBody = {
			optionKind: consentKind,
			rosterDate: assignment.day,
			expectedRevision: body.expectedRevision,
			cells: body.cells,
			remark: remark.trim() === "" ? undefined : remark.trim(),
			checksFingerprint: checksFingerprint ?? undefined,
			...(parallelTo ? { parallelTo } : {}),
			...channel,
		};
		create.mutate(offerBody, {
			onSuccess: (offer) => {
				if (offer.status !== "OPEN") onRecorded?.();
			},
			onError: (error) => {
				if (coverOfferRefusal(error) === "checksChanged") onChecksChanged();
			},
		});
	};

	return {
		consentKind,
		openOffer: openOfferOf(offers, membershipId, assignment.day),
		justSent: create.data?.status === "OPEN" ? create.data : undefined,
		rivals,
		createPending: create.isPending
			? create.variables.send
				? "send"
				: "record"
			: undefined,
		createRefusal: create.error ? coverOfferRefusal(create.error) : undefined,
		withdrawing: withdraw.isPending,
		withdrawRefusal: withdraw.error
			? coverOfferRefusal(withdraw.error)
			: undefined,
		send: (): void => {
			createOffer({ send: true });
		},
		record: (recorded): void => {
			createOffer({ recorded });
		},
		withdraw: (offerId): void => {
			withdraw.mutate(offerId, {
				onSuccess: () => {
					create.reset();
				},
			});
		},
		reset: (): void => {
			create.reset();
			withdraw.reset();
		},
	};
};
