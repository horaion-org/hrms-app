import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { PlusIcon } from "@/components/ui/Icon";

/** The Scheduling overview; for now it only leads to creating a schedule. */
export const Scheduling = (): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<>
			<div className="flex flex-wrap items-start justify-between gap-6">
				<h1 className="text-4xl font-medium text-neutral-900">
					{t("shell.navigation.scheduling")}
				</h1>
				<Button leadingIcon={<PlusIcon />} size="sm" to="/scheduling/new">
					{t("scheduling.overview.createSchedule")}
				</Button>
			</div>
			<p className="mt-3 text-sm text-neutral-800">{t("shell.comingSoon")}</p>
		</>
	);
};
