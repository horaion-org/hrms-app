import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import type { StartingDays } from "@/features/scheduling/startingContext/api";
import {
	missingDayCounts,
	previousWeekOf,
} from "@/features/scheduling/startingContext/startingGrid";

export type StartingContextCalloutProps = {
	week: StartingDays;
	/** Members with any day entered on the draft. */
	enteredCount: number;
	/** Opens the week-before grid; left out when the draft can't be changed. */
	onAdd?: () => void;
	/** The person can't change the draft, so someone else has to add missing days. */
	readOnly?: boolean;
	className?: string;
};

const key = "scheduling.startingContext";

/**
 * One line on the Generate step about the week before the period: what is
 * still missing, which holds generation back; otherwise no roster, or the
 * roster it carries over from, naming members it doesn't cover.
 */
export const StartingContextCallout = ({
	week,
	enteredCount,
	onAdd,
	readOnly = false,
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
	const carriedMessage = (periodStart: string, uncovered: number): string => {
		const week = weekOf(periodStart);
		if (uncovered === 0) return t(`${key}.carried`, { week });
		return enteredCount > 0
			? t(`${key}.carriedWithEntries`, { week, count: enteredCount })
			: t(`${key}.carriedWithNew`, { week, count: uncovered });
	};
	const missing = missingDayCounts(week);
	const incomplete = missing.days > 0;
	const missingMessage = t(`${key}.missing`, {
		days: t(`${key}.missingDays`, { count: missing.days }),
		people: t(`${key}.missingPeople`, { count: missing.people }),
	});
	const message = incomplete
		? readOnly
			? `${missingMessage} ${t(`${key}.missingNoEdit`)}`
			: missingMessage
		: previous.kind === "carried"
			? carriedMessage(previous.periodStart, previous.uncovered)
			: enteredCount > 0
				? t(`${key}.noneWithEntries`, { count: enteredCount })
				: t(`${key}.none`);
	const addable =
		onAdd !== undefined &&
		(incomplete || previous.kind === "none" || previous.uncovered > 0);
	return (
		<Callout className={className} tone={incomplete ? "warning" : "info"}>
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
