import { useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { PlusIcon } from "@/components/ui/Icon";
import { Toast } from "@/components/ui/Toast";
import { schedulingNoticeFrom } from "@/features/scheduling/schedulingNotice";
import { Can } from "@/features/workspace/Can";

/**
 * The Scheduling overview; for now it only leads to creating a schedule,
 * offered where the person may create one, and confirms a generation the
 * Create Schedule steps asked for.
 */
export const Scheduling = (): FunctionComponent => {
	const { t } = useTranslation();
	const notice = schedulingNoticeFrom(
		useRouterState({ select: (state) => state.location.state })
	);
	const [dismissed, setDismissed] = useState(false);
	return (
		<>
			<div className="flex flex-wrap items-start justify-between gap-6">
				<h1 className="text-4xl font-medium text-neutral-900">
					{t("shell.navigation.scheduling")}
				</h1>
				<Can at="anywhere" permission="schedule:create">
					<Button leadingIcon={<PlusIcon />} size="sm" to="/scheduling/new">
						{t("scheduling.overview.createSchedule")}
					</Button>
				</Can>
			</div>
			<p className="mt-3 text-sm text-neutral-800">{t("shell.comingSoon")}</p>
			{notice && !dismissed && (
				<Toast
					onDismiss={() => {
						setDismissed(true);
					}}
				>
					{t("scheduling.overview.generated", { name: notice.name })}
				</Toast>
			)}
		</>
	);
};
