import { useState } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { weekdayOf } from "@/common/weekdays";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { WeekGrid, type WeekGridRowData } from "@/components/ui/WeekGrid";
import {
	TEAM_PAGE_SIZE,
	type TeamMemberWeek,
} from "@/features/shiftPreferences/api";
import { PreferredShiftsCell } from "@/features/shiftPreferences/PreferredShiftsCell";
import { useTeamPreferences } from "@/features/shiftPreferences/useShiftPreferences";

export type TeamShiftPreferencesProps = {
	companyId: string;
	/** The Department whose members are listed. */
	departmentId: string;
	/** The week shown, as its Monday. */
	weekStartMonday: string;
	/** The one day shown below `md`, as the page's `DaySwitcher` picks it. */
	shownDay?: string;
	className?: string;
};

const key = "shiftPreferences.team";

/** One member's row: their name, and each day's preferred shifts as chips. */
const rowOf = (member: TeamMemberWeek): WeekGridRowData => ({
	id: member.membershipId,
	heading: <span className="text-sm font-medium">{member.displayName}</span>,
	days: member.days.map((day) => ({
		day: weekdayOf(day.date),
		cell: <PreferredShiftsCell names={day.shifts.map((shift) => shift.name)} />,
	})),
});

/** One Department's members and their preferred shifts for a week, read-only, a page at a time. */
export const TeamShiftPreferences = ({
	companyId,
	departmentId,
	weekStartMonday,
	shownDay,
	className,
}: TeamShiftPreferencesProps): FunctionComponent => {
	const { t } = useTranslation();
	const [page, setPage] = useState(0);
	const team = useTeamPreferences(companyId, {
		departmentId,
		weekStartMonday,
		page,
	});
	if (team.status === "hidden")
		return <p className="text-sm text-neutral-800">{t(`${key}.hidden`)}</p>;
	if (team.status === "error")
		return (
			<p className="text-sm text-error-700" role="alert">
				{t(`${key}.failed`)}
			</p>
		);
	if (team.status !== "ready")
		return (
			<Skeleton
				className={joinClassNames("h-36 w-full rounded-lg", className)}
			/>
		);
	return (
		<div className={className}>
			<WeekGrid
				emptyState={t(`${key}.empty`)}
				headingLabel={t(`${key}.member`)}
				label={t(`${key}.label`)}
				rows={team.page.content.map(rowOf)}
				shownDay={shownDay}
				weekStartMonday={weekStartMonday}
			/>
			<Pagination
				page={page + 1}
				pageSize={TEAM_PAGE_SIZE}
				total={team.page.page.totalElements}
				onPageChange={(next) => {
					setPage(next - 1);
				}}
			/>
		</div>
	);
};
