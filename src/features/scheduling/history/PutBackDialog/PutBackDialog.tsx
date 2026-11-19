import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { mondayOf } from "@/common/weeks";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { usePutBack } from "@/features/scheduling/history/putBack";
import { putBackRefusal } from "@/features/scheduling/history/putBackRefusal";
import { formatPeriod } from "@/features/scheduling/periods";
import type { DeletedSchedule } from "@/features/scheduling/schedules/deletedSchedules";

export type PutBackDialogProps = {
	companyId: string;
	/** The deleted schedule to put back. */
	schedule: DeletedSchedule;
	onClose: () => void;
};

const key = "scheduling.history.putBack";

/**
 * Asks before a deleted roster goes back on the roster page: its days, that
 * it comes back unpublished, that staff saw it when it was once published,
 * and that a roster to review may need sending for approval again. A refusal
 * shows inside the dialog. Once put back, the dialog closes and the
 * Department's roster page opens on the week of the roster's first day.
 */
export const PutBackDialog = ({
	companyId,
	schedule,
	onClose,
}: PutBackDialogProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const navigate = useNavigate();
	const putBack = usePutBack(companyId);
	return (
		<ConfirmDialog
			cancelLabel={t(`${key}.cancel`)}
			confirmLabel={t(`${key}.confirm`)}
			error={putBack.error ? putBackRefusal(putBack.error, t) : undefined}
			submitting={putBack.isPending}
			title={t(`${key}.title`)}
			description={t(`${key}.body`, {
				days: formatPeriod(
					{ start: schedule.coveredFrom, end: schedule.coveredTo },
					formattingLocale(i18n)
				),
			})}
			onClose={onClose}
			onConfirm={() => {
				putBack.mutate(
					{
						unit: {
							branchId: schedule.branchId,
							departmentId: schedule.departmentId,
						},
						scheduleId: schedule.scheduleId,
					},
					{
						onSuccess: () => {
							onClose();
							// The Department's roster page, as `departmentTimelineLink` names it; this area may not import `timeline/`.
							void navigate({
								to: "/scheduling/department",
								search: {
									department: schedule.departmentId,
									from: mondayOf(schedule.coveredFrom),
								},
							});
						},
					}
				);
			}}
		>
			<ul className="mb-6 list-disc space-y-1 pl-5 text-sm">
				{schedule.wasPublished && <li>{t(`${key}.seen`)}</li>}
				{/* A rejected roster was decided, so it was not waiting for approval. */}
				{schedule.status === "GENERATED" && <li>{t(`${key}.approval`)}</li>}
			</ul>
		</ConfirmDialog>
	);
};
