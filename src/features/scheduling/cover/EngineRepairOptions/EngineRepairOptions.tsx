import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Quote } from "@/components/ui/Quote";
import type { RepairOption } from "@/features/scheduling/cover/engineRepairApi";
import { refusalLineKey } from "@/features/scheduling/cover/coverListView";
import { repairCells } from "@/features/scheduling/cover/engineRepairChange";
import { extraHoursLine } from "@/features/scheduling/cover/engineRepairHours";
import { NotAssignedList } from "@/features/scheduling/cover/NotAssignedList";
import {
	leftShortLine,
	leftShortNextLine,
	RETRYABLE_REPAIR_REFUSALS,
	moveLine,
	optionHeadingKey,
	type RepairNames,
} from "@/features/scheduling/cover/engineRepairWords";
import type { EngineRepairState } from "@/features/scheduling/cover/useEngineRepair";
import type { RosterChangeCell } from "@/features/scheduling/rosterChanges/api";

export type EngineRepairOptionsProps = {
	/** Where the engine's answer stands, and how to ask again after a refusal. */
	repair: EngineRepairState & { askAgain: () => void };
	names: RepairNames;
	/**
	 * Reviews an option's change in Find cover's own review, before anything
	 * is applied; without it (a published roster, whose changes go out as
	 * offers) every option is made by hand. The option comes with its cells,
	 * for what it leaves short once applied.
	 */
	onReview?: (cells: Array<RosterChangeCell>, option: RepairOption) => void;
};

const key = "scheduling.cover.engine";

/** One option's card: its moves or the engine's honest no, its hours, what it leaves short, the working-time note and the review action. */
const OptionItem = ({
	option,
	names,
	onReview,
	warnedAbove,
}: {
	option: RepairOption;
	names: RepairNames;
	onReview?: (cells: Array<RosterChangeCell>, option: RepairOption) => void;
	/** The working-time note heads the list for every option, so this one need not repeat it. */
	warnedAbove: boolean;
}): FunctionComponent => {
	const { t } = useTranslation();
	const leftShort = leftShortLine(option, t);
	const leftShortNext = leftShortNextLine(option, t);
	const cells = repairCells(option);
	return (
		<li className="flex flex-col gap-2 rounded-lg border border-neutral-400 bg-white p-3">
			<p className="font-semibold text-neutral-900">
				{t(`${key}.${optionHeadingKey(option)}`)}
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
			{leftShortNext && <p className="text-neutral-700">{leftShortNext}</p>}
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
							onReview(cells, option);
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
 * The scheduling engine's options in Find cover's one list, asked for as the
 * panel opens: one line while the engine works, then one card per option,
 * feasible first, in plain words, an infeasible one with the engine's reason
 * quoted, and the note that working-time rules were not checked: once above
 * the cards when it holds for every option, otherwise on each option it holds
 * for. A feasible option whose change Find cover's Apply states exactly
 * (`repairCells`) offers to review it there; any other says it has to be made
 * by hand. Under them, why nobody else was assigned (`NotAssignedList`),
 * closed. A refusal says why (`refusalLineKey`), and a failure offers to ask
 * again.
 */
export const EngineRepairOptions = ({
	repair,
	names,
	onReview,
}: EngineRepairOptionsProps): FunctionComponent => {
	const { t } = useTranslation();
	switch (repair.status) {
		case "loading":
			return (
				<p aria-busy="true" className="text-neutral-700" role="status">
					{t(`${key}.loading`)}
				</p>
			);
		case "refused":
			return (
				<div className="flex flex-col items-start gap-2" role="alert">
					<p className="text-neutral-800">
						{t(refusalLineKey(repair.refusal))}
					</p>
					{RETRYABLE_REPAIR_REFUSALS.includes(repair.refusal) && (
						<Button variant="textlink" onClick={repair.askAgain}>
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
					<ul className="flex flex-col gap-2">
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
