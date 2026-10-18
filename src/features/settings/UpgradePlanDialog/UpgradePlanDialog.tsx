import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

export type UpgradePlanDialogProps = {
	onClose: () => void;
};

/** Placeholder until paid plans and billing are available. */
export const UpgradePlanDialog = ({
	onClose,
}: UpgradePlanDialogProps): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<Dialog
			open
			description={t("settings.upgrade.description")}
			title={t("settings.upgrade.action")}
			footer={
				<div className="flex justify-end">
					<Button onClick={onClose}>{t("settings.upgrade.dismiss")}</Button>
				</div>
			}
			onClose={onClose}
		>
			<div className="rounded-xl border border-ink-blue-200 bg-ink-blue-50 p-5">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<h2 className="text-lg font-semibold text-ink-blue-900">
						{t("settings.upgrade.plan")}
					</h2>
					<Badge>{t("settings.upgrade.comingSoon")}</Badge>
				</div>
				<p className="mt-3 text-sm text-neutral-700">
					{t("settings.upgrade.details")}
				</p>
			</div>
			<p className="mt-5 text-sm text-neutral-700">
				{t("settings.upgrade.unavailable")}
			</p>
		</Dialog>
	);
};
