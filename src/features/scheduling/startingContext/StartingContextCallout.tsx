import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import type { StartingDays } from "@/features/scheduling/startingContext/api";
import { previousWeekOf } from "@/features/scheduling/startingContext/startingGrid";

export type StartingContextCalloutProps = {
	week: StartingDays;
	/** Members with any day entered on the draft. */
	enteredCount: number;
	/** Opens the week-before grid; left out when the draft can't be changed. */
	onAdd?: () => void;
	className?: string;
};

const key = "scheduling.startingContext";

/**
 * One calm line on the Generate step about the week before the period: no
 * roster (everyone starts rested unless days are added), or the roster it
 * carries over from, naming members it doesn't cover.
 */
export const StartingContextCallout = ({
	week,
	enteredCount,
	onAdd,
	className,
}: StartingContextCalloutProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = i18n.resolvedLanguage ?? i18n.language;
	const previous = previousWeekOf(week);
	const weekOf = (periodStart: string): string =>
		new Intl.DateTimeFormat(language, {
			day: "numeric",
			month: "short",
		}).format(new Date(`${periodStart}T00:00:00`));
	const message =
		previous.kind === "none"
			? enteredCount > 0
				? t(`${key}.noneWithEntries`, { count: enteredCount })
				: t(`${key}.none`)
			: previous.uncovered > 0
				? t(`${key}.carriedWithNew`, {
						week: weekOf(previous.periodStart),
						count: previous.uncovered,
					})
				: t(`${key}.carried`, { week: weekOf(previous.periodStart) });
	const addable =
		onAdd !== undefined && (previous.kind === "none" || previous.uncovered > 0);
	return (
		<Callout className={className}>
			<span className="flex flex-wrap items-center gap-x-4 gap-y-1">
				<span>{message}</span>
				{addable && (
					<Button variant="textlink" onClick={onAdd}>
						{enteredCount > 0 ? t(`${key}.edit`) : t(`${key}.add`)}
					</Button>
				)}
			</span>
		</Callout>
	);
};
