import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";

/**
 * What a page shows while its route still loads, e.g. while a read waits
 * out an access update after a recent change: the app's plain loading line.
 */
export const PageLoading = (): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<p className="text-sm text-neutral-700" role="status">
			{t("shell.loading")}
		</p>
	);
};
