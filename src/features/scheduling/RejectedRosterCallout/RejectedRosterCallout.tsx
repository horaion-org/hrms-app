import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Callout } from "@/components/ui/Callout";
import { Quote } from "@/components/ui/Quote";
import { dateTimeFormatIn } from "@/features/scheduling/roster/roster";
import type { Schedule } from "@/features/scheduling/schedules/api";
import { scheduleDecision } from "@/features/scheduling/schedules/scheduleDecision";

export type RejectedRosterCalloutProps = {
	schedule: Schedule;
	/** Says what to do next; left out when the schedule can't be generated again. */
	showsNextStep?: boolean;
	className?: string;
};

const key = "scheduling.decision";

/**
 * Under the roster header of a rejected roster, because someone has to act
 * on it: who rejected it and when, their reason, and what to do next.
 * Renders nothing for any other status.
 */
export const RejectedRosterCallout = ({
	schedule,
	showsNextStep = false,
	className,
}: RejectedRosterCalloutProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const decision = scheduleDecision(schedule);
	if (decision?.kind !== "rejected") return null;
	const language = i18n.resolvedLanguage ?? i18n.language;
	const at = decision.decidedAt
		? dateTimeFormatIn(language, schedule.timeZone, {
				dateStyle: "medium",
				timeStyle: "short",
			}).format(new Date(decision.decidedAt))
		: "";
	return (
		<Callout className={className} tone="warning">
			<span className="flex flex-col gap-3">
				<span>
					{decision.decidedBy
						? t(`${key}.rejectedBy`, { name: decision.decidedBy, at })
						: t(`${key}.rejectedAt`, { at })}
				</span>
				{decision.reason !== null && (
					<Quote caption={t(`${key}.reason`)}>{decision.reason}</Quote>
				)}
				{showsNextStep && (
					<span className="font-normal">{t(`${key}.rejectedNext`)}</span>
				)}
			</span>
		</Callout>
	);
};
