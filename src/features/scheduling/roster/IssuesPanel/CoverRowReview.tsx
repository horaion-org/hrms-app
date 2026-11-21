import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/ErrorText";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
	spansText,
	weekLine,
	type CostChipKind,
} from "@/features/scheduling/cover/engineRepairWords";
import type { CoverPanel } from "@/features/scheduling/cover/useCoverPanel";
import { CoverOfferSent } from "@/features/scheduling/coverOffers/CoverOfferActions/CoverOfferSent";
import { offerActionsOf } from "@/features/scheduling/coverOffers/coverOfferRules";
import {
	previewTileGroups,
	type ChangeTileGroup,
} from "@/features/scheduling/roster/changeTiles";
import {
	reviewPeopleOf,
	weekHoursOf,
	type OptionCard,
	type ReviewPerson,
} from "@/features/scheduling/roster/coverCards";
import { CellPanelFooter } from "@/features/scheduling/RosterCellPanel/CellPanelFooter";
import { RosterChangeReview } from "@/features/scheduling/rosterChanges/RosterChangeReview";
import { hoursFromMinutes } from "@/features/scheduling/shifts/shiftHours";
import { ChangeTilePairs } from "./ChangeTilePairs";

export type CoverRowReviewProps = {
	card: OptionCard;
	/** The short shift's day, which the row names: the pairs on it say no date. */
	gapDay?: string;
	panel: Pick<CoverPanel, "review" | "offer">;
	onBack: () => void;
};

const key = "scheduling.issues.cover";

/** The cost chips that are a cost in hours, which the review says beside the week. */
const EXTRA_COSTS: ReadonlyArray<CostChipKind> = [
	"pastContract",
	"overtime",
	"restDayWork",
	"timeOffEarned",
];

/**
 * One person's part of the change: their name, each day drawn, and their
 * week before → after of the contract with a bar, the overtime past it named.
 */
const PersonBlock = ({
	person,
	group,
	cost,
	gapDay,
}: {
	person: ReviewPerson;
	group: ChangeTileGroup | undefined;
	gapDay: string | undefined;
	/** What the change costs this person in words; their overtime past the contract without. */
	cost: string | undefined;
}): FunctionComponent => {
	const { t } = useTranslation();
	const week = person.weekMinutes && weekHoursOf(person.weekMinutes);
	const overtime =
		week && week.overtimeMinutes > 0
			? t("scheduling.cover.engine.cost.overtime", {
					hours: hoursFromMinutes(week.overtimeMinutes),
				})
			: undefined;
	const costWords = cost ?? overtime;
	return (
		<div className="flex flex-col gap-1">
			<p className="font-semibold text-neutral-900">{person.name}</p>
			{group && (
				<ChangeTilePairs groups={[{ ...group, name: "" }]} knownDay={gapDay} />
			)}
			{person.weekMinutes && week && (
				<>
					<p className="text-neutral-800">
						{weekLine(person.weekMinutes, t)}
						{costWords && ` · ${costWords}`}
					</p>
					<ProgressBar
						label={t(`${key}.weekBar`)}
						tone={week.overtimeMinutes > 0 ? "warning" : "success"}
						track="white"
						value={week.percent}
					/>
				</>
			)}
		</div>
	);
};

/**
 * A card's review inside its row (UX note 4): "What changes", then one block
 * per person (their days drawn as the preview works them out once it has,
 * their week), what is still short afterwards for an option that leaves
 * some, the checks only when there are any, the remark behind "Add a remark"
 * unless asked for, and Back and Apply. A roster that moved under the option
 * disables Apply and offers "Find options again". On a published roster one
 * person's change goes out through the offer's actions, and the offer shows
 * once out; a two-person change applies once both agreed, with a remark.
 * Focus moves to the review as it opens.
 */
export const CoverRowReview = ({
	card,
	gapDay,
	panel: { review, offer },
	onBack,
}: CoverRowReviewProps): FunctionComponent => {
	const { t } = useTranslation();
	const region = useRef<HTMLDivElement>(null);
	useEffect(() => {
		region.current?.focus();
	}, []);
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
	const people = reviewPeopleOf(card.choice, review.names.member);
	// One person's change says its whole cost (rest-day hours, time off, extra hours); with two, each says their overtime.
	const extraCost = card.costChips.filter((chip) =>
		EXTRA_COSTS.includes(chip.kind)
	);
	const onePersonCost =
		people.length === 1 && extraCost.length > 0
			? extraCost.map((chip) => chip.text).join(" · ")
			: undefined;
	const stillShort =
		card.choice.kind === "engine" ? card.choice.option.stillShort : [];
	const offerActions = offerActionsOf(offer, card.people);
	const title = t(`${key}.whatChanges`);
	return (
		<div
			ref={region}
			aria-label={title}
			className="flex flex-col gap-3 rounded-lg border border-ink-blue-500 bg-ink-blue-50 p-3 focus-visible:outline-2 focus-visible:outline-ink-blue-500"
			role="group"
			tabIndex={-1}
		>
			<RosterChangeReview
				remarkFolded
				names={review.names}
				notifiesMembers={offer !== undefined}
				preview={review.preview}
				previewRefusal={review.previewRefusal}
				remark={review.remark}
				remarkRequired={review.remarkRequired}
				showsEmptyChecks={false}
				showsRulesNote={false}
				ticked={review.ticked}
				beforeAfter={{
					title,
					content: (
						<>
							{people.map((person) => (
								<PersonBlock
									key={person.membershipId}
									cost={onePersonCost}
									gapDay={gapDay}
									person={person}
									group={groups.find(
										(group) => group.membershipId === person.membershipId
									)}
								/>
							))}
							{stillShort.length > 0 && (
								<p className="text-error-700">
									{t(`${key}.stillShortAfter`, {
										times: spansText(stillShort, t),
									})}
								</p>
							)}
						</>
					),
				}}
				remarkHint={
					review.bothMustAgree ? t(`${key}.bothAgreedHint`) : undefined
				}
				onRemarkChange={review.setRemark}
				onRetryPreview={review.retryPreview}
				onTickedChange={review.setTicked}
			/>
			{review.applyRefusal && (
				<div className="flex flex-col items-start gap-1">
					<ErrorText>
						{t(`scheduling.rosterEdit.error.${review.applyRefusal}`)}
					</ErrorText>
					{review.applyRefusal === "revision" && (
						<Button variant="textlink" onClick={review.findOptionsAgain}>
							{t("scheduling.cover.engine.findAgain")}
						</Button>
					)}
				</div>
			)}
			{review.bothMustAgree && (
				<p className="text-neutral-800">{t(`${key}.bothMustAgree`)}</p>
			)}
			{/* The offer's actions take Back's place in the footer, so Back stands on its own there. */}
			{offerActions && (
				<Button className="self-start" variant="textlink" onClick={onBack}>
					{t(`${key}.back`)}
				</Button>
			)}
			<CellPanelFooter
				applyDisabled={review.applyBlocked}
				busy={review.busy}
				cancelLabel={t(`${key}.back`)}
				offerActions={offerActions}
				applyLabel={t(
					review.bothMustAgree
						? `${key}.bothAgreed`
						: review.applyAnyway
							? "scheduling.rosterEdit.applyAnyway"
							: "scheduling.rosterEdit.apply"
				)}
				onApply={review.apply}
				onCancel={onBack}
			/>
		</div>
	);
};
