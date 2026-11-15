import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Quote } from "@/components/ui/Quote";
import { Skeleton } from "@/components/ui/Skeleton";
import type { RepairOption } from "@/features/scheduling/cover/engineRepairApi";
import {
	leftShortLine,
	moveLine,
	type RepairNames,
} from "@/features/scheduling/cover/engineRepairWords";
import type { EngineRepairState } from "@/features/scheduling/cover/useEngineRepair";

export type EngineRepairOptionsProps = {
	/** Where the ask stands, and how to ask (again). */
	repair: EngineRepairState & { ask: () => void };
	names: RepairNames;
};

const key = "scheduling.cover.engine";
const SKELETON_ROWS = ["first", "second"];

/** One option: its moves or the engine's honest no, what it leaves short, and the visible working-time note. */
const OptionItem = ({
	option,
	names,
}: {
	option: RepairOption;
	names: RepairNames;
}): FunctionComponent => {
	const { t } = useTranslation();
	const leftShort = leftShortLine(option, t);
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
			{leftShort && <p className="text-neutral-700">{leftShort}</p>}
			{!option.feasible && option.infeasibleReason && (
				<Quote caption={t(`${key}.reason`)}>{option.infeasibleReason}</Quote>
			)}
			{option.warnings.length > 0 && (
				<Quote caption={t(`${key}.warnings`)}>
					{option.warnings.join("\n")}
				</Quote>
			)}
			{!option.workingTimeRulesChecked && (
				<Callout tone="warning">{t(`${key}.notChecked`)}</Callout>
			)}
		</li>
	);
};

/**
 * The scheduling engine's options in Find cover's panel, under the backend's
 * own suggestions: asked for with a button (the engine runs a solver, which
 * takes a moment), then each option feasible first, in plain words, an
 * infeasible one with the engine's reason quoted, and on every option the
 * note that working-time rules were not checked. A refusal says why, and a
 * failure offers to ask again.
 */
export const EngineRepairOptions = ({
	repair,
	names,
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
		default:
			return repair.options.length === 0 ? (
				<p className="text-neutral-800">{t(`${key}.none`)}</p>
			) : (
				<ul className="flex flex-col divide-y divide-neutral-300">
					{repair.options.map((option, rank) => (
						// An option has no id of its own; its place in the engine's ranking is stable.
						<OptionItem key={rank} names={names} option={option} />
					))}
				</ul>
			);
	}
};
