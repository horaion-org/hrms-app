import {
	useContext,
	useEffect,
	useRef,
	useState,
	type ReactNode,
	type Ref,
} from "react";
import { useTranslation } from "react-i18next";
import { formatDay } from "@/common/formatDay";
import { formattingLocale } from "@/common/formattingLocale";
import { useWaitedLong } from "@/common/useWaitedLong";
import { ENGINE_ANSWER_WAIT_MILLISECONDS } from "@/features/scheduling/engineWait";
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
	changeTileGroups,
	type TileShift,
} from "@/features/scheduling/roster/changeTiles";
import {
	CARDS_BEFORE_FOLD,
	fallbackCards,
	optionCardList,
	reviewedCardOf,
	type OptionCard,
	type OptionCardList,
	type OptionCardSources,
} from "@/features/scheduling/roster/coverCards";
import { gapIssueKey } from "@/features/scheduling/roster/rosterIssueGroups";
import { assignmentCell } from "@/features/scheduling/rosterChanges/cellText";
import { CoverCardItem } from "./CoverCardItem";
import { FocusIssueRow } from "./focusIssueRow";
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

/** How long the engine may work before the row says it is still working. */
const STILL_WORKING_AFTER_MILLISECONDS = 8_000;

/** A plain line, and its one action when it has one. */
const Line = ({
	text,
	action,
	alert = false,
	lineRef,
}: {
	text: string;
	action?: { label: string; onClick: () => void };
	alert?: boolean;
	/** A line focus is moved to; it can take focus only from the code. */
	lineRef?: Ref<HTMLDivElement>;
}): FunctionComponent => (
	<div
		ref={lineRef}
		className="flex flex-col items-start gap-1"
		role={alert ? "alert" : undefined}
		tabIndex={lineRef ? -1 : undefined}
	>
		<p className="text-neutral-800">{text}</p>
		{action && (
			<Button variant="textlink" onClick={action.onClick}>
				{action.label}
			</Button>
		)}
	</div>
);

/** The lines above the cards: the quiet ones a live region reads as they change, and the alerts, read at once. */
type StatusLines = { quiet: Array<ReactNode>; alerts: Array<ReactNode> };

/**
 * The lines above the cards (UX note 6): the gap's own state; the engine at
 * work, and still at work after a while; what its answer lacks (nothing at
 * all, nothing that covers the whole shift, a search cut short) and, for a
 * screen reader only, how many options it found; a refusal with its one
 * action, over the hours-based people; the hours-based list's own state.
 * Refusals and failures are alerts; the rest is quiet.
 */
const useStatusLines = (
	panel: CoverPanel,
	list: OptionCardList,
	shiftDay: { shift: string; day: string },
	movedLine: Ref<HTMLDivElement>
): StatusLines => {
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
	const quiet: Array<ReactNode> = [];
	const alerts: Array<ReactNode> = [];
	if (panel.rosterMovedUnderApply)
		alerts.push(
			<Line
				key="appliedRosterMoved"
				alert
				lineRef={movedLine}
				text={t(`${engineKey}.appliedRosterMoved`)}
			/>
		);
	if (status === "rosterMoved")
		quiet.push(
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
		alerts.push(
			<Line
				key="locked"
				alert
				text={t("scheduling.rosterEdit.error.notEditable")}
			/>
		);
	if (status === "closed")
		quiet.push(
			<Line key="closed" text={t(`${key}.panel.covered`, shiftDay)} />
		);
	if (view === "gapStatus") return { quiet, alerts };
	if (engineWorking)
		quiet.push(<Line key="working" text={t(`${engineKey}.loading`)} />);
	if (waitedLong)
		quiet.push(
			<Line
				key="stillWorking"
				text={t(`${engineKey}.stillWorking`, {
					seconds: ENGINE_ANSWER_WAIT_MILLISECONDS / 1000,
				})}
			/>
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
		alerts.push(
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
									onClick: panel.findOptionsAgain,
								}
							: undefined
				}
			/>
		);
	}
	if (engineRepair.status === "ready") {
		const { options, search, asking } = engineRepair;
		if (options.length === 0)
			quiet.push(<Line key="nobody" text={t(`${engineKey}.nobodyCan`)} />);
		else if (list.noFullFill)
			quiet.push(<Line key="noFullFill" text={t(`${engineKey}.noFullFill`)} />);
		// While it asks again the options found so far stay; the line returns if the new answer is cut short too.
		if (search && !search.complete && !asking && !refusal)
			quiet.push(
				<Line
					key="incomplete"
					action={{ label: tryAgain, onClick: engineRepair.askAgain }}
					text={t(`${engineKey}.incomplete`)}
				/>
			);
		if (options.length > 0 && !asking)
			quiet.push(
				<span key="found" className="sr-only">
					{t(`${engineKey}.optionsFound`, { count: options.length })}
				</span>
			);
	}
	if (view !== "backendFallback") return { quiet, alerts };
	if (status === "loading")
		quiet.push(<Line key="loading" text={t(`${key}.panel.loading`)} />);
	if (status === "failed")
		alerts.push(
			<Line
				key="failed"
				alert
				action={{ label: tryAgain, onClick: panel.findAgain }}
				text={t(`${key}.panel.failed`)}
			/>
		);
	return { quiet, alerts };
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
	const focusRow = useContext(FocusIssueRow);
	const panel = useCoverPanel({
		...cover,
		gap,
		dayRow,
		onApplied: (change, leaves): void => {
			cover.onApplied(change, leaves);
			// The review closes as the change lands: focus goes to the row's own button.
			const rowKey = gapIssueKey(gap.shiftId, gap.day);
			if (rowKey) focusRow(rowKey);
		},
	});
	// Opening a gap warms the engine's worker, so its first options come fast.
	useRepairWarmUp(cover.target, cover.revision, true);
	// Whether a card's review is open; which card is found through the change chosen, not its place in the list.
	const [reviewing, setReviewing] = useState(false);
	// Once a card past the fold was reviewed, the list stays open, so Back returns to it.
	const [showAll, setShowAll] = useState(false);
	const cardButtons = useRef(new Map<string, HTMLButtonElement>());
	const focusAfterBack = useRef<string>(undefined);
	// Back returns focus to the card it came from, once the list is drawn again.
	useEffect(() => {
		const cardKey = focusAfterBack.current;
		if (cardKey === undefined || reviewing) return;
		focusAfterBack.current = undefined;
		cardButtons.current.get(cardKey)?.focus();
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
		gapDay: gap.day,
		memberName,
		groupsOf: (cells, nameOf) =>
			changeTileGroups(cells, cover.assignments, shiftOf, nameOf, t),
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
	// Apply refused because the roster moved: the line saying so takes focus over the options now.
	const movedLine = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (panel.rosterMovedUnderApply) movedLine.current?.focus();
	}, [panel.rosterMovedUnderApply]);
	const statusLines = useStatusLines(panel, engineList, shiftDay, movedLine);
	// The region starts empty and is filled a moment after it mounts, so the first line is read too.
	const [regionReady, setRegionReady] = useState(false);
	useEffect(() => {
		const timer = setTimeout(() => {
			setRegionReady(true);
		});
		return (): void => {
			clearTimeout(timer);
		};
	}, []);
	// Mounted for the row's life, empty while a card is reviewed; the alerts sit outside it.
	const liveRegion = (quiet: Array<ReactNode>): ReactNode => (
		<div aria-live="polite" className="flex flex-col gap-2">
			{regionReady && quiet}
		</div>
	);

	const reviewed = reviewing
		? reviewedCardOf(cards, {
				option: panel.chosenOption,
				membershipId: panel.selected?.membershipId,
			})
		: undefined;
	// The chosen change left the answer (the roster moved, or a new answer lacks it), or Apply was refused
	// because the roster moved: the review closes.
	if (reviewing && (!reviewed || panel.rosterMovedUnderApply))
		setReviewing(false);
	if (reviewed && !panel.rosterMovedUnderApply)
		return (
			<div className="flex flex-col gap-2">
				{liveRegion([])}
				<CoverRowReview
					card={reviewed}
					gapDay={gap.day}
					panel={panel}
					onBack={() => {
						panel.unchoose();
						focusAfterBack.current = reviewed.key;
						setReviewing(false);
					}}
				/>
			</div>
		);

	/** Chooses the card's change, then shows its review. */
	const review = (card: OptionCard): void => {
		const { choice } = card;
		if (choice.kind === "backend") panel.select(choice.option.membershipId);
		else panel.chooseRepair(choice.option);
		if (cards.indexOf(card) >= CARDS_BEFORE_FOLD) setShowAll(true);
		setReviewing(true);
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
			{liveRegion(statusLines.quiet)}
			{statusLines.alerts}
			{/* The hours-based people's caption sits over their cards, under the refusal that brought them; with nobody, the line saying so. */}
			{panel.view === "backendFallback" && panel.status === "options" && (
				<p className="text-xs font-semibold text-neutral-700">
					{t(`${engineKey}.fallbackCaption`)}
				</p>
			)}
			{panel.view === "backendFallback" && panel.status === "nobody" && (
				<Line text={t(`${engineKey}.fallbackNobody`)} />
			)}
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
									if (button) cardButtons.current.set(card.key, button);
									else cardButtons.current.delete(card.key);
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
 * the fold; a card opens its change inside the row (`CoverRowReview`), and why
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
