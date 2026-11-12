import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { ErrorText } from "@/components/ui/ErrorText";
import { Skeleton } from "@/components/ui/Skeleton";
import { CoverOptionList } from "@/features/scheduling/cover/CoverOptionList";
import {
	gapReason,
	gapTitle,
	neighbourLine,
	optionLines,
	reasonText,
	type CoverNames,
	type CoverShift,
} from "@/features/scheduling/cover/coverOptionWords";
import {
	useCoverPanel,
	type CoverPanelInput,
} from "@/features/scheduling/cover/useCoverPanel";
import { CoverOfferSent } from "@/features/scheduling/coverOffers/CoverOfferActions/CoverOfferSent";
import { formatDay } from "@/features/scheduling/periods";
import { CellPanelFooter } from "@/features/scheduling/RosterCellPanel/CellPanelFooter";
import { RosterChangeReview } from "@/features/scheduling/RosterChangeReview";
import {
	RosterSidePanel,
	type RosterSidePanelSection,
} from "@/features/scheduling/RosterSidePanel";

export type FindCoverPanelProps = CoverPanelInput & {
	/** Lets the button that opened the panel name it in `aria-controls`. */
	id?: string;
	/** Back to Issues. */
	onClose: () => void;
};

const key = "scheduling.cover.panel";
const SKELETON_ROWS = ["first", "second", "third"];

/**
 * Find cover beside the roster grid, in the side panel's slot and frame:
 * the short shift in two lines, then who could cover it (`CoverOptionList`),
 * the first one chosen and previewed on the grid, the line that the rules
 * aren't checked yet with the person's shifts beside it as facts, and the
 * same review and actions a hand change gets: Apply on a draft, Send offer
 * or They agreed on a published roster. `useCoverPanel` holds the state and
 * calls; this component only lays the parts out.
 */
export const FindCoverPanel = ({
	id,
	onClose,
	...input
}: FindCoverPanelProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const radioName = useId();
	const panel = useCoverPanel(input);
	const { status, options, selected, review, offer } = panel;
	// The roster's own days name a shift when the frozen shifts can't be read.
	const shiftOf = (shiftId: string): CoverShift | undefined =>
		input.shifts.find((candidate) => candidate.shiftId === shiftId) ??
		input.assignments.find((row) => row.shift?.shiftId === shiftId)?.shift ??
		undefined;
	const shift = shiftOf(input.gap.shiftId);
	const numbers = new Intl.NumberFormat(language, { maximumFractionDigits: 1 });
	const names: CoverNames = {
		member: (membershipId) => review.names.member(membershipId),
		shift: shiftOf,
		day: (date) => formatDay(date, language),
		hours: (minutes) => numbers.format(minutes / 60),
	};
	const shiftDay = {
		shift: shift?.name ?? "",
		day: formatDay(input.gap.day, language),
	};
	const selectedName = selected ? names.member(selected.membershipId) : "";
	const offerOut = offer && (offer.justSent ?? offer.openOffer);

	const optionList = (unavailableOpen: boolean): ReactNode =>
		options && (
			<CoverOptionList
				radioName={radioName}
				selected={selected?.membershipId}
				unavailableOpen={unavailableOpen}
				options={options.options.map((option) => ({
					membershipId: option.membershipId,
					name: names.member(option.membershipId),
					lines: optionLines(option, names, t),
				}))}
				unavailable={options.unavailable.map((person) => ({
					membershipId: person.membershipId,
					name: names.member(person.membershipId),
					reason: reasonText(person.reason, shift, t),
				}))}
				onSelect={panel.select}
			/>
		);

	const statusContent: Record<typeof status, () => ReactNode> = {
		loading: () => (
			<div aria-busy="true" className="flex flex-col gap-3">
				<span className="sr-only">{t(`${key}.loading`)}</span>
				{SKELETON_ROWS.map((row) => (
					<Skeleton key={row} className="h-20 w-full rounded-xl" />
				))}
			</div>
		),
		rosterMoved: () => (
			<div className="flex flex-col items-start gap-2" role="alert">
				<p className="text-sm text-neutral-800">{t(`${key}.rosterMoved`)}</p>
				<Button variant="textlink" onClick={panel.findAgain}>
					{t(`${key}.findAgain`)}
				</Button>
			</div>
		),
		failed: () => (
			<div className="flex flex-col items-start gap-2" role="alert">
				<p className="text-sm text-error-700">{t(`${key}.failed`)}</p>
				<Button variant="textlink" onClick={panel.findAgain}>
					{t("scheduling.rosterEdit.tryAgain")}
				</Button>
			</div>
		),
		closed: () => (
			<div className="flex flex-col items-start gap-2">
				<p className="text-sm text-neutral-800">
					{t(`${key}.covered`, shiftDay)}
				</p>
				<Button size="sm" variant="secondary" onClick={onClose}>
					{t(`${key}.close`)}
				</Button>
			</div>
		),
		nobody: () => (
			<>
				<p className="text-sm text-neutral-800">
					{t(`${key}.nobody`, shiftDay)}
				</p>
				{optionList(true)}
			</>
		),
		options: () => optionList(false),
	};

	const reviewContent = (): ReactNode => {
		if (!selected) return null;
		if (offer && offerOut)
			return (
				<CoverOfferSent
					name={selectedName}
					offer={offerOut}
					refusal={offer.withdrawRefusal}
					timeZone={offer.timeZone}
					withdrawing={offer.withdrawing}
					onWithdraw={offer.withdraw}
				/>
			);
		return (
			<div className="flex flex-col gap-3">
				<RosterChangeReview
					names={review.names}
					notifiesMembers={offer !== undefined}
					preview={review.preview}
					remark={review.remark}
					showsRulesNote={false}
					ticked={review.ticked}
					onRemarkChange={review.setRemark}
					onTickedChange={review.setTicked}
				/>
				{review.previewRefusal && (
					<div className="flex flex-col items-start gap-2" role="alert">
						<p className="text-sm text-error-700">
							{review.previewRefusal === "revision"
								? t("scheduling.rosterEdit.error.revision")
								: t("scheduling.rosterEdit.previewFailed")}
						</p>
						<Button variant="textlink" onClick={review.retryPreview}>
							{review.previewRefusal === "revision"
								? t("scheduling.rosterEdit.error.reload")
								: t("scheduling.rosterEdit.tryAgain")}
						</Button>
					</div>
				)}
				{review.applyRefusal && (
					<ErrorText>
						{t(`scheduling.rosterEdit.error.${review.applyRefusal}`)}
					</ErrorText>
				)}
				<CellPanelFooter
					applyDisabled={review.applyBlocked}
					busy={review.busy}
					applyLabel={t(
						review.applyAnyway
							? "scheduling.rosterEdit.applyAnyway"
							: "scheduling.rosterEdit.apply"
					)}
					offerActions={
						offer?.consentKind
							? {
									name: selectedName,
									pending: offer.createPending,
									ready: offer.ready,
									refusal: offer.createRefusal,
									rivals: offer.rivals,
									timeZone: offer.timeZone,
									onRecord: offer.record,
									onSend: offer.send,
								}
							: undefined
					}
					onApply={review.apply}
					onCancel={onClose}
				/>
			</div>
		);
	};

	const sections: Array<RosterSidePanelSection> = [
		{
			key: "gap",
			items: [
				{
					key: "gap",
					lines: [
						gapTitle(input.gap, names, t),
						...(options && options.gap.shortBy > 0
							? [gapReason(options.gap, names, t)]
							: []),
					],
				},
			],
		},
		{ key: "status", content: statusContent[status]() },
		{
			key: "notChecked",
			content: selected && (
				<Callout tone="info">
					<span className="block">{t(`${key}.notChecked`)}</span>
					<span className="mt-1 block font-normal">
						{neighbourLine(selected, names, t)}
					</span>
				</Callout>
			),
		},
		{ key: "review", content: reviewContent() },
	];

	return (
		<RosterSidePanel
			id={id}
			sections={sections}
			title={t(`${key}.title`)}
			onClose={onClose}
		/>
	);
};
