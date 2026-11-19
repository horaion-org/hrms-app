import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { DayRun } from "@/features/scheduling/dates/api";
import { dayCountOf } from "@/features/scheduling/dates/datesSetup";
import { formatPeriod } from "@/features/scheduling/periods";
import type { Schedule } from "@/features/scheduling/schedules/api";
import type { Regeneration } from "@/features/scheduling/schedules/regeneration";
import { regenerationRefusal } from "@/features/scheduling/schedules/scheduleRefusal";
import { useScheduleActions } from "@/features/scheduling/schedules/useSchedule";

export type RegenerateScheduleDialogProps = {
	companyId: string;
	schedule: Schedule;
	/** What generating it again does, from `regenerationOf`. */
	regeneration: Regeneration;
	onClose: () => void;
};

const key = "scheduling.regenerate";

/**
 * Asks before one schedule is generated again through its own route (API
 * ADR-0134, ADR-0135). A part of its week names its days, which are worked
 * out again while the current roster stays, and the later parts generated
 * again after them. A withdrawn roster says staff saw it, that every hand
 * change since is replaced and that it must be published again. A refusal
 * shows inside the dialog.
 */
export const RegenerateScheduleDialog = ({
	companyId,
	schedule,
	regeneration,
	onClose,
}: RegenerateScheduleDialogProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const { regenerate } = useScheduleActions(companyId);
	const daysText = (days: DayRun): string =>
		formatPeriod({ start: days.from, end: days.to }, formattingLocale(i18n));
	const { days, laterDays, partOfWeek, oncePublished } = regeneration;
	const partLines = partOfWeek
		? [
				t(`${key}.partDays`, {
					days: daysText(days),
					count: dayCountOf(days.from, days.to),
				}),
				laterDays &&
					t(`${key}.laterPartsAfter`, {
						days: daysText(laterDays),
						count: dayCountOf(laterDays.from, laterDays.to),
					}),
			].filter(Boolean)
		: [];
	return (
		<ConfirmDialog
			cancelLabel={t(`${key}.cancel`)}
			confirmLabel={t(`${key}.confirm`)}
			description={partLines.length > 0 ? partLines.join(" ") : undefined}
			submitting={regenerate.isPending}
			tone={oncePublished ? "danger" : "default"}
			error={
				regenerate.error ? regenerationRefusal(regenerate.error, t) : undefined
			}
			title={t(
				oncePublished ? `${key}.oncePublishedTitle` : `${key}.partTitle`
			)}
			onClose={onClose}
			onConfirm={() => {
				regenerate.mutate(
					{
						unit: {
							branchId: schedule.branchId,
							departmentId: schedule.departmentId,
						},
						scheduleId: schedule.scheduleId,
					},
					{ onSuccess: onClose }
				);
			}}
		>
			{oncePublished && (
				<ul className="mb-6 list-disc space-y-1 pl-5 text-sm">
					<li>{t(`${key}.oncePublishedSeen`)}</li>
					<li>{t(`${key}.oncePublishedReplaced`)}</li>
					<li>{t(`${key}.oncePublishedPublishAgain`)}</li>
				</ul>
			)}
		</ConfirmDialog>
	);
};
