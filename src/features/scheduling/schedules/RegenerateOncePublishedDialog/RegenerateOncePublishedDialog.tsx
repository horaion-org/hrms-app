import { useTranslation } from "react-i18next";
import type { DepartmentPath } from "@/common/companyPath";
import type { FunctionComponent } from "@/common/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { regenerationRefusal } from "@/features/scheduling/schedules/scheduleRefusal";
import { useScheduleActions } from "@/features/scheduling/schedules/useSchedule";

export type RegenerateOncePublishedDialogProps = {
	companyId: string;
	/** The roster's department, whose route generates it again. */
	unit: DepartmentPath;
	scheduleId: string;
	onClose: () => void;
};

const key = "scheduling.regenerate";

/**
 * Asks before a roster whose publication was withdrawn is generated again
 * through its own route (API ADR-0134): staff saw it, every shift may change
 * and every hand change since is replaced, and the new roster must be
 * published again. A refusal shows inside the dialog.
 */
export const RegenerateOncePublishedDialog = ({
	companyId,
	unit,
	scheduleId,
	onClose,
}: RegenerateOncePublishedDialogProps): FunctionComponent => {
	const { t } = useTranslation();
	const { regenerate } = useScheduleActions(companyId);
	return (
		<ConfirmDialog
			cancelLabel={t(`${key}.cancel`)}
			confirmLabel={t(`${key}.oncePublishedConfirm`)}
			submitting={regenerate.isPending}
			title={t(`${key}.oncePublishedTitle`)}
			tone="danger"
			error={
				regenerate.error ? regenerationRefusal(regenerate.error, t) : undefined
			}
			onClose={onClose}
			onConfirm={() => {
				regenerate.mutate({ unit, scheduleId }, { onSuccess: onClose });
			}}
		>
			<ul className="mb-6 list-disc space-y-1 pl-5 text-sm">
				<li>{t(`${key}.oncePublishedSeen`)}</li>
				<li>{t(`${key}.oncePublishedReplaced`)}</li>
				<li>{t(`${key}.oncePublishedPublishAgain`)}</li>
			</ul>
		</ConfirmDialog>
	);
};
