import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { OverflowMenu, OverflowMenuItem } from "@/components/ui/OverflowMenu";
import { mayPutBack } from "@/features/scheduling/history/putBack";
import { PutBackDialog } from "@/features/scheduling/history/PutBackDialog";
import type { DeletedSchedule } from "@/features/scheduling/schedules/deletedSchedules";
import { useAccess } from "@/features/workspace/useAccess";

export type PutBackActionProps = {
	companyId: string;
	schedule: DeletedSchedule;
	/** A button on the record's page; a one-item menu on a History row, where a live row has its menu. */
	shownAs: "button" | "menu";
};

const key = "scheduling.history.putBack";

/**
 * "Put back on the roster" for a deleted schedule, with its confirmation.
 * Nothing at all where it may not be put back (`mayPutBack`): a roster a run
 * replaced, one with no roster, or a reader without `schedule:delete` at its
 * Department.
 */
export const PutBackAction = ({
	companyId,
	schedule,
	shownAs,
}: PutBackActionProps): FunctionComponent => {
	const { t } = useTranslation();
	const access = useAccess();
	const [asking, setAsking] = useState(false);
	if (!mayPutBack(schedule, access)) return null;
	const ask = (): void => {
		setAsking(true);
	};
	return (
		<>
			{shownAs === "button" ? (
				<Button variant="secondary" onClick={ask}>
					{t(`${key}.action`)}
				</Button>
			) : (
				<OverflowMenu
					label={t("scheduling.scheduleMenu.label", { name: schedule.name })}
					variant="icon"
				>
					<OverflowMenuItem onClick={ask}>
						{t(`${key}.action`)}
					</OverflowMenuItem>
				</OverflowMenu>
			)}
			{asking && (
				<PutBackDialog
					companyId={companyId}
					schedule={schedule}
					onClose={() => {
						setAsking(false);
					}}
				/>
			)}
		</>
	);
};
