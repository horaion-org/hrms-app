import {
	useMutation,
	useQueryClient,
	type UseMutationResult,
} from "@tanstack/react-query";
import {
	answerCoverOffer,
	coverOffersKey,
	createCoverOffer,
	myCoverOffersKey,
	withdrawCoverOffer,
	type CoverOffer,
	type CoverOfferBody,
} from "@/features/scheduling/coverOffers/api";
import { coverOfferRefusal } from "@/features/scheduling/coverOffers/coverOfferRefusal";
import { myRosterKey } from "@/features/scheduling/myRoster/api";
import type { RosterChangeTarget } from "@/features/scheduling/rosterChanges/useRosterChangeActions";
import { scheduleKey } from "@/features/scheduling/schedules/api";

export type CoverOfferActions = {
	/** Sends an offer, or records a yes (which applies the change at once). */
	create: UseMutationResult<CoverOffer, Error, CoverOfferBody>;
	withdraw: UseMutationResult<CoverOffer, Error, string>;
};

/**
 * The manager's offer actions on one schedule. A sent or withdrawn offer
 * refreshes the schedule's offers; a recorded yes changed the roster, so it
 * refreshes the whole schedule, offers included. A refusal that says the
 * roster or the offer moved refreshes them too.
 */
export const useCoverOfferActions = ({
	companyId,
	unit,
	scheduleId,
}: Pick<
	RosterChangeTarget,
	"companyId" | "unit" | "scheduleId"
>): CoverOfferActions => {
	const client = useQueryClient();
	const refreshOffers = (): Promise<void> =>
		client.invalidateQueries({
			queryKey: coverOffersKey(companyId, scheduleId),
		});
	const refreshSchedule = (): Promise<void> =>
		client.invalidateQueries({ queryKey: scheduleKey(companyId, scheduleId) });
	const refreshWhenMoved = async (error: Error): Promise<void> => {
		const refusal = coverOfferRefusal(error);
		if (refusal === "revision" || refusal === "stale") await refreshSchedule();
		else if (refusal === "notOpen" || refusal === "alreadyOpen")
			await refreshOffers();
	};
	return {
		create: useMutation({
			meta: { successMessage: false },
			mutationFn: (body: CoverOfferBody) =>
				createCoverOffer(companyId, unit, scheduleId, body),
			onSuccess: (offer) =>
				offer.status === "OPEN" ? refreshOffers() : refreshSchedule(),
			onError: refreshWhenMoved,
		}),
		withdraw: useMutation({
			meta: { successMessage: "scheduling.coverOffers.actions.withdrawn" },
			mutationFn: (offerId: string) =>
				withdrawCoverOffer(companyId, unit, scheduleId, offerId),
			onSuccess: refreshOffers,
			onError: refreshWhenMoved,
		}),
	};
};

/** Which offer is answered, with what the member adds (optional). */
export type CoverOfferAnswerInput = { offerId: string; reason?: string };

export type MyCoverOfferAnswers = {
	/** One tap (Q2 = A): the card is the review. Applies the change at once. */
	accept: UseMutationResult<CoverOffer, Error, CoverOfferAnswerInput>;
	decline: UseMutationResult<CoverOffer, Error, CoverOfferAnswerInput>;
};

/**
 * The member's answers to their own offers. Either answer refreshes their
 * offers; a yes changed their roster, so it refreshes the roster too. A
 * refusal (stale, no longer open) refreshes the offers, which then say why.
 */
export const useMyCoverOfferAnswers = (
	companyId: string,
	scheduleId: string
): MyCoverOfferAnswers => {
	const client = useQueryClient();
	const refreshOffers = (): Promise<void> =>
		client.invalidateQueries({ queryKey: myCoverOffersKey(companyId) });
	return {
		accept: useMutation({
			meta: { successMessage: "scheduling.coverOffers.card.accepted" },
			mutationFn: ({ offerId, reason }: CoverOfferAnswerInput) =>
				answerCoverOffer(companyId, offerId, "acceptance", reason),
			onSuccess: async () => {
				await Promise.all([
					refreshOffers(),
					client.invalidateQueries({
						queryKey: myRosterKey(companyId, scheduleId),
					}),
				]);
			},
			onError: refreshOffers,
		}),
		decline: useMutation({
			meta: { successMessage: "scheduling.coverOffers.card.declineSent" },
			mutationFn: ({ offerId, reason }: CoverOfferAnswerInput) =>
				answerCoverOffer(companyId, offerId, "decline", reason),
			onSuccess: refreshOffers,
			onError: refreshOffers,
		}),
	};
};
