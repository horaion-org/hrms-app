import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import type { PreviousWeek } from "@/features/scheduling/startingContext/startingGrid";

export type StartingContextCalloutProps = {
	/**
	 * Whether a roster covers the week before (`previousWeekOf` a draft's
	 * starting days, or the month page's own read before any draft exists).
	 */
	previous: PreviousWeek;
	/** Members with any day entered on the draft. */
	enteredCount: number;
	/** Opens the week-before grid; left out when the draft can't be changed. */
	onAdd?: () => void;
	/** The button waits while `onAdd`'s own work is under way, such as the month page saving its first week. */
	adding?: boolean;
	className?: string;
};

const key = "scheduling.startingContext";

/**
 * The line on the Generate step about the week before the period. With no
 * roster before it and nothing entered, a warning says Horaion doesn't know
 * last week and why that matters, with a button to add its shifts (the
 * nearest analogue: ReadinessCallout's warning, a title then a plain line).
 * With days entered, a calm line and the same button to edit them. When a
 * roster carries over, a calm line naming members it doesn't cover, with a
 * small link to edit their days. Without `onAdd`, no control. It never
 * blocks generating. The week page and the month page both show it.
 */
export const StartingContextCallout = ({
	previous,
	enteredCount,
	onAdd,
	adding = false,
	className,
}: StartingContextCalloutProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const weekOf = (periodStart: string): string =>
		new Intl.DateTimeFormat(language, {
			day: "numeric",
			month: "short",
		}).format(new Date(`${periodStart}T00:00:00`));
	/** The prompt to enter last week's shifts, on its own line under the words. */
	const shiftsButton = (label: string): FunctionComponent =>
		onAdd === undefined ? null : (
			<span className="mt-3 block">
				<Button disabled={adding} size="sm" variant="secondary" onClick={onAdd}>
					{label}
				</Button>
			</span>
		);

	if (previous.kind === "none" && enteredCount === 0)
		return (
			<Callout className={className} tone="warning">
				<span className="block">{t(`${key}.unknownLastWeek`)}</span>
				<span className="mt-1 block font-normal">
					{t(`${key}.unknownLastWeekRisk`)}
				</span>
				{shiftsButton(t(`${key}.addShifts`))}
			</Callout>
		);

	if (previous.kind === "none")
		return (
			<Callout className={className}>
				<span className="block">
					{t(`${key}.noneWithEntries`, { count: enteredCount })}
				</span>
				{shiftsButton(t(`${key}.editShifts`))}
			</Callout>
		);

	const carried =
		previous.uncovered > 0
			? t(`${key}.carriedWithNew`, {
					week: weekOf(previous.periodStart),
					count: previous.uncovered,
				})
			: t(`${key}.carried`, { week: weekOf(previous.periodStart) });
	// A carried-over week only needs days for the members its roster doesn't cover.
	const editable = onAdd !== undefined && previous.uncovered > 0;
	return (
		<Callout className={className}>
			<span className="flex flex-wrap items-center gap-x-4 gap-y-1">
				<span>{carried}</span>
				{editable && (
					<Button variant="textlink" onClick={onAdd}>
						{t(`${key}.editShifts`)}
					</Button>
				)}
			</span>
		</Callout>
	);
};
