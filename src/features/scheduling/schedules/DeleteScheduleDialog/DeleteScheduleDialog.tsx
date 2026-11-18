import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { DayRun } from "@/features/scheduling/dates/api";
import { dayCountOf } from "@/features/scheduling/dates/datesSetup";
import type { WeekPart } from "@/features/scheduling/months/api";
import { formatPeriod } from "@/features/scheduling/periods";
import {
	generationInProgress,
	type Schedule,
} from "@/features/scheduling/schedules/api";
import { deleteLeavesOf } from "@/features/scheduling/schedules/partLines";
import { deleteRefusal } from "@/features/scheduling/schedules/scheduleRefusal";
import { useScheduleActions } from "@/features/scheduling/schedules/useSchedule";

export type DeleteScheduleDialogProps = {
	companyId: string;
	schedule: Schedule;
	onClose: () => void;
	/** After the schedule is gone, e.g. to leave its roster. */
	onDeleted: () => void;
	/** The week's parts, this one included, where the caller has read them: the dialog says what deleting leaves. */
	weekParts?: ReadonlyArray<WeekPart>;
};

const key = "scheduling.delete";

/**
 * Asks before deleting a schedule, naming its department and the days it covers. While the
 * schedule is being generated it explains why it can't be deleted yet and
 * holds confirming back; a refusal shows inside the dialog.
 */
export const DeleteScheduleDialog = ({
	companyId,
	schedule,
	onClose,
	onDeleted,
	weekParts = [],
}: DeleteScheduleDialogProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const daysText = (days: DayRun): string =>
		formatPeriod({ start: days.from, end: days.to }, language);
	const leaves = deleteLeavesOf(
		schedule.scheduleId,
		{ from: schedule.coveredFrom, to: schedule.coveredTo },
		weekParts
	);
	const leavesLines = [
		leaves.daysWithoutRoster &&
			t(`${key}.leavesNoRoster`, { days: daysText(leaves.daysWithoutRoster) }),
		leaves.daysWithoutRoster &&
			leaves.laterDays &&
			t(`${key}.laterWorkedOut`, {
				later: daysText(leaves.laterDays),
				days: daysText(leaves.daysWithoutRoster),
				count: dayCountOf(leaves.laterDays.from, leaves.laterDays.to),
			}),
	].filter(Boolean);
	const { remove } = useScheduleActions(companyId);
	const running = generationInProgress(schedule);
	// The days this schedule holds: a part of a week names only its own days.
	const period = daysText({
		from: schedule.coveredFrom,
		to: schedule.coveredTo,
	});
	return (
		<ConfirmDialog
			cancelLabel={t(running ? `${key}.close` : `${key}.cancel`)}
			confirmDisabled={running}
			confirmLabel={t(`${key}.confirm`)}
			error={remove.error ? deleteRefusal(remove.error, t) : undefined}
			submitting={remove.isPending}
			tone="danger"
			description={
				running
					? t(`${key}.runOpen`)
					: [
							t(`${key}.description`, {
								department: schedule.departmentName,
								period,
							}),
							...leavesLines,
						].join(" ")
			}
			title={t(`${key}.title`, {
				department: schedule.departmentName,
				period,
			})}
			onClose={onClose}
			onConfirm={() => {
				remove.mutate(
					{
						unit: {
							branchId: schedule.branchId,
							departmentId: schedule.departmentId,
						},
						scheduleId: schedule.scheduleId,
					},
					{ onSuccess: onDeleted }
				);
			}}
		/>
	);
};
