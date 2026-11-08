import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Callout } from "@/components/ui/Callout";
import { formatDay } from "@/features/scheduling/periods";
import {
	assignmentCell,
	rosterCellText,
} from "@/features/scheduling/rosterChanges/cellText";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";

export type MyRosterChangesProps = {
	/** The roster as the member's own read answers it. */
	assignments: ReadonlyArray<ScheduleAssignment>;
	className?: string;
};

const key = "scheduling.myRoster";

/**
 * On a member's own roster, the days a manager changed after publishing it:
 * each day, what it was, what it is now and the manager's remark. The API
 * sends a change only on the member's own days changed after publication
 * (hrms-backend-v2 docs/adr/0063), so this lists exactly what they were told
 * about. Nothing is shown when no day changed.
 */
export const MyRosterChanges = ({
	assignments,
	className,
}: MyRosterChangesProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const changed = assignments.flatMap((row) =>
		row.lastChange ? [{ row, change: row.lastChange }] : []
	);
	if (changed.length === 0) return null;
	return (
		<Callout className={className}>
			<div className="flex flex-col gap-2">
				<p>{t(`${key}.changesTitle`)}</p>
				<ul className="flex flex-col gap-1 font-normal">
					{changed.map(({ row, change }) => (
						<li key={row.assignmentId}>
							{t(`${key}.changeLine`, {
								day: formatDay(row.day, language),
								before: rosterCellText(change.before, t),
								now: rosterCellText(assignmentCell(row), t),
							})}
							{change.remark && (
								<span className="block">
									{t(`${key}.changeRemark`)} <q>{change.remark}</q>
								</span>
							)}
						</li>
					))}
				</ul>
			</div>
		</Callout>
	);
};
