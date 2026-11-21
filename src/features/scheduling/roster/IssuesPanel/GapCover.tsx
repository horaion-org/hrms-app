import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { formatDay } from "@/common/formatDay";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { ExpandableList } from "@/components/ui/ExpandableList";
import type { CoverGapRequest } from "@/features/scheduling/cover/api";
import type { CoverShift } from "@/features/scheduling/cover/coverOptionWords";
import { REFUSAL_ACTIONS } from "@/features/scheduling/cover/engineRepairWords";
import { NotAssignedList } from "@/features/scheduling/cover/NotAssignedList";
import { whyNotWithoutCards } from "@/features/scheduling/cover/notAssignedWords";
import {
	useCoverPanel,
	type CoverPanel,
	type CoverPanelInput,
} from "@/features/scheduling/cover/useCoverPanel";
import { useRepairWarmUp } from "@/features/scheduling/cover/useRepairWarmUp";
import {
	STILL_WORKING_AFTER_MILLISECONDS,
	useWaitedLong,
} from "@/features/scheduling/cover/useWaitedLong";
import {
	changeTileGroups,
	type TileShift,
} from "@/features/scheduling/roster/changeTiles";
import {
	CARDS_BEFORE_FOLD,
	fallbackCards,
	optionCardList,
	type OptionCard,
	type OptionCardList,
	type OptionCardSources,
} from "@/features/scheduling/roster/coverCards";
import { gapIssueKey } from "@/features/scheduling/roster/rosterIssueGroups";
import { assignmentCell } from "@/features/scheduling/rosterChanges/cellText";
import { CoverCardItem } from "./CoverCardItem";
import { CoverRowReview } from "./CoverRowReview";
import { WhyNotOthers } from "./WhyNotOthers";

/** What covering a short shift from Issues needs, besides the gap: the roster, its shifts and what a change tells. */
export type IssueCoverContext = Omit<CoverPanelInput, "gap" | "dayRow">;

export type GapCoverProps = {
	gap: CoverGapRequest;
	cover: IssueCoverContext;
};

const key = "scheduling.cover";
const engineKey = "scheduling.cover.engine";

/** A plain line, and its one action when it has one. */
const Line = ({
	text,
	action,
	alert = false,
}: {
	text: string;
	action?: { label: string; onClick: () => void };
	alert?: boolean;
}): FunctionComponent => (
	<div
		className="flex flex-col items-start gap-1"
		role={alert ? "alert" : undefined}
	>
		<p className="text-neutral-800">{text}</p>
		{action && (
			<Button variant="textlink" onClick={action.onClick}>
				{action.label}
			</Button>
		)}
	</div>
);

/**
 * The lines above the cards (UX note 6), in one polite live region: the
 * gap's own state; the engine at work, and still at work after a while; what
 * its answer lacks (nothing at all, nothing that covers the whole shift, a
 * search cut short); a refusal with its one action, over the hours-based
 * people; the hours-based list's own state.
 */
const useStatusLines = (
	panel: CoverPanel,
	list: OptionCardList,
	shiftDay: { shift: string; day: string }
): ReactNode => {
	const { t } = useTranslation();
	const { status, view, engineRepair } = panel;
	const engineWorking =
		engineRepair.status === "loading" ||
		(engineRepair.status === "refused" && engineRepair.retrying) ||
		(engineRepair.status === "ready" && engineRepair.asking);
	const waitedLong = useWaitedLong(
		engineWorking,
		STILL_WORKING_AFTER_MILLISECONDS
	);
	const tryAgain = t("scheduling.rosterEdit.tryAgain");
	const lines: Array<ReactNode> = [];
	if (status === "rosterMoved")
		lines.push(
			<Line
				key="moved"
				text={t(`${key}.panel.rosterMoved`)}
				action={{
					label: t(`${key}.panel.findAgain`),
					onClick: panel.findAgain,
				}}
			/>
		);
	if (status === "notEditable")
		lines.push(
			<Line
				key="locked"
				alert
				text={t("scheduling.rosterEdit.error.notEditable")}
			/>
		);
	if (status === "closed")
		lines.push(
			<Line key="closed" text={t(`${key}.panel.covered`, shiftDay)} />
		);
	if (view === "gapStatus") return lines;
	if (engineWorking)
		lines.push(<Line key="working" text={t(`${engineKey}.loading`)} />);
	if (waitedLong)
		lines.push(
			<Line key="stillWorking" text={t(`${engineKey}.stillWorking`)} />
		);
	const refusal =
		engineRepair.status === "refused" ||
		(engineRepair.status === "ready" && !engineRepair.asking)
			? engineRepair.refusal
			: undefined;
	if (refusal) {
		const action =
			engineRepair.status === "refused" && engineRepair.retrying
				? undefined
				: REFUSAL_ACTIONS[refusal];
		lines.push(
			<Line
				key="refused"
				alert
				text={t(`${engineKey}.refusal.${refusal}`)}
				action={
					action === "tryAgain"
						? { label: tryAgain, onClick: engineRepair.askAgain }
						: action === "findAgain"
							? {
									label: t(`${engineKey}.findAgain`),
									onClick: panel.review.findOptionsAgain,
								}
							: undefined
				}
			/>
		);
	}
	if (engineRepair.status === "ready") {
		const { options, search, asking } = engineRepair;
		if (options.length === 0)
			lines.push(<Line key="nobody" text={t(`${engineKey}.nobodyCan`)} />);
		else if (list.noFullFill)
			lines.push(<Line key="noFullFill" text={t(`${engineKey}.noFullFill`)} />);
		// While it asks again the options found so far stay; the line returns if the new answer is cut short too.
		if (search && !search.complete && !asking && !refusal)
			lines.push(
				<Line
					key="incomplete"
					action={{ label: tryAgain, onClick: engineRepair.askAgain }}
					text={t(`${engineKey}.incomplete`)}
				/>
			);
		if (options.length > 0)
			lines.push(
				<span key="found" className="sr-only">
					{t(`${engineKey}.optionsFound`, { count: options.length })}
				</span>
			);
	}
	if (view !== "backendFallback") return lines;
	if (status === "options")
		lines.push(
			<p key="fallback" className="text-xs font-semibold text-neutral-700">
				{t(`${engineKey}.fallbackCaption`)}
			</p>
		);
	if (status === "loading")
		lines.push(<Line key="loading" text={t(`${key}.panel.loading`)} />);
	if (status === "failed")
		lines.push(
			<Line
				key="failed"
				alert
				action={{ label: tryAgain, onClick: panel.findAgain }}
				text={t(`${key}.panel.failed`)}
			/>
		);
	if (status === "nobody")
		lines.push(<Line key="nobody" text={t(`${key}.panel.nobody`, shiftDay)} />);
	return lines;
};

/** The open row's body for a gap whose day the roster holds (`GapCover`). */
const GapCoverBody = ({
	gap,
	cover,
	dayRow,
}: GapCoverProps & {
	dayRow: CoverPanelInput["dayRow"];
}): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const panel = useCoverPanel({
		...cover,
		gap,
		dayRow,
		onApplied: (change, stillShort): void => {
			cover.onApplied(change, stillShort);
			// The review closes as the change lands: focus goes to the row's own button.
			document
				.querySelector<HTMLElement>(
					`[data-issue-row="${CSS.escape(gapIssueKey(gap.shiftId, gap.day) ?? "")}"]`
				)
				?.focus();
		},
	});
	// Opening a gap warms the engine's worker, so its first options come fast.
	useRepairWarmUp(cover.target, cover.revision, true);
	const [reviewKey, setReviewKey] = useState<string>();
	// Once a card past the fold was reviewed, the list stays open, so Back returns to it.
	const [showAll, setShowAll] = useState(false);
	const reviewButtons = useRef(new Map<string, HTMLButtonElement>());
	const focusAfterBack = useRef<string>(undefined);
	// Back returns focus to the Review of the card it came from, once the list is drawn again.
	useEffect(() => {
		const cardKey = focusAfterBack.current;
		if (cardKey === undefined || reviewKey !== undefined) return;
		focusAfterBack.current = undefined;
		reviewButtons.current.get(cardKey)?.focus();
	});

	// The roster's own days name a shift when the frozen shifts can't be read.
	const shiftOf = (shiftId: string): (TileShift & CoverShift) | undefined =>
		cover.shifts.find((shift) => shift.shiftId === shiftId) ??
		cover.assignments.find((row) => row.shift?.shiftId === shiftId)?.shift ??
		undefined;
	const shift = shiftOf(gap.shiftId);
	const shiftDay = {
		shift: shift?.name ?? "",
		day: formatDay(gap.day, language),
	};
	const { engineRepair } = panel;
	const memberName = panel.review.names.member;
	const weekdayName = new Intl.DateTimeFormat(language, { weekday: "long" });
	const now = new Date();
	const sources: OptionCardSources = {
		dayBefore: (cell) => {
			const row = cover.assignments.find(
				(candidate) =>
					candidate.member?.membershipId === cell.membershipId &&
					candidate.day === cell.day
			);
			return row && assignmentCell(row);
		},
		weekday: (isoDate) => weekdayName.format(new Date(`${isoDate}T00:00:00`)),
		memberName,
		groupsOf: (cells) =>
			changeTileGroups(cells, cover.assignments, shiftOf, memberName, t),
		shortNow: engineRepair.status === "ready" ? engineRepair.shortNow : null,
		offers: cover.coverOffers?.offers ?? [],
		now,
		t,
	};
	const engineList = optionCardList(
		panel.view === "engine" && engineRepair.status === "ready"
			? engineRepair.options
			: [],
		sources
	);
	const cards =
		panel.view === "backendFallback"
			? fallbackCards(panel.options?.options ?? [], sources)
			: engineList.cards;
	const partCaptionKey =
		engineList.partCaptionAt === undefined
			? undefined
			: engineList.cards[engineList.partCaptionAt]?.key;
	const statusLines = useStatusLines(panel, engineList, shiftDay);

	/** Whether the card under review is the one chosen now: a person of the list, or the engine's change. */
	const isChosen = (card: OptionCard): boolean =>
		card.choice.kind === "engine"
			? panel.repairChosen
			: panel.selected?.membershipId === card.choice.option.membershipId;
	const reviewed = cards.find((card) => card.key === reviewKey);
	if (reviewed && isChosen(reviewed))
		return (
			<CoverRowReview
				card={reviewed}
				gapDay={gap.day}
				panel={panel}
				onBack={() => {
					panel.unchoose();
					focusAfterBack.current = reviewed.key;
					setReviewKey(undefined);
				}}
			/>
		);

	/** Chooses the card's change, then shows its review. */
	const review = (card: OptionCard): void => {
		const { choice } = card;
		if (choice.kind === "backend") panel.select(choice.option.membershipId);
		else panel.chooseRepair(choice.option);
		if (cards.indexOf(card) >= CARDS_BEFORE_FOLD) setShowAll(true);
		setReviewKey(card.key);
	};
	/** A roster member's profile id, which is how the engine names people. */
	const profileIdOf = (membershipId: string): string | undefined =>
		cover.assignments.find((row) => row.member?.membershipId === membershipId)
			?.member?.memberProfileId;
	// The why-not list leaves out everyone who already has a card.
	const profileIdsWithCards = new Set(
		cards
			.flatMap((card) =>
				card.choice.kind === "engine"
					? card.choice.option.people.map((person) => person.membershipId)
					: [card.choice.option.membershipId]
			)
			.flatMap((membershipId) => profileIdOf(membershipId) ?? [])
	);
	const notAssigned =
		panel.notAssigned &&
		whyNotWithoutCards(panel.notAssigned, profileIdsWithCards);
	const noOptions =
		engineRepair.status === "ready" && engineRepair.options.length === 0;
	const optionsFound =
		engineRepair.status === "ready"
			? engineRepair.search?.optionsFound
			: undefined;
	// The why-not list shows only when it names someone: an empty one would only say "(0)".
	const showsNotAssigned =
		panel.view === "engine" && notAssigned !== null && notAssigned.length > 0;
	return (
		<div className="flex flex-col gap-2">
			<div aria-live="polite" className="flex flex-col gap-2">
				{statusLines}
			</div>
			{cards.length > 0 && (
				<ExpandableList
					collapsedCount={showAll ? cards.length : CARDS_BEFORE_FOLD}
					itemClassName="flex flex-col gap-2"
					items={cards}
					keyOf={(card) => card.key}
					listClassName="flex flex-col gap-2"
					renderItem={(card) => (
						<>
							{/* The part fills' caption sits with the first of them, so it folds with it. */}
							{card.key === partCaptionKey && (
								<p className="text-xs font-semibold text-neutral-700">
									{t(`${engineKey}.partCaption`)}
								</p>
							)}
							<CoverCardItem
								card={card}
								gapDay={gap.day}
								now={now}
								timeZone={cover.coverOffers?.timeZone ?? ""}
								reviewRef={(button) => {
									if (button) reviewButtons.current.set(card.key, button);
									else reviewButtons.current.delete(card.key);
								}}
								onReview={(): void => {
									review(card);
								}}
							/>
						</>
					)}
				/>
			)}
			{optionsFound !== undefined && optionsFound > engineList.cards.length && (
				<p className="text-xs text-neutral-700">
					{t(`${engineKey}.bestOf`, {
						shown: engineList.cards.length,
						found: optionsFound,
					})}
				</p>
			)}
			{showsNotAssigned && (
				<NotAssignedList
					defaultOpen={noOptions}
					people={notAssigned}
					title={t("scheduling.issues.cover.whyNot", {
						count: notAssigned.length,
					})}
				/>
			)}
			{panel.view === "backendFallback" && (
				<WhyNotOthers
					memberName={memberName}
					people={panel.options?.unavailable ?? []}
					shift={shift}
				/>
			)}
		</div>
	);
};

/**
 * A short shift's row, open: its options as cards (`optionCardList`), asked
 * of the engine as it opens, best first, the first suggested only when it
 * fills more than part, part fills under their caption, three cards before
 * the fold; "Review" opens the change inside the row (`CoverRowReview`), and why
 * others have no card is folded under them. Under a refusal the hours-based
 * people stand in, each not rule-checked. `useCoverPanel` holds the state and
 * calls. Nothing for a day the roster does not hold.
 */
export const GapCover = ({ gap, cover }: GapCoverProps): FunctionComponent => {
	const dayRow = cover.assignments.find((row) => row.day === gap.day);
	return dayRow ? (
		<GapCoverBody cover={cover} dayRow={dayRow} gap={gap} />
	) : null;
};
