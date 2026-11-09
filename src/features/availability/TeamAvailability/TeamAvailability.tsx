import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EditIcon } from "@/components/ui/Icon";
import type { MemberWeek } from "@/features/availability/api";
import { windowsByDay } from "@/features/availability/availabilityModel";
import {
	WeekGrid,
	type WeekGridRowData,
} from "@/features/availability/WeekGrid";

export type TeamAvailabilityProps = {
	/** The Branch's part-timers for the week, as the API listed them. */
	members: Array<MemberWeek>;
	/** The week shown, as its Monday. */
	weekStartMonday: string;
	/** The one day shown below `md`, as the page's `DaySwitcher` picks it. */
	shownDay?: string;
	/** Names each member's Department, for a list not narrowed to one. */
	showDepartment: boolean;
	/** Whether the person may change this member's availability, as the workspace says. */
	canEdit: (member: MemberWeek) => boolean;
	/** Opens the editor on the member's week. */
	onEdit: (member: MemberWeek) => void;
};

const key = "availability.team";

/** A member's row heading: who, their Department when asked for, and "Custom" for a week with hours of its own. */
const MemberHeading = ({
	member,
	showDepartment,
}: {
	member: MemberWeek;
	showDepartment: boolean;
}): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<span className="flex items-center gap-3">
			{/* On a phone the row header drops the avatar, as the roster's does. */}
			<Avatar
				className="size-10! text-base! max-sm:hidden"
				name={member.displayName}
			/>
			<span className="min-w-0">
				<span className="block truncate text-xs font-semibold">
					{member.displayName}
				</span>
				{showDepartment && (
					<span className="mt-0.5 block truncate text-[0.625rem]">
						{member.departmentName ?? "—"}
					</span>
				)}
				{member.source === "OVERRIDE" && (
					<Badge className="mt-1 px-2! text-[0.625rem]! leading-4!">
						{t("availability.custom")}
					</Badge>
				)}
			</span>
		</span>
	);
};

/**
 * A Branch's part-timers for one week, as the roster lays out a week: a
 * row per member, their windows under each day, and "Custom" when the week
 * has hours of its own in place of their pattern. Editing is offered only
 * on the rows the person may change; the API still checks every change.
 */
export const TeamAvailability = ({
	members,
	weekStartMonday,
	shownDay,
	showDepartment,
	canEdit,
	onEdit,
}: TeamAvailabilityProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const rows: Array<WeekGridRowData> = [...members]
		.sort((a, b) => a.displayName.localeCompare(b.displayName, i18n.language))
		.map((member) => ({
			id: member.membershipId,
			days: windowsByDay(member.windows),
			heading: (
				<MemberHeading member={member} showDepartment={showDepartment} />
			),
			action: canEdit(member) && (
				<Button
					aria-label={t(`${key}.editFor`, { name: member.displayName })}
					variant="icon"
					onClick={() => {
						onEdit(member);
					}}
				>
					<EditIcon />
				</Button>
			),
		}));
	return (
		<WeekGrid
			actionsLabel={t(`${key}.actions`)}
			emptyState={t(`${key}.empty`)}
			headingLabel={t(`${key}.member`)}
			label={t(`${key}.label`)}
			rows={rows}
			shownDay={shownDay}
			weekStartMonday={weekStartMonday}
		/>
	);
};
