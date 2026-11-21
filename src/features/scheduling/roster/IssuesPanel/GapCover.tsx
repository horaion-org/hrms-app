import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { formatDay } from "@/common/formatDay";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import type { CoverGapRequest } from "@/features/scheduling/cover/api";
import { refusalLineKey } from "@/features/scheduling/cover/coverListView";
import { RETRYABLE_REPAIR_REFUSALS } from "@/features/scheduling/cover/engineRepairWords";
import { NotAssignedList } from "@/features/scheduling/cover/NotAssignedList";
import {
	useCoverPanel,
	type CoverPanel,
	type CoverPanelInput,
} from "@/features/scheduling/cover/useCoverPanel";
import { useRepairWarmUp } from "@/features/scheduling/cover/useRepairWarmUp";
import type { CoverShift } from "@/features/scheduling/cover/coverOptionWords";
import {
	changeTileGroups,
	type TileShift,
} from "@/features/scheduling/roster/changeTiles";
import {
	fallbackCards,
	optionCardList,
	type OptionCard,
	type OptionCardSources,
} from "@/features/scheduling/roster/coverCards";
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
	<div className="flex flex-col items-start gap-1" role={alert ? "alert" : undefined}>
		<p className="text-neutral-800">{text}</p>
		{action && (
			<Button variant="textlink" onClick={action.onClick}>
				{action.label}
			</Button>
		)}
	</div>
);

/** The lines above the cards: the gap's own state, the engine at work or refusing, the backend's list state. */
const useStatusLines = (
	panel: CoverPanel,
	shiftDay: { shift: string; day: string }
): ReactNode => {
	const { t } = useTranslation();
	const { status, view, engineRepair } = panel;
	const tryAgain = t("scheduling.rosterEdit.tryAgain");
	const lines: Array<ReactNode> = [];
	if (status === "rosterMoved")
		lines.push(
			<Line
				key="moved"
				action={{ label: t(`${key}.panel.findAgain`), onClick: panel.findAgain }}
				text={t(`${key}.panel.rosterMoved`)}
			/>
		);
	if (status === "notEditable")
		lines.push(
			<Line key="locked" alert text={t("scheduling.rosterEdit.error.notEditable")} />
		);
	if (status === "closed")
		lines.push(<Line key="closed" text={t(`${key}.panel.covered`, shiftDay)} />);
	if (view === "gapStatus") return lines;
	if (engineRepair.status === "loading" && view !== "backendFallback")
		lines.push(<Line key="working" text={t(`${key}.engine.loading`)} />);
	if (engineRepair.status === "refused" && view === "backendFallback")
		lines.push(
			<Line
				key="refused"
				alert
				text={t(refusalLineKey(engineRepair.refusal))}
				action={
					RETRYABLE_REPAIR_REFUSALS.includes(engineRepair.refusal)
						? { label: tryAgain, onClick: engineRepair.askAgain }
						: undefined
				}
			/>
		);
	if (view === "engine") {
		const noneFeasible =
			engineRepair.status === "ready" &&
			!engineRepair.options.some((option) => option.feasible);
		if (noneFeasible)
			lines.push(<Line key="none" text={t(`${key}.engine.none`)} />);
		return lines;
	}
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
}: GapCoverProps & { dayRow: CoverPanelInput["dayRow"] }): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const panel = useCoverPanel({ ...cover, gap, dayRow });
	// Opening a gap warms the engine's worker, so its first options come fast.
	useRepairWarmUp(cover.target, cover.revision, true);
	const [reviewKey, setReviewKey] = useState<string>();
	// The roster's own days name a shift when the frozen shifts can't be read.
	const shiftOf = (shiftId: string): (TileShift & CoverShift) | undefined =>
		cover.shifts.find((shift) => shift.shiftId === shiftId) ??
		cover.assignments.find((row) => row.shift?.shiftId === shiftId)?.shift ??
		undefined;
	const shift = shiftOf(gap.shiftId);
	const shiftName = shift?.name ?? "";
	const shiftDay = { shift: shiftName, day: formatDay(gap.day, language) };
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
	const cards =
		panel.view === "engine"
			? optionCardList(
					engineRepair.status === "ready" ? engineRepair.options : [],
					sources
				).cards
			: panel.view === "backendFallback"
				? fallbackCards(panel.options?.options ?? [], sources)
				: [];
	const statusLines = useStatusLines(panel, shiftDay);

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
				panel={panel}
				onBack={() => {
					panel.unchoose();
					setReviewKey(undefined);
				}}
			/>
		);

	/** Chooses the card's change, then shows its review. */
	const review = (card: OptionCard): void => {
		const { choice } = card;
		if (choice.kind === "backend") panel.select(choice.option.membershipId);
		else panel.chooseRepair(choice.option);
		setReviewKey(card.key);
	};
	const { withEngine } = panel;
	const notAssigned = withEngine?.notAssigned ??
		(engineRepair.status === "ready" ? engineRepair.notAssigned : undefined);
	return (
		<div className="flex flex-col gap-2">
			{statusLines}
			{cards.length > 0 && (
				<ul className="flex flex-col gap-2">
					{cards.map((card) => (
						<li key={card.key}>
							<CoverCardItem
								card={card}
								now={now}
								timeZone={cover.coverOffers?.timeZone ?? ""}
								onReview={(): void => {
									review(card);
								}}
							/>
						</li>
					))}
				</ul>
			)}
			{panel.view === "engine" && notAssigned && notAssigned.length > 0 ? (
				<NotAssignedList
					people={notAssigned}
					title={t("scheduling.issues.cover.whyNot", {
						count: notAssigned.length,
					})}
				/>
			) : (
				panel.view !== "engine" && (
					<WhyNotOthers
						memberName={panel.review.names.member}
						people={withEngine?.unavailable ?? []}
						shift={shift}
					/>
				)
			)}
		</div>
	);
};

/**
 * A short shift's row, open: its options as cards (`coverCards`), asked of
 * the engine as it opens, with the one suggested; "Review" opens the change
 * inside the row (`CoverRowReview`), and why others were not chosen is folded
 * under the cards. `useCoverPanel` holds the state and calls. Nothing for a
 * day the roster does not hold.
 */
export const GapCover = ({ gap, cover }: GapCoverProps): FunctionComponent => {
	const dayRow = cover.assignments.find((row) => row.day === gap.day);
	return dayRow ? <GapCoverBody cover={cover} dayRow={dayRow} gap={gap} /> : null;
};
