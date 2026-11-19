import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { mondayOf } from "@/common/weeks";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { DayRun } from "@/features/scheduling/dates/api";
import { usePutBack } from "@/features/scheduling/history/putBack";
import {
	dayRunsText,
	putBackBlockFrom,
	putBackRefusal,
	type PutBackBlock,
} from "@/features/scheduling/history/putBackRefusal";
import type { DeletedSchedule } from "@/features/scheduling/schedules/deletedSchedules";

export type PutBackDialogProps = {
	companyId: string;
	/** The deleted schedule to put back. */
	schedule: DeletedSchedule;
	onClose: () => void;
};

const key = "scheduling.history.putBack";

/** The rosters to review that putting back would delete, once the API said so. */
type ReplaceWarning = Extract<PutBackBlock, { kind: "replace" }>;

/**
 * Asks before a deleted roster goes back on the roster page: its days, that
 * it comes back unpublished, that staff saw it when it was once published,
 * and that a roster to review may need sending for approval again.
 *
 * When a roster to review is on its days, the API refuses the first ask and
 * the same dialog turns into a warning, in the danger tone: that roster will
 * be deleted (it goes to History), and any day only it covered is left with
 * no roster. Confirming the warning asks again with the flag. Any other
 * refusal shows inside the dialog. Once put back, the dialog closes and the
 * Department's roster page opens on the week of the roster's first day.
 */
export const PutBackDialog = ({
	companyId,
	schedule,
	onClose,
}: PutBackDialogProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const navigate = useNavigate();
	const putBack = usePutBack(companyId);
	const [warning, setWarning] = useState<ReplaceWarning>();
	const own: DayRun = { from: schedule.coveredFrom, to: schedule.coveredTo };
	const send = (): void => {
		putBack.mutate(
			{
				unit: {
					branchId: schedule.branchId,
					departmentId: schedule.departmentId,
				},
				scheduleId: schedule.scheduleId,
				replaceRostersInTheWay: warning !== undefined,
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
				// A roster to review in the way turns the dialog into its warning; anything else is said as an error.
				onError: (error) => {
					const block = putBackBlockFrom(error, own);
					setWarning(block?.kind === "replace" ? block : undefined);
				},
			}
		);
	};
	const notes = [
		schedule.wasPublished && t(`${key}.seen`),
		// A rejected roster was decided, so it was not waiting for approval.
		schedule.status === "GENERATED" && t(`${key}.approval`),
	].filter((note) => typeof note === "string");
	if (warning)
		return (
			<ConfirmDialog
				cancelLabel={t(`${key}.cancel`)}
				confirmLabel={t(`${key}.replaceConfirm`)}
				submitting={putBack.isPending}
				title={t(`${key}.replaceTitle`)}
				tone="danger"
				description={[
					t(`${key}.replaceBody`, {
						days: dayRunsText(warning.days, language),
					}),
					warning.extraDays.length > 0 &&
						t(`${key}.replaceExtraDays`, {
							extraDays: dayRunsText(warning.extraDays, language),
						}),
				]
					.filter(Boolean)
					.join(" ")}
				onClose={onClose}
				onConfirm={send}
			/>
		);
	return (
		<ConfirmDialog
			cancelLabel={t(`${key}.cancel`)}
			confirmLabel={t(`${key}.confirm`)}
			submitting={putBack.isPending}
			title={t(`${key}.title`)}
			description={t(`${key}.body`, {
				days: dayRunsText([own], language),
			})}
			error={
				putBack.error
					? putBackRefusal(putBack.error, own, t, language)
					: undefined
			}
			onClose={onClose}
			onConfirm={send}
		>
			{notes.length > 0 && (
				<ul className="mb-6 list-disc space-y-1 pl-5 text-sm">
					{notes.map((note) => (
						<li key={note}>{note}</li>
					))}
				</ul>
			)}
		</ConfirmDialog>
	);
};
