import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AlertIcon } from "@/components/ui/Icon";
import { dayCountOf } from "@/features/scheduling/dates/datesSetup";
import { formatPeriod } from "@/features/scheduling/periods";
import type { NeedLine } from "@/features/scheduling/timeline/timeline";

export type TimelineNeedsProps = {
	lines: ReadonlyArray<NeedLine>;
	departmentId: string;
	/** "Publish" was chosen on days to review, naming the schedules that hold them; no Publish when left out. */
	onPublish?: (scheduleIds: ReadonlyArray<string>) => void;
	/** Whether the person may create schedules here; no "Generate" without it. */
	mayCreate: boolean;
};

/** One line of the needs list: the days that need the manager, and their one action. */
const NeedItem = ({
	line,
	departmentId,
	onPublish,
	mayCreate,
}: Omit<TimelineNeedsProps, "lines"> & {
	line: NeedLine;
}): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const key = "scheduling.timeline.needs";
	const days = formatPeriod(
		{ start: line.firstDay, end: line.lastDay },
		formattingLocale(i18n)
	);
	const count = dayCountOf(line.firstDay, line.lastDay);
	if (line.kind === "toReview")
		return (
			<>
				<span>{t(`${key}.toReview`, { days, count })}</span>
				{onPublish && (
					<Button
						size="sm"
						variant="secondary"
						onClick={() => {
							onPublish(line.scheduleIds);
						}}
					>
						{t(`${key}.publish`)}
					</Button>
				)}
			</>
		);
	return (
		<>
			<span>
				{line.schedulable
					? t(`${key}.noRoster`, { days, count })
					: t(`${key}.noScheduleBeforePublished`, { days })}
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
					{t(`${key}.generate`)}
				</Button>
			)}
		</>
	);
};

/** The "Needs you" list: the days to review and the days from today with no roster. */
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
							key={`${line.kind}-${line.firstDay}`}
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
