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
	changeTilePairs,
	type TileShift,
} from "@/features/scheduling/roster/changeTiles";
import { coverCards, type CoverCard } from "@/features/scheduling/roster/coverCards";
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
	const hours = new Intl.NumberFormat(language, { maximumFractionDigits: 1 });
	const shiftDay = { shift: shiftName, day: formatDay(gap.day, language) };
	const names = {
		member: panel.review.names.member,
		day: (date: string) => formatDay(date, language),
		hours: (minutes: number) => hours.format(minutes / 60),
	};
	const { engineRepair, withEngine } = panel;
	const cards = coverCards({
		view: panel.view,
		engineOptions:
			engineRepair.status === "ready" ? engineRepair.options : undefined,
		backend:
			panel.status === "options" || panel.status === "nobody"
				? withEngine
				: undefined,
		memberName: panel.review.names.member,
		pairsOf: (cells) => changeTilePairs(cells, cover.assignments, shiftOf, t),
	});
	const statusLines = useStatusLines(panel, shiftDay);

	/** Whether the card under review is the one chosen now: a person of the list, or the engine's change. */
	const isChosen = (card: CoverCard): boolean =>
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
	const review = (card: CoverCard): void => {
		const { choice } = card;
		if (choice.kind === "backend") panel.select(choice.option.membershipId);
		else if (choice.cells) panel.chooseRepair(choice.cells, choice.option);
		setReviewKey(card.key);
	};
	// A published roster's engine options go out as offers, one person at a time: made by hand there.
	const reviewable = (card: CoverCard): boolean =>
		card.choice.kind === "backend" || cover.coverOffers === undefined;
	const notAssigned = withEngine?.notAssigned ??
		(engineRepair.status === "ready" ? engineRepair.notAssigned : undefined);
	return (
		<div className="flex flex-col gap-2">
			{statusLines}
			{cards.length > 0 && (
				<ul className="flex flex-col gap-2">
					{cards.map((card) => (
						<CoverCardItem
							key={card.key}
							card={card}
							names={names}
							shiftName={shiftName}
							onReview={
								reviewable(card)
									? () => {
											review(card);
										}
									: undefined
							}
						/>
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
