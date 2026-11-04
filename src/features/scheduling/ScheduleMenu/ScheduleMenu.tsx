import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { OverflowMenu, OverflowMenuItem } from "@/components/ui/OverflowMenu";
import { DeleteScheduleDialog } from "@/features/scheduling/DeleteScheduleDialog";
import type { Schedule } from "@/features/scheduling/schedules/api";
import { departmentScope } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";

export type ScheduleMenuProps = {
	companyId: string;
	schedule: Schedule;
	/** After the schedule is deleted; the list needs nothing, the roster leaves. */
	onDeleted?: () => void;
};

/**
 * A schedule's "More actions" menu: delete it, where `schedule:delete` is
 * held at its Department. With nothing to offer there is no menu.
 */
export const ScheduleMenu = ({
	companyId,
	schedule,
	onDeleted,
}: ScheduleMenuProps): FunctionComponent => {
	const { t } = useTranslation();
	const access = useAccess();
	const [deleting, setDeleting] = useState(false);
	const close = (): void => {
		setDeleting(false);
	};
	if (!access.can("schedule:delete", departmentScope(schedule.departmentId)))
		return null;

	return (
		<>
			<OverflowMenu
				label={t("scheduling.delete.moreActions", { name: schedule.name })}
				variant="icon"
			>
				<OverflowMenuItem
					tone="danger"
					onClick={() => {
						setDeleting(true);
					}}
				>
					{t("scheduling.delete.menu")}
				</OverflowMenuItem>
			</OverflowMenu>
			{deleting && (
				<DeleteScheduleDialog
					companyId={companyId}
					schedule={schedule}
					onClose={close}
					onDeleted={() => {
						close();
						onDeleted?.();
					}}
				/>
			)}
		</>
	);
};
