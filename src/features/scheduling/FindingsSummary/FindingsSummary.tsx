import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import {
	hasFindings,
	type FindingCounts,
} from "@/features/scheduling/roster/findings/findingCounts";

export type FindingsSummaryProps = {
	counts: FindingCounts;
	/** Whether the findings panel is open. */
	expanded: boolean;
	/** The findings panel's id, which the toggle controls. */
	panelId: string;
	onToggle: () => void;
	className?: string;
};

const key = "scheduling.findings";

/** "The scheduling engine left 3 roster notes and 2 setup issues." */
const summaryOf = ({ roster, setup }: FindingCounts, t: TFunction): string => {
	const rosterNotes = t(`${key}.rosterNotes`, { count: roster });
	const setupIssues = t(`${key}.setupIssues`, { count: setup });
	if (roster > 0 && setup > 0)
		return t(`${key}.summaryBoth`, { rosterNotes, setupIssues });
	return t(`${key}.summaryOne`, {
		findings: roster > 0 ? rosterNotes : setupIssues,
	});
};

/**
 * How much the engine left on a generated roster, by kind, with the toggle
 * that shows or hides the findings panel. Shown only when there is something.
 */
export const FindingsSummary = ({
	counts,
	expanded,
	panelId,
	onToggle,
	className,
}: FindingsSummaryProps): FunctionComponent => {
	const { t } = useTranslation();
	if (!hasFindings(counts)) return null;
	return (
		<Callout className={className} tone="warning">
			<span className="flex flex-wrap items-center gap-x-4 gap-y-1">
				{summaryOf(counts, t)}
				<Button
					aria-controls={panelId}
					aria-expanded={expanded}
					variant="textlink"
					onClick={onToggle}
				>
					{t(expanded ? `${key}.hideDetails` : `${key}.showDetails`)}
				</Button>
			</span>
		</Callout>
	);
};
