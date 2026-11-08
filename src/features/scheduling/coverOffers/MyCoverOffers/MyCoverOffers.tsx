import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { myCoverOffersQuery } from "@/features/scheduling/coverOffers/api";
import {
	CoverOfferCard,
	type CoverOfferAnswerRefusal,
} from "@/features/scheduling/coverOffers/CoverOfferCard";
import { coverOfferRefusal } from "@/features/scheduling/coverOffers/coverOfferRefusal";
import { cardOffers } from "@/features/scheduling/coverOffers/coverOfferRules";
import { useMyCoverOfferAnswers } from "@/features/scheduling/coverOffers/useCoverOfferActions";
import {
	assignmentCell,
	rosterCellText,
} from "@/features/scheduling/rosterChanges/cellText";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";

export type MyCoverOffersProps = {
	companyId: string;
	scheduleId: string;
	/** The roster's time zone, which deadlines read in. */
	timeZone: string;
	/** The offer a link named (`?offer=`): shown whatever its status. */
	linkedOfferId?: string;
	/** The roster's rows, which say what each offered day holds now. */
	assignments: ReadonlyArray<ScheduleAssignment>;
	viewerMembershipId: string | undefined;
	/** The clock, renewed each minute by the page. */
	now: Date;
	className?: string;
};

const key = "scheduling.coverOffers.card";

/** A failed answer, as the card says it. */
const answerRefusal = (
	error: Error | null
): CoverOfferAnswerRefusal | undefined => {
	if (!error) return undefined;
	const refusal = coverOfferRefusal(error);
	return refusal === "stale" || refusal === "notOpen" ? refusal : "failed";
};

/**
 * The member's offers on this roster, one card each, first on the page as
 * the one thing that asks for action. Nothing without offers; a failure to
 * read them says so in one line with Try again, and the roster still shows.
 */
export const MyCoverOffers = ({
	companyId,
	scheduleId,
	timeZone,
	linkedOfferId,
	assignments,
	viewerMembershipId,
	now,
	className,
}: MyCoverOffersProps): FunctionComponent => {
	const { t } = useTranslation();
	const offers = useQuery(myCoverOffersQuery(companyId));
	const { accept, decline } = useMyCoverOfferAnswers(companyId, scheduleId);
	if (offers.isPending)
		return linkedOfferId ? (
			<div aria-busy="true" className={className}>
				<span className="sr-only">{t(`${key}.loading`)}</span>
				<Skeleton className="h-48 w-full" />
			</div>
		) : null;
	if (offers.isError)
		return (
			<div
				className={joinClassNames("flex flex-col items-start gap-1", className)}
				role="alert"
			>
				<p className="text-sm text-neutral-800">{t(`${key}.loadFailed`)}</p>
				<Button
					variant="textlink"
					onClick={() => {
						void offers.refetch();
					}}
				>
					{t(`${key}.tryAgain`)}
				</Button>
			</div>
		);
	const shown = cardOffers(offers.data, scheduleId, linkedOfferId, now);
	if (shown.offers.length === 0 && !shown.linkedMissing) return null;
	const was = (day: string): string | undefined => {
		const row = assignments.find(
			(assignment) =>
				assignment.day === day &&
				assignment.member?.membershipId === viewerMembershipId
		);
		return row ? rosterCellText(assignmentCell(row), t) : undefined;
	};
	const answering = (offerId: string): "accept" | "decline" | undefined => {
		if (accept.isPending && accept.variables.offerId === offerId)
			return "accept";
		if (decline.isPending && decline.variables.offerId === offerId)
			return "decline";
		return undefined;
	};
	const refusalOf = (offerId: string): CoverOfferAnswerRefusal | undefined =>
		accept.variables?.offerId === offerId
			? answerRefusal(accept.error)
			: decline.variables?.offerId === offerId
				? answerRefusal(decline.error)
				: undefined;
	return (
		<div className={joinClassNames("flex flex-col gap-4", className)}>
			{shown.linkedMissing && (
				<p className="text-sm text-neutral-800">
					{t(`${key}.closed.unavailable`)}
				</p>
			)}
			{shown.offers.map((offer) => (
				<CoverOfferCard
					key={offer.offerId}
					now={now}
					offer={offer}
					pending={answering(offer.offerId)}
					refusal={refusalOf(offer.offerId)}
					timeZone={timeZone}
					was={was(offer.rosterDate)}
					onAccept={() => {
						decline.reset();
						accept.mutate({ offerId: offer.offerId });
					}}
					onDecline={(reason) => {
						accept.reset();
						decline.mutate({ offerId: offer.offerId, reason });
					}}
				/>
			))}
		</div>
	);
};
