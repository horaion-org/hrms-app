import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Quote } from "@/components/ui/Quote";
import { Skeleton } from "@/components/ui/Skeleton";
import type { RepairOption } from "@/features/scheduling/cover/engineRepairApi";
import { repairCells } from "@/features/scheduling/cover/engineRepairChange";
import { extraHoursLine } from "@/features/scheduling/cover/engineRepairHours";
import { NotAssignedList } from "@/features/scheduling/cover/NotAssignedList";
import {
	leftShortLine,
	moveLine,
	type RepairNames,
} from "@/features/scheduling/cover/engineRepairWords";
import type { EngineRepairState } from "@/features/scheduling/cover/useEngineRepair";
import type { RosterChangeCell } from "@/features/scheduling/rosterChanges/api";

export type EngineRepairOptionsProps = {
	/** Where the ask stands, and how to ask (again). */
	repair: EngineRepairState & { ask: () => void };
	names: RepairNames;
	/**
	 * Reviews an option's change in Find cover's own review, before anything
	 * is applied; without it (a published roster, whose changes go out as
	 * offers) every option is made by hand.
	 */
	onReview?: (cells: Array<RosterChangeCell>) => void;
};

const key = "scheduling.cover.engine";
const SKELETON_ROWS = ["first", "second"];

/** One option: its moves or the engine's honest no, what it leaves short, and the visible working-time note. */
const OptionItem = ({
	option,
	names,
	onReview,
	warnedAbove,
}: {
	option: RepairOption;
	names: RepairNames;
	onReview?: (cells: Array<RosterChangeCell>) => void;
	/** The working-time note heads the list for every option, so this one need not repeat it. */
	warnedAbove: boolean;
}): FunctionComponent => {
	const { t } = useTranslation();
	const leftShort = leftShortLine(option, t);
	const cells = repairCells(option);
	return (
		<li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
			<p className="font-semibold text-neutral-900">
				{t(option.feasible ? `${key}.fills` : `${key}.cannotFill`)}
			</p>
			{option.moves.length > 0 && (
				<ul className="flex flex-col gap-1 text-neutral-800">
					{option.moves
						.map((move) => moveLine(move, names, t))
						.map((line) => (
							<li key={line}>{line}</li>
						))}
				</ul>
			)}
			{option.feasible && extraHoursLine(option, names, t) && (
				<p className="text-neutral-800">{extraHoursLine(option, names, t)}</p>
			)}
			{leftShort && <p className="text-neutral-700">{leftShort}</p>}
			{!option.feasible && option.infeasibleReason && (
				<Quote caption={t(`${key}.reason`)}>{option.infeasibleReason}</Quote>
			)}
			{option.warnings.length > 0 && (
				<Quote caption={t(`${key}.warnings`)}>
					{option.warnings.join("\n")}
				</Quote>
			)}
			{!option.workingTimeRulesChecked && !warnedAbove && (
				<Callout tone="warning">{t(`${key}.notChecked`)}</Callout>
			)}
			{option.feasible &&
				(cells && onReview ? (
					<Button
						className="self-start"
						size="sm"
						variant="secondary"
						onClick={() => {
							onReview(cells);
						}}
					>
						{t(`${key}.review`)}
					</Button>
				) : (
					<p className="text-neutral-700">{t(`${key}.byHand`)}</p>
				))}
		</li>
	);
};

/**
 * The scheduling engine's options in Find cover's panel, under the backend's
 * own suggestions: asked for with a button (the engine runs a solver, which
 * takes a moment), then each option feasible first, in plain words, an
 * infeasible one with the engine's reason quoted, and the note that
 * working-time rules were not checked: once above the list when it holds for
 * every option, otherwise on each option it holds for. A feasible option whose
 * change Find cover's Apply states exactly (`repairCells`) offers to review
 * it there; any other says it has to be made by hand. Under them, why nobody
 * else was assigned (`NotAssignedList`). A refusal says why, and a failure
 * offers to ask again.
 */
export const EngineRepairOptions = ({
	repair,
	names,
	onReview,
}: EngineRepairOptionsProps): FunctionComponent => {
	const { t } = useTranslation();
	switch (repair.status) {
		case "idle":
			return (
				<div className="flex flex-col items-start gap-2">
					<p className="text-neutral-700">{t(`${key}.intro`)}</p>
					<Button size="sm" variant="secondary" onClick={repair.ask}>
						{t(`${key}.ask`)}
					</Button>
				</div>
			);
		case "loading":
			return (
				<div aria-busy="true" className="flex flex-col gap-3">
					<span className="sr-only">{t(`${key}.loading`)}</span>
					{SKELETON_ROWS.map((row) => (
						<Skeleton key={row} className="h-16 w-full rounded-xl" />
					))}
				</div>
			);
		case "refused":
			return (
				<div className="flex flex-col items-start gap-2" role="alert">
					<p className="text-neutral-800">
						{t(`${key}.refusal.${repair.refusal}`)}
					</p>
					{repair.refusal === "failed" && (
						<Button variant="textlink" onClick={repair.ask}>
							{t("scheduling.rosterEdit.tryAgain")}
						</Button>
					)}
				</div>
			);
		default: {
			if (repair.options.length === 0)
				return (
					<div className="flex flex-col gap-3">
						<p className="text-neutral-800">{t(`${key}.none`)}</p>
						<NotAssignedList people={repair.notAssigned} />
					</div>
				);
			// When no option was checked, as on tonight's engine, one note heads the list for all of them.
			const noneChecked = repair.options.every(
				(option) => !option.workingTimeRulesChecked
			);
			return (
				<div className="flex flex-col gap-3">
					{noneChecked && (
						<Callout tone="warning">{t(`${key}.noneChecked`)}</Callout>
					)}
					<ul className="flex flex-col divide-y divide-neutral-300">
						{repair.options.map((option, rank) => (
							// An option has no id of its own; its place in the engine's ranking is stable.
							<OptionItem
								key={rank}
								names={names}
								option={option}
								warnedAbove={noneChecked}
								onReview={onReview}
							/>
						))}
					</ul>
					<NotAssignedList people={repair.notAssigned} />
				</div>
			);
		}
	}
};
