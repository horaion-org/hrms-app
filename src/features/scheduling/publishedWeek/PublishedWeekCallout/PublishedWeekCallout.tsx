import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";

export type PublishedWeekCalloutProps = {
	/** The week's published schedule, opened by the link. */
	publishedScheduleId: string;
	/**
	 * `setup` while the week can still be changed; `blocked` once it is fixed
	 * and this schedule can't be generated or published.
	 */
	stage: "setup" | "blocked";
	className?: string;
};

/**
 * Says the Department's week already has its published roster, of which
 * there is one per week, with a link to that roster.
 */
export const PublishedWeekCallout = ({
	publishedScheduleId,
	stage,
	className,
}: PublishedWeekCalloutProps): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<Callout className={className} tone="warning">
			{t(`scheduling.publishedWeek.${stage}`)}{" "}
			<Button
				params={{ scheduleId: publishedScheduleId }}
				to="/scheduling/$scheduleId"
				variant="textlink"
			>
				{t("scheduling.publishedWeek.open")}
			</Button>
		</Callout>
	);
};
