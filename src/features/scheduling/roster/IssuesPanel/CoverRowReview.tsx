import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/ErrorText";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { CoverPanel } from "@/features/scheduling/cover/useCoverPanel";
import { CoverOfferSent } from "@/features/scheduling/coverOffers/CoverOfferActions/CoverOfferSent";
import { offerActionsOf } from "@/features/scheduling/coverOffers/coverOfferRules";
import { previewTileGroups } from "@/features/scheduling/roster/changeTiles";
import {
	weekHoursOf,
	type OptionCard,
} from "@/features/scheduling/roster/coverCards";
import { CellPanelFooter } from "@/features/scheduling/RosterCellPanel/CellPanelFooter";
import { RosterChangeReview } from "@/features/scheduling/rosterChanges/RosterChangeReview";
import { hoursFromMinutes } from "@/features/scheduling/shifts/shiftHours";
import { ChangeTilePairs } from "./ChangeTilePairs";

export type CoverRowReviewProps = {
	card: OptionCard;
	panel: Pick<CoverPanel, "review" | "offer">;
	onBack: () => void;
};

const key = "scheduling.issues.cover";

/** What the change does to the person's week: hours before → after of the contract, with a bar; or the overtime an engine option adds. */
const WeekLine = ({ card }: { card: OptionCard }): FunctionComponent => {
	const { t } = useTranslation();
	const { choice } = card;
	if (choice.kind === "engine")
		return card.weekLine ? (
			<p className="text-neutral-800">{card.weekLine}</p>
		) : null;
	const week = weekHoursOf(choice.option);
	const values = {
		before: hoursFromMinutes(week.beforeMinutes),
		after: hoursFromMinutes(week.afterMinutes),
		contract: hoursFromMinutes(week.contractMinutes),
		overtime: hoursFromMinutes(week.overtimeMinutes),
	};
	return (
		<div className="flex flex-col gap-1">
			<p className="font-medium text-neutral-900">
				{t(week.overtimeMinutes > 0 ? `${key}.weekOvertime` : `${key}.week`, values)}
			</p>
			<ProgressBar
				label={t(`${key}.weekBar`)}
				tone={week.overtimeMinutes > 0 ? "warning" : "success"}
				track="white"
				value={week.percent}
			/>
		</div>
	);
};

/**
 * A card's review inside its row: "What changes for <name>" with the change
 * drawn (as the preview works it out once it has), the person's week, then
 * the existing checks, remark and tick, and Back and Apply; on a published
 * roster the offer's actions in Apply's place, and the offer once it is out.
 */
export const CoverRowReview = ({
	card,
	panel: { review, offer },
	onBack,
}: CoverRowReviewProps): FunctionComponent => {
	const { t } = useTranslation();
	const offerOut = offer && (offer.justSent ?? offer.openOffer);
	if (offer && offerOut)
		return (
			<CoverOfferSent
				name={card.people}
				offer={offerOut}
				refusal={offer.withdrawRefusal}
				timeZone={offer.timeZone}
				withdrawing={offer.withdrawing}
				onWithdraw={offer.withdraw}
			/>
		);
	const groups = review.preview
		? previewTileGroups(review.preview, review.names.member, t)
		: card.groups;
	return (
		<div className="flex flex-col gap-3 rounded-lg border border-ink-blue-500 bg-ink-blue-50 p-3">
			<RosterChangeReview
				names={review.names}
				notifiesMembers={offer !== undefined}
				preview={review.preview}
				previewRefusal={review.previewRefusal}
				remark={review.remark}
				showsRulesNote={false}
				ticked={review.ticked}
				beforeAfter={{
					title: t(`${key}.whatChanges`, { name: card.people }),
					content: (
						<>
							<ChangeTilePairs groups={groups} />
							<WeekLine card={card} />
						</>
					),
				}}
				onRemarkChange={review.setRemark}
				onRetryPreview={review.retryPreview}
				onTickedChange={review.setTicked}
			/>
			{review.applyRefusal && (
				<ErrorText>
					{t(`scheduling.rosterEdit.error.${review.applyRefusal}`)}
				</ErrorText>
			)}
			{/* The offer's actions take Back's place in the footer, so Back stands on its own there. */}
			{offer && (
				<Button className="self-start" variant="textlink" onClick={onBack}>
					{t(`${key}.back`)}
				</Button>
			)}
			<CellPanelFooter
				applyDisabled={review.applyBlocked}
				busy={review.busy}
				cancelLabel={t(`${key}.back`)}
				offerActions={offerActionsOf(offer, card.people)}
				applyLabel={t(
					review.applyAnyway
						? "scheduling.rosterEdit.applyAnyway"
						: "scheduling.rosterEdit.apply"
				)}
				onApply={review.apply}
				onCancel={onBack}
			/>
		</div>
	);
};
