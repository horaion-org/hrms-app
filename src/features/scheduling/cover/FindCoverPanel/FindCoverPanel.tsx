import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { ErrorText } from "@/components/ui/ErrorText";
import { Skeleton } from "@/components/ui/Skeleton";
import { CoverOptionList } from "@/features/scheduling/cover/CoverOptionList";
import { EngineRepairOptions } from "@/features/scheduling/cover/EngineRepairOptions";
import {
	coverOrderNote,
	engineNoteLines,
	gapReason,
	gapTitle,
	neighbourLine,
	optionLines,
	reasonText,
	type CoverNames,
	type CoverShift,
} from "@/features/scheduling/cover/coverOptionWords";
import { notAssignedReasonLine } from "@/features/scheduling/cover/notAssignedWords";
import {
	useCoverPanel,
	type CoverPanelInput,
} from "@/features/scheduling/cover/useCoverPanel";
import { useRepairWarmUp } from "@/features/scheduling/cover/useRepairWarmUp";
import { CoverOfferSent } from "@/features/scheduling/coverOffers/CoverOfferActions/CoverOfferSent";
import { offerActionsOf } from "@/features/scheduling/coverOffers/coverOfferRules";
import { formatDay } from "@/common/formatDay";
import { CellPanelFooter } from "@/features/scheduling/RosterCellPanel/CellPanelFooter";
import { RosterChangeReview } from "@/features/scheduling/rosterChanges/RosterChangeReview";
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
 * the short shift in two lines, then ONE list of who covers it, for which the
 * engine is asked as the panel opens (`coverListView` decides which list):
 * - a roster not published: the engine's options as cards
 *   (`EngineRepairOptions`), one line while it works, each reviewed in the
 *   same review a hand change gets; the backend's people ranked by hours
 *   (`CoverOptionList`) only when the engine cannot answer, under the line
 *   saying why;
 * - a published roster: the backend's people, the engine's answer merged in
 *   (`coverWithEngine`: its choice first, badged Suggested and chosen, the
 *   people it refuses under "Can't help"), since offers to staff go out from
 *   that list, then the engine's options as cards.
 * A chosen person of the backend's list is previewed on the grid with the
 * line that the rules aren't checked yet, and gets Apply on a draft, Send
 * offer or They agreed on a published roster. `useCoverPanel` holds the state
 * and calls; this component only lays the parts out.
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
	const {
		status,
		options,
		withEngine,
		engineRepair,
		view,
		selected,
		review,
		offer,
	} = panel;
	// Opening repair for a gap warms the engine's worker, so its first options come fast.
	useRepairWarmUp(input.target, input.revision, true);
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
		withEngine && (
			<CoverOptionList
				note={coverOrderNote(withEngine.order, t)}
				radioName={radioName}
				selected={panel.repairChosen ? undefined : selected?.membershipId}
				suggested={withEngine.suggested}
				unavailableOpen={unavailableOpen}
				options={withEngine.options.map((option) => ({
					membershipId: option.membershipId,
					name: names.member(option.membershipId),
					lines: [
						...optionLines(option, names, t),
						...engineNoteLines(withEngine.engineNote[option.membershipId], t),
					],
				}))}
				unavailable={withEngine.unavailable.map((person) => ({
					membershipId: person.membershipId,
					name: names.member(person.membershipId),
					reason:
						"engineReason" in person
							? notAssignedReasonLine(person.engineReason, t)
							: reasonText(person.reason, shift, t),
				}))}
				onSelect={panel.select}
			/>
		);
	// "Why nobody was assigned" reads the merged list, where "on leave" stands only where the backend agrees.
	const repair =
		engineRepair.status === "ready" && withEngine
			? { ...engineRepair, notAssigned: withEngine.notAssigned }
			: engineRepair;

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
		// Not editable now (a draft, a running or failed generation, a rejected roster): looking again can't help.
		notEditable: () => (
			<p className="text-sm text-error-700" role="alert">
				{t("scheduling.rosterEdit.error.notEditable")}
			</p>
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

	const engineOptions = (
		<EngineRepairOptions
			names={names}
			repair={repair}
			// A published roster's changes go out as offers, one person at a time: made by hand there.
			onReview={input.coverOffers ? undefined : panel.chooseRepair}
		/>
	);
	/** The one list, as `coverListView` decides. */
	const listContent: Record<typeof view, () => ReactNode> = {
		gapStatus: () => statusContent[status](),
		engine: () => (
			<>
				<h3 className="text-sm font-medium text-neutral-800">
					{t("scheduling.cover.list.whoCovers")}
				</h3>
				{engineOptions}
			</>
		),
		backendFallback: () => (
			<>
				{engineOptions}
				{statusContent[status]()}
			</>
		),
		backendWithEngine: () => (
			<>
				{statusContent[status]()}
				{engineOptions}
			</>
		),
	};

	const reviewContent = (): ReactNode => {
		if (!selected && !panel.repairChosen) return null;
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
				{panel.repairChosen && (
					<Callout tone="warning">
						{t("scheduling.cover.engine.notChecked")}
					</Callout>
				)}
				<RosterChangeReview
					names={review.names}
					notifiesMembers={offer !== undefined}
					preview={review.preview}
					previewRefusal={review.previewRefusal}
					remark={review.remark}
					showsRulesNote={false}
					ticked={review.ticked}
					onRemarkChange={review.setRemark}
					onRetryPreview={review.retryPreview}
					onTickedChange={review.setTicked}
				/>
				{review.applyRefusal && (
					<ErrorText>
						{t(`scheduling.rosterEdit.error.${review.applyRefusal}`)}
					</ErrorText>
				)}
				<CellPanelFooter
					applyDisabled={review.applyBlocked}
					busy={review.busy}
					offerActions={offerActionsOf(offer, selectedName)}
					applyLabel={t(
						review.applyAnyway
							? "scheduling.rosterEdit.applyAnyway"
							: "scheduling.rosterEdit.apply"
					)}
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
		{
			key: "list",
			content: (
				<div className="flex flex-col gap-3">{listContent[view]()}</div>
			),
		},
		{
			key: "notChecked",
			content: selected && !panel.repairChosen && (
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
