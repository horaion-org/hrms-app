import type { TFunction } from "i18next";
import { type ReactNode, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Textarea } from "@/components/forms/Textarea";
import { Callout } from "@/components/ui/Callout";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { APPROVAL_COMMENT_MAX_LENGTH } from "@/features/approvals/api";
import { approvalDecisionRefusal } from "@/features/approvals/approvalRefusal";
import { stepSummary } from "@/features/approvals/approvalStanding";
import { useApprovalDecisionActions } from "@/features/approvals/useApprovalActions";
import type { PublishMode } from "@/features/scheduling/schedules/PublishScheduleDialog/publishMode";
import type { DayRun } from "@/features/scheduling/dates/api";
import { dayCountOfRuns } from "@/features/scheduling/dates/datesSetup";
import { formatPeriod } from "@/features/scheduling/periods";
import type { Schedule } from "@/features/scheduling/schedules/api";
import { coversPartOfWeek } from "@/features/scheduling/schedules/partLines";
import { decisionRefusal } from "@/features/scheduling/schedules/scheduleRefusal";
import {
	useReloadScheduling,
	useScheduleActions,
} from "@/features/scheduling/schedules/useSchedule";

export type PublishScheduleDialogProps = {
	companyId: string;
	/** A GENERATED schedule with no run open. */
	schedule: Schedule;
	/** Publish in one step when left out. */
	mode?: PublishMode;
	onClose: () => void;
	/** Called after a submission or an approval, with the sentence the page announces. */
	onDone?: (announcement: string) => void;
	/** Shifts still short on the roster: above zero, a warning says so; it never blocks the decision. */
	shortShifts?: number;
	/** Days before this part with no schedule (`daysLeftBeforeOf`): a warning says publishing leaves them unschedulable. */
	daysLeftBefore?: ReadonlyArray<DayRun>;
	/** Holds confirming back, e.g. while a check runs or because it found what must be fixed first. */
	confirmDisabled?: boolean;
	/** What a check made before publishing says, shown above the dialog's own warnings. */
	checkNote?: ReactNode;
};

const key = "scheduling.decision";

/** The dialog's copy for each mode. */
const copyOf = (
	mode: PublishMode,
	department: string,
	partDays: string | undefined,
	t: TFunction
): {
	title: string;
	description: string;
	confirm: string;
	announcement?: string;
} => {
	switch (mode.kind) {
		case "publish":
			return {
				title: t(`${key}.publishTitle`),
				description: partDays
					? t(`${key}.publishPartDescription`, { days: partDays })
					: t(`${key}.publishDescription`),
				confirm: t(`${key}.publishConfirm`),
			};
		case "submit":
			return {
				title: t("approvals.submitDialog.title"),
				description: t("approvals.submitDialog.description", {
					steps: stepSummary(mode.stepLabels),
				}),
				confirm: t("approvals.submitDialog.confirm"),
				announcement: t("approvals.announce.submitted", {
					label: mode.stepLabels[0] ?? "",
					total: mode.stepLabels.length,
				}),
			};
		case "approve":
			return mode.step.isLast
				? {
						title: t("approvals.approveDialog.lastTitle", { department }),
						description: t("approvals.approveDialog.lastDescription"),
						// The last step's button says what happens: the roster is published (addendum C4).
						confirm: t("approvals.approveDialog.lastConfirm"),
						announcement: t("approvals.announce.published", { department }),
					}
				: {
						title: t("approvals.approveDialog.title", { department }),
						description: t("approvals.approveDialog.description", {
							step: mode.step.order,
							total: mode.step.count,
							next: mode.nextLabel ?? "",
							nextStep: mode.step.order + 1,
						}),
						confirm: t("approvals.approveDialog.confirm"),
						announcement: t("approvals.announce.approved", {
							label: mode.step.label,
							next: mode.nextLabel ?? "",
							step: mode.step.order + 1,
						}),
					};
	}
};

/**
 * Asks before a roster goes forward. Without a flow it publishes, saying
 * that it becomes final for its week (a part: for its own days). Where a flow applies it submits the
 * roster, naming the steps it goes through. On a submission's open step it
 * approves, with an optional comment: "Approve" on a middle step, "Approve
 * and publish" on the last. A refusal shows inside the dialog.
 */
export const PublishScheduleDialog = ({
	companyId,
	schedule,
	mode = { kind: "publish" },
	onClose,
	onDone,
	shortShifts = 0,
	daysLeftBefore = [],
	confirmDisabled = false,
	checkNote,
}: PublishScheduleDialogProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const daysLeftText = new Intl.ListFormat(language, {
		type: "conjunction",
	}).format(
		daysLeftBefore.map((days) =>
			formatPeriod({ start: days.from, end: days.to }, language)
		)
	);
	const id = useId();
	const [comment, setComment] = useState("");
	const { publish, submit } = useScheduleActions(companyId);
	const { approve } = useApprovalDecisionActions(
		companyId,
		useReloadScheduling(companyId)
	);
	// A part of a week becomes final for its own days, not the whole week.
	const partDays = coversPartOfWeek(schedule)
		? formatPeriod(
				{ start: schedule.coveredFrom, end: schedule.coveredTo },
				language
			)
		: undefined;
	const copy = copyOf(mode, schedule.departmentName, partDays, t);
	const done = (): void => {
		if (copy.announcement) onDone?.(copy.announcement);
		onClose();
	};
	const unit = {
		branchId: schedule.branchId,
		departmentId: schedule.departmentId,
	};
	const scheduleMutation = mode.kind === "submit" ? submit : publish;
	const approving = mode.kind === "approve";
	const approveRefusal = approve.error
		? approvalDecisionRefusal(approve.error, t)
		: undefined;
	const commentError = approveRefusal?.fields.comment;
	const error = approving
		? approveRefusal && !commentError
			? (approveRefusal.message ?? t("approvals.refusal.failed"))
			: undefined
		: scheduleMutation.error
			? (decisionRefusal(scheduleMutation.error, t).message ??
				t(`${key}.refusal.failed`))
			: undefined;
	return (
		<ConfirmDialog
			cancelLabel={t(`${key}.cancel`)}
			confirmDisabled={confirmDisabled}
			confirmLabel={copy.confirm}
			description={copy.description}
			error={error}
			submitting={approving ? approve.isPending : scheduleMutation.isPending}
			title={copy.title}
			onClose={onClose}
			onConfirm={() => {
				if (mode.kind === "approve") {
					approve.mutate(
						{
							instanceId: mode.instanceId,
							stepOrder: mode.step.order,
							comment,
						},
						{ onSuccess: done }
					);
					return;
				}
				scheduleMutation.mutate(
					{ unit, scheduleId: schedule.scheduleId },
					{ onSuccess: done }
				);
			}}
		>
			{checkNote}
			{daysLeftBefore.length > 0 && (
				<Callout className="mb-6" tone="warning">
					{t(`${key}.daysLeftBefore`, {
						days: daysLeftText,
						count: dayCountOfRuns(daysLeftBefore),
					})}
				</Callout>
			)}
			{shortShifts > 0 && (
				<Callout className="mb-6" tone="warning">
					{t(`${key}.shortShifts`, { count: shortShifts })}
				</Callout>
			)}
			{approving && (
				<>
					<label
						className="mb-3 block text-sm font-medium text-neutral-800"
						htmlFor={`${id}-comment`}
					>
						{t("approvals.approveDialog.comment")}
					</label>
					<Textarea
						autoFocus
						aria-describedby={commentError ? `${id}-error` : undefined}
						id={`${id}-comment`}
						maxLength={APPROVAL_COMMENT_MAX_LENGTH}
						placeholder={t("approvals.approveDialog.note")}
						status={commentError ? "error" : undefined}
						value={comment}
						onChange={(event) => {
							setComment(event.target.value);
						}}
					/>
					{commentError && (
						<p
							className="mt-2 text-sm text-error-700"
							id={`${id}-error`}
							role="alert"
						>
							{commentError}
						</p>
					)}
				</>
			)}
		</ConfirmDialog>
	);
};
