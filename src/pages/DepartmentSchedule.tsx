import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";

/** One Department's schedules on one timeline; only the heading for now. */
export const DepartmentSchedulePage = (): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<div className="mt-4 flex flex-col gap-6">
			<h1 className="text-4xl font-medium text-neutral-900">
				{t("scheduling.timeline.title")}
			</h1>
		</div>
	);
};
