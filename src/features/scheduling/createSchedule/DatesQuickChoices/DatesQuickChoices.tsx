import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import {
	QUICK_CHOICES,
	quickRangeOf,
	type QuickRange,
} from "@/features/scheduling/dates/quickRanges";

export type DatesQuickChoicesProps = {
	/** The branch's today, as "YYYY-MM-DD": every choice counts from it. */
	today: string;
	/** Told the first and last day of the choice pressed. */
	onChoose: (range: QuickRange) => void;
	className?: string;
};

/**
 * The quick choices of days on Generate: "Rest of this week", "Next week",
 * "This month" and "Next month". Pressing one only hands over its first and
 * last day; the form fills its two date fields with them.
 */
export const DatesQuickChoices = ({
	today,
	onChoose,
	className,
}: DatesQuickChoicesProps): FunctionComponent => {
	const { t } = useTranslation();
	const labelId = useId();
	return (
		<div aria-labelledby={labelId} className={className} role="group">
			<span className="text-sm font-normal text-neutral-800" id={labelId}>
				{t("scheduling.dates.setup.quick.label")}
			</span>
			<div className="mt-2 flex flex-wrap gap-3">
				{QUICK_CHOICES.map((choice) => (
					<Button
						key={choice}
						size="sm"
						variant="secondary"
						onClick={() => {
							onChoose(quickRangeOf(choice, today));
						}}
					>
						{t(`scheduling.dates.setup.quick.${choice}`)}
					</Button>
				))}
			</div>
		</div>
	);
};
