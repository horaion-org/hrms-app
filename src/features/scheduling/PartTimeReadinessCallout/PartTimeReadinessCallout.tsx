import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { mondayOf } from "@/common/weeks";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import type { MemberWithoutAvailability } from "@/features/availability/api";
import type { DepartmentPath } from "@/features/scheduling/paths";

export type PartTimeReadinessCalloutProps = {
	/** The Department's part-timers without any availability. */
	members: ReadonlyArray<MemberWithoutAvailability>;
	/** The Department being scheduled, and its Branch: where the links open the team's availability. */
	unit: DepartmentPath;
	/** The schedule's first day, "YYYY-MM-DD"; the links open its week. Without it, this week. */
	periodStart?: string;
	className?: string;
};

/**
 * Warns, before generating, that the Department's part-time members without
 * availability will be left off the roster, each linked to the team's
 * availability for the Department and the schedule's week, where it is
 * added. Generating still goes ahead. Nothing is drawn when there are none.
 */
export const PartTimeReadinessCallout = ({
	members,
	unit,
	periodStart,
	className,
}: PartTimeReadinessCalloutProps): FunctionComponent => {
	const { t } = useTranslation();
	if (members.length === 0) return null;
	const search = {
		view: "team",
		branch: unit.branchId,
		department: unit.departmentId,
		...(periodStart ? { week: mondayOf(periodStart) } : {}),
	} as const;
	return (
		<Callout className={className} tone="warning">
			{t("scheduling.setup.partTimeWithoutAvailability", {
				count: members.length,
			})}
			<ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
				{members.map((member) => (
					<li key={member.membershipId}>
						<Button search={search} to="/availability" variant="textlink">
							{member.displayName}
						</Button>
					</li>
				))}
			</ul>
		</Callout>
	);
};
