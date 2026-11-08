import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
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
	/** The approval step that rejected it, when a submission was rejected rather than the roster directly. */
	rejectedStep?: string;
	className?: string;
};

const key = "scheduling.decision";

/**
 * Under the roster header of a rejected roster, because someone has to act
 * on it: who rejected it (and at which approval step) and when, their
 * reason, and what to do next.
 * Renders nothing for any other status.
 */
export const RejectedRosterCallout = ({
	schedule,
	showsNextStep = false,
	rejectedStep,
	className,
}: RejectedRosterCalloutProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const decision = scheduleDecision(schedule);
	if (decision?.kind !== "rejected") return null;
	const language = formattingLocale(i18n);
	const at = decision.decidedAt
		? dateTimeFormatIn(language, schedule.timeZone, {
				dateStyle: "medium",
				timeStyle: "short",
			}).format(new Date(decision.decidedAt))
		: "";
	const rejectedLine = (): string => {
		if (rejectedStep)
			return decision.decidedBy
				? t("approvals.rejectedAt", {
						label: rejectedStep,
						name: decision.decidedBy,
						at,
					})
				: t("approvals.rejectedAtStep", { label: rejectedStep, at });
		return decision.decidedBy
			? t(`${key}.rejectedBy`, { name: decision.decidedBy, at })
			: t(`${key}.rejectedAt`, { at });
	};
	return (
		<Callout className={className} tone="warning">
			<span className="flex flex-col gap-3">
				<span>{rejectedLine()}</span>
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
