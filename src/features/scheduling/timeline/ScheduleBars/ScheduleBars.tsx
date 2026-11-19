import { Menu, MenuButton, MenuItems } from "@headlessui/react";
import { useNavigate } from "@tanstack/react-router";
import dayjs from "dayjs";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import {
	compactMenuPanelClasses,
	OverflowMenuItem,
} from "@/components/ui/OverflowMenu";
import { weekStateTones } from "@/features/scheduling/months/weekStateLooks";
import { DeleteScheduleDialog } from "@/features/scheduling/schedules/DeleteScheduleDialog";
import {
	isDimmed,
	laneCellsOf,
	timelineScheduleLink,
	lanesOf,
	type TimelineSchedule,
	type TimelineView,
} from "@/features/scheduling/timeline/timeline";
import {
	barContentOf,
	LABEL_DAY_FORMAT,
	staffCellClasses,
	statusDotLooks,
} from "@/features/scheduling/timeline/timelineLooks";
import type { DeleteTarget } from "@/features/scheduling/timeline/useDepartmentTimeline";

/** What Delete on a bar needs: the company, the schedules the person may delete, and what to do once one is deleted. */
export type BarDeleting = {
	companyId: string;
	targets: Record<string, DeleteTarget>;
	onDeleted: (scheduleId: string) => void;
};

export type ScheduleBarsProps = {
	deleting: BarDeleting;
	/** The Department the schedules belong to, which a draft's setup link names. */
	departmentId: string;
	schedules: ReadonlyArray<TimelineSchedule>;
	/** The ISO dates shown, one column each. */
	days: ReadonlyArray<string>;
	view: TimelineView;
	/** The one schedule shown in full; the other bars are dimmed, as their cells are. */
	shownScheduleId?: string;
	/** "Show only this schedule" was chosen. */
	onShowOnly: (scheduleId: string) => void;
};

/**
 * One schedule's bar: its status dot, and its name and status badge where the
 * zoom has room; named in full ("name, first day to last day, state") so two
 * schedules of one name can be told apart. Opens its menu.
 */
const ScheduleBar = ({
	departmentId,
	deleting,
	schedule,
	span,
	view,
	onShowOnly,
}: {
	departmentId: string;
	deleting: BarDeleting;
	schedule: TimelineSchedule;
	span: number;
	view: TimelineView;
	onShowOnly: (scheduleId: string) => void;
}): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const navigate = useNavigate();
	const [confirmingDelete, setConfirmingDelete] = useState(false);
	// Only a schedule read and deletable under the roster page's rule is a target (useDepartmentTimeline).
	const deleteTarget = deleting.targets[schedule.id];
	const state = t(`scheduling.months.states.${schedule.status}`);
	const dayName = new Intl.DateTimeFormat(
		formattingLocale(i18n),
		LABEL_DAY_FORMAT
	);
	const label = t("scheduling.timeline.bars.bar", {
		name: schedule.name,
		from: dayName.format(dayjs(schedule.firstDay).toDate()),
		to: dayName.format(dayjs(schedule.lastDay).toDate()),
		state,
	});
	const { showsName, showsBadge } = barContentOf(view, span);
	return (
		<Menu as="div" className="w-full">
			<MenuButton
				aria-label={label}
				className="flex h-8 w-full min-w-0 cursor-pointer items-center gap-2 rounded-md border border-neutral-400 bg-white px-2 text-left text-xs font-semibold whitespace-nowrap text-neutral-900 data-hover:bg-neutral-100 data-open:bg-ink-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-blue-500"
				title={label}
			>
				<span
					aria-hidden="true"
					className={joinClassNames(
						"size-2 shrink-0 rounded-full",
						statusDotLooks[weekStateTones[schedule.status]]
					)}
				/>
				{showsName && <span className="truncate">{schedule.name}</span>}
				{showsBadge && (
					<Badge compact tone={weekStateTones[schedule.status]}>
						{state}
					</Badge>
				)}
			</MenuButton>
			<MenuItems
				anchor="bottom start"
				className={joinClassNames(compactMenuPanelClasses, "min-w-48")}
			>
				<OverflowMenuItem
					onClick={() => {
						void navigate(timelineScheduleLink(schedule, departmentId));
					}}
				>
					{t("scheduling.timeline.bars.openSchedule")}
				</OverflowMenuItem>
				<OverflowMenuItem
					onClick={() => {
						onShowOnly(schedule.id);
					}}
				>
					{t("scheduling.timeline.bars.showOnly")}
				</OverflowMenuItem>
				{deleteTarget && (
					<OverflowMenuItem
						tone="danger"
						onClick={() => {
							setConfirmingDelete(true);
						}}
					>
						{t("scheduling.delete.menu")}
					</OverflowMenuItem>
				)}
			</MenuItems>
			{confirmingDelete && deleteTarget && (
				<DeleteScheduleDialog
					companyId={deleting.companyId}
					schedule={deleteTarget.schedule}
					weekParts={deleteTarget.weekParts}
					onClose={() => {
						setConfirmingDelete(false);
					}}
					onDeleted={() => {
						setConfirmingDelete(false);
						deleting.onDeleted(schedule.id);
					}}
				/>
			)}
		</Menu>
	);
};

/**
 * The schedules as table rows over the day columns, packed into lanes so
 * schedules that don't overlap share one; the Staff column says "Schedules".
 * Each bar's cell spans exactly the columns of its days in the window.
 */
export const ScheduleBars = ({
	deleting,
	departmentId,
	schedules,
	days,
	view,
	shownScheduleId,
	onShowOnly,
}: ScheduleBarsProps): FunctionComponent => {
	const { t } = useTranslation();
	const lanes = lanesOf(schedules, days[0] ?? "", days[days.length - 1] ?? "");
	return (
		<>
			{lanes.map((lane, laneIndex) => (
				<tr
					key={lane[0]!.id}
					className={joinClassNames(
						laneIndex === 0 && "border-t border-neutral-400"
					)}
				>
					{laneIndex === 0 && (
						<th
							rowSpan={lanes.length}
							scope="row"
							className={joinClassNames(
								staffCellClasses,
								"align-top text-sm font-normal"
							)}
						>
							{t("scheduling.timeline.bars.label")}
						</th>
					)}
					{laneCellsOf(lane, days).map((cell) =>
						cell.kind === "gap" ? (
							<td key={cell.firstDay} colSpan={cell.span} />
						) : (
							<td
								key={cell.schedule.id}
								colSpan={cell.span}
								data-schedule-id={cell.schedule.id}
								className={joinClassNames(
									"px-1 py-1",
									isDimmed(cell.schedule.id, shownScheduleId) && "opacity-40"
								)}
							>
								<ScheduleBar
									deleting={deleting}
									departmentId={departmentId}
									schedule={cell.schedule}
									span={cell.span}
									view={view}
									onShowOnly={onShowOnly}
								/>
							</td>
						)
					)}
				</tr>
			))}
		</>
	);
};
