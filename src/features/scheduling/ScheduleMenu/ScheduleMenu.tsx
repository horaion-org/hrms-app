import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiProblemError } from "@/common/problem";
import { saveFile } from "@/common/saveFile";
import type { FunctionComponent } from "@/common/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { OverflowMenu, OverflowMenuItem } from "@/components/ui/OverflowMenu";
import { DeleteScheduleDialog } from "@/features/scheduling/DeleteScheduleDialog";
import {
	exportRoster,
	hasRoster,
	type Schedule,
} from "@/features/scheduling/schedules/api";
import { departmentScope } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";

export type ScheduleMenuProps = {
	companyId: string;
	schedule: Schedule;
	/** Offers "Export roster" for a generated schedule; the roster header does, the history list does not. */
	withExport?: boolean;
	/** After the schedule is deleted; the list needs nothing, the roster leaves. */
	onDeleted?: () => void;
};

/**
 * A schedule's "More actions" menu: export its generated roster as a
 * spreadsheet (where asked for and `schedule:read` is held at its
 * Department) and delete it (where `schedule:delete` is). With nothing to
 * offer there is no menu.
 */
export const ScheduleMenu = ({
	companyId,
	schedule,
	withExport = false,
	onDeleted,
}: ScheduleMenuProps): FunctionComponent => {
	const { t } = useTranslation();
	const access = useAccess();
	const [deleting, setDeleting] = useState(false);
	const rosterExport = useMutation({
		mutationFn: () =>
			exportRoster(
				companyId,
				{ branchId: schedule.branchId, departmentId: schedule.departmentId },
				schedule.scheduleId
			),
		onSuccess: ({ blob, fileName }) => {
			saveFile(blob, fileName);
		},
		meta: { successMessage: "scheduling.export.done" },
	});
	const closeDeleteDialog = (): void => {
		setDeleting(false);
	};
	const scope = departmentScope(schedule.departmentId);
	const canDelete = access.can("schedule:delete", scope);
	const canExport =
		withExport && hasRoster(schedule) && access.can("schedule:read", scope);
	if (!canDelete && !canExport) return null;
	// A schedule with no roster yet can't be exported, so trying again can't help.
	const exportRefusedAsDraft =
		rosterExport.error instanceof ApiProblemError &&
		rosterExport.error.errorCode === "SCHEDULE_IS_DRAFT";

	return (
		<>
			<OverflowMenu
				label={t("scheduling.scheduleMenu.label", { name: schedule.name })}
				variant="icon"
			>
				{canExport && (
					<OverflowMenuItem
						disabled={rosterExport.isPending}
						onClick={() => {
							rosterExport.mutate();
						}}
					>
						{t("scheduling.export.menu")}
					</OverflowMenuItem>
				)}
				{canDelete && (
					<OverflowMenuItem
						tone="danger"
						onClick={() => {
							setDeleting(true);
						}}
					>
						{t("scheduling.delete.menu")}
					</OverflowMenuItem>
				)}
			</OverflowMenu>
			{rosterExport.isError && (
				<ConfirmDialog
					cancelLabel={t("scheduling.export.close")}
					confirmDisabled={exportRefusedAsDraft}
					confirmLabel={t("scheduling.export.retry")}
					title={t("scheduling.export.failedTitle")}
					description={
						exportRefusedAsDraft
							? t("scheduling.export.draft")
							: t("scheduling.export.failed")
					}
					onClose={() => {
						rosterExport.reset();
					}}
					onConfirm={() => {
						rosterExport.mutate();
					}}
				/>
			)}
			{deleting && (
				<DeleteScheduleDialog
					companyId={companyId}
					schedule={schedule}
					onClose={closeDeleteDialog}
					onDeleted={() => {
						closeDeleteDialog();
						onDeleted?.();
					}}
				/>
			)}
		</>
	);
};
