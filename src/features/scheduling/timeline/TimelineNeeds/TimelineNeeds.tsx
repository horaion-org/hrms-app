import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AlertIcon } from "@/components/ui/Icon";
import { formatPeriod } from "@/features/scheduling/periods";
import type { NeedLine } from "@/features/scheduling/timeline/timeline";

export type TimelineNeedsProps = {
	lines: ReadonlyArray<NeedLine>;
	departmentId: string;
	/** "Review" was chosen on a schedule: shows it alone. */
	onReview: (scheduleId: string) => void;
	/** Whether the person may create schedules here; no "Create schedule" without it. */
	mayCreate: boolean;
};

/** One line of the needs list: what needs the manager, and its one action. */
const NeedItem = ({
	line,
	departmentId,
	onReview,
	mayCreate,
}: Omit<TimelineNeedsProps, "lines"> & {
	line: NeedLine;
}): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const key = "scheduling.timeline.needs";
	if (line.kind === "reviewOne")
		return (
			<>
				<span>{t(`${key}.reviewOne`, { name: line.name })}</span>
				<Button
					size="sm"
					variant="secondary"
					onClick={() => {
						onReview(line.scheduleId);
					}}
				>
					{t(`${key}.review`)}
				</Button>
			</>
		);
	if (line.kind === "reviewMany")
		return (
			<span>
				{t(`${key}.reviewMany`, {
					count: line.count,
					names: line.names.join(", "),
				})}
			</span>
		);
	const days = formatPeriod(
		{ start: line.firstDay, end: line.lastDay },
		formattingLocale(i18n)
	);
	return (
		<>
			<span>
				{t(
					line.schedulable
						? `${key}.noSchedule`
						: `${key}.noScheduleBeforePublished`,
					{ days }
				)}
			</span>
			{mayCreate && line.schedulable && (
				// The same dates run the month page's "Schedule <days>" opens (WeekCard).
				<Button
					size="sm"
					to="/scheduling/new"
					variant="secondary"
					search={{
						department: departmentId,
						for: "dates",
						firstDay: line.firstDay,
						lastDay: line.lastDay,
					}}
				>
					{t(`${key}.createSchedule`)}
				</Button>
			)}
		</>
	);
};

/** The "Needs you" list: schedules to review and days from today with no schedule. */
export const TimelineNeeds = ({
	lines,
	...actions
}: TimelineNeedsProps): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<Card icon={AlertIcon} title={t("scheduling.timeline.needs.heading")}>
			{lines.length === 0 ? (
				<p className="text-sm text-neutral-800">
					{t("scheduling.timeline.needs.none")}
				</p>
			) : (
				<ul className="flex flex-col gap-2 text-sm text-neutral-800">
					{lines.map((line) => (
						<li
							key={
								line.kind === "noSchedule"
									? line.firstDay
									: line.kind === "reviewOne"
										? line.scheduleId
										: line.kind
							}
							className="flex flex-wrap items-center justify-between gap-2"
						>
							<NeedItem line={line} {...actions} />
						</li>
					))}
				</ul>
			)}
		</Card>
	);
};
