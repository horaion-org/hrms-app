import { useId, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { weekdayOf } from "@/common/weekdays";
import { Button } from "@/components/ui/Button";
import { EditIcon } from "@/components/ui/Icon";
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
	/** The Branch whose members are listed; left out, every Branch in reach. */
	branchId?: string;
	/** The Department whose members are listed; left out, every Department of the Branch. */
	departmentId?: string;
	/** The week shown, as its Monday. */
	weekStartMonday: string;
	/** The one day shown below `md`, as the page's `DaySwitcher` picks it. */
	shownDay?: string;
	/** Whether the person may change this member's preferences, as the workspace says. */
	canEdit: (member: TeamMemberWeek) => boolean;
	/** Opens the editor on the member's week. */
	onEdit: (member: TeamMemberWeek) => void;
	className?: string;
};

const key = "shiftPreferences.team";

/** One member's row: their name (`formerMember` once removed), each day's preferred shifts as chips, and `action`. */
const rowOf = (
	member: TeamMemberWeek,
	formerMember: string,
	action: ReactNode
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
	action,
});

/**
 * The members of a Branch, or of one Department of it, and their preferred
 * shifts for a week, a page at a time, under its own heading. Whether the person may read them
 * is the hook's call alone: held nowhere, or refused, it says so. Editing is
 * offered only on the rows the person may change; the API still checks every change.
 */
export const TeamShiftPreferences = ({
	companyId,
	branchId,
	departmentId,
	weekStartMonday,
	shownDay,
	canEdit,
	onEdit,
	className,
}: TeamShiftPreferencesProps): FunctionComponent => {
	const { t } = useTranslation();
	// A page number belongs to one list's week; another unit or week starts again at the first page.
	const list = `${branchId ?? ""}|${departmentId ?? ""}|${weekStartMonday}`;
	const [paging, setPaging] = useState({ list, page: 0 });
	const page = paging.list === list ? paging.page : 0;
	const team = useTeamPreferences(companyId, {
		weekStartMonday,
		...(branchId ? { branchId } : {}),
		...(departmentId ? { departmentId } : {}),
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
	const rows = team.page.content.map((member) =>
		rowOf(
			member,
			t("scheduling.detail.formerMember"),
			canEdit(member) && (
				<Button
					aria-label={t(`${key}.editFor`, { name: member.displayName })}
					variant="icon"
					onClick={() => {
						onEdit(member);
					}}
				>
					<EditIcon />
				</Button>
			)
		)
	);
	return headed(
		<>
			<WeekGrid
				actionsLabel={t(`${key}.actions`)}
				emptyState={t(`${key}.empty`)}
				headingLabel={t(`${key}.member`)}
				label={t(`${key}.label`)}
				rows={rows}
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
