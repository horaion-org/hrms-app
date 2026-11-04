import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { dateTimeFormatIn } from "@/features/scheduling/roster/roster";
import type { Schedule } from "@/features/scheduling/schedules/api";
import { scheduleDecision } from "./scheduleDecision";

export type ScheduleDecisionPanelProps = {
	schedule: Schedule;
	/** Offers to publish the roster; left out when this person can't decide it now. */
	onPublish?: () => void;
	/** Offers to reject the roster; left out when this person can't decide it now. */
	onReject?: () => void;
	/** Says what to do after a rejection; left out when the schedule can't be generated again. */
	showsNextStep?: boolean;
	className?: string;
};

const key = "scheduling.decision";

/**
 * Under the roster header: a generated roster waits to be published or
 * rejected (with both buttons for someone who may decide it); a decided
 * one says who decided and when, and why when it was rejected. Renders
 * nothing for a schedule without a roster.
 */
export const ScheduleDecisionPanel = ({
	schedule,
	onPublish,
	onReject,
	showsNextStep = false,
	className,
}: ScheduleDecisionPanelProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const decision = scheduleDecision(schedule);
	if (decision === null) return null;
	const boxClasses = joinClassNames(
		"rounded-lg border border-neutral-400 px-4 py-3 text-sm text-neutral-800",
		className
	);
	if (decision.kind === "pending") {
		const canDecide = onPublish !== undefined && onReject !== undefined;
		return (
			<section
				aria-label={t(`${key}.label`)}
				className={joinClassNames(
					"flex flex-wrap items-center justify-between gap-4",
					boxClasses
				)}
			>
				<p>{t(canDecide ? `${key}.pending` : `${key}.pendingReadOnly`)}</p>
				{canDecide && (
					<div className="flex items-center gap-3">
						<Button size="sm" variant="secondary" onClick={onReject}>
							{t(`${key}.reject`)}
						</Button>
						<Button size="sm" onClick={onPublish}>
							{t(`${key}.publish`)}
						</Button>
					</div>
				)}
			</section>
		);
	}
	const language = i18n.resolvedLanguage ?? i18n.language;
	const at = decision.decidedAt
		? dateTimeFormatIn(language, schedule.timeZone, {
				dateStyle: "medium",
				timeStyle: "short",
			}).format(new Date(decision.decidedAt))
		: "";
	const verb = decision.kind === "published" ? "published" : "rejected";
	return (
		<section aria-label={t(`${key}.label`)} className={boxClasses}>
			<p className="font-medium">
				{decision.decidedBy
					? t(`${key}.${verb}By`, { name: decision.decidedBy, at })
					: t(`${key}.${verb}At`, { at })}
			</p>
			{decision.reason !== null && (
				<figure className="mt-3">
					<figcaption className="font-semibold">
						{t(`${key}.reason`)}
					</figcaption>
					<blockquote className="mt-2 border-l-4 border-neutral-400 pl-4 whitespace-pre-line text-neutral-900">
						{decision.reason}
					</blockquote>
				</figure>
			)}
			{decision.kind === "rejected" && showsNextStep && (
				<p className="mt-3 text-neutral-700">{t(`${key}.rejectedNext`)}</p>
			)}
		</section>
	);
};
