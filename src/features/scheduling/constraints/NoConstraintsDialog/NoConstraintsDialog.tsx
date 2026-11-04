import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export type NoConstraintsDialogProps = {
	/** How many constraints the department has, ticked or not. */
	constraintCount: number;
	/** Goes on to the next step without any constraint. */
	onConfirm: () => void;
	/** Stays on the Constraints step. */
	onClose: () => void;
};

const key = "scheduling.constraints.unticked";

/**
 * Asks before leaving the Constraints step with nothing ticked: says whether
 * the department has no constraints or has some that are not ticked, and
 * what generating without them means. A warning only; confirming goes on.
 */
export const NoConstraintsDialog = ({
	constraintCount,
	onConfirm,
	onClose,
}: NoConstraintsDialogProps): FunctionComponent => {
	const { t } = useTranslation();
	const situation =
		constraintCount === 0
			? t(`${key}.none`)
			: t(`${key}.noneTicked`, { count: constraintCount });
	return (
		<ConfirmDialog
			cancelLabel={t(`${key}.cancel`)}
			confirmLabel={t(`${key}.confirm`)}
			description={`${situation} ${t(`${key}.consequence`)}`}
			title={t(`${key}.title`)}
			onClose={onClose}
			onConfirm={onConfirm}
		/>
	);
};
