import { useId, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
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

/** One member's row: their name (`formerMember` once removed), and each day's preferred shifts as chips. */
const rowOf = (
	member: TeamMemberWeek,
	formerMember: string
): WeekGridRowData => ({
	id: member.membershipId,
	heading: (
		<span className="text-sm font-medium">
			{member.displayName ?? formerMember}
		</span>
	),
	days: member.days.map((day) => ({
		day: weekdayOf(day.date),
		cell: <PreferredShiftsCell shifts={day.shifts} />,
	})),
});

/**
 * One Department's members and their preferred shifts for a week, read-only,
 * a page at a time, under its own heading. Whether the person may read them
 * is the hook's call alone: held nowhere, or refused, it says so.
 */
export const TeamShiftPreferences = ({
	companyId,
	departmentId,
	weekStartMonday,
	shownDay,
	className,
}: TeamShiftPreferencesProps): FunctionComponent => {
	const { t } = useTranslation();
	// A page number belongs to one Department's week; another starts again at the first page.
	const list = `${departmentId}|${weekStartMonday}`;
	const [paging, setPaging] = useState({ list, page: 0 });
	const page = paging.list === list ? paging.page : 0;
	const team = useTeamPreferences(companyId, {
		departmentId,
		weekStartMonday,
		page,
	});
	const headingId = useId();
	/** The section, headed, holding `content`. */
	const headed = (content: ReactNode): FunctionComponent => (
		<section aria-labelledby={headingId} className={className}>
			<h2
				className="mb-4 text-base font-semibold text-neutral-900"
				id={headingId}
			>
				{t(`${key}.label`)}
			</h2>
			{content}
		</section>
	);
	if (team.status === "hidden")
		return headed(
			<p className="text-sm text-neutral-800">{t(`${key}.hidden`)}</p>
		);
	if (team.status === "error")
		return headed(
			<p className="text-sm text-error-700" role="alert">
				{t(`${key}.failed`)}
			</p>
		);
	if (team.status !== "ready")
		return headed(<Skeleton className="h-36 w-full rounded-lg" />);
	return headed(
		<>
			<WeekGrid
				emptyState={t(`${key}.empty`)}
				headingLabel={t(`${key}.member`)}
				label={t(`${key}.label`)}
				rows={team.page.content.map((member) =>
					rowOf(member, t("scheduling.detail.formerMember"))
				)}
				shownDay={shownDay}
				weekStartMonday={weekStartMonday}
			/>
			<Pagination
				page={page + 1}
				pageSize={TEAM_PAGE_SIZE}
				total={team.page.page.totalElements}
				onPageChange={(next) => {
					setPaging({ list, page: next - 1 });
				}}
			/>
		</>
	);
};
