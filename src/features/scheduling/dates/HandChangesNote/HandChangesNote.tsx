import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";

/**
 * A line under a week of "What this creates" when the run replaces `count`
 * days of its roster that were changed by hand (`handChangesReplacedIn`);
 * nothing when there are none.
 */
export const HandChangesNote = ({
	count,
}: {
	count: number;
}): FunctionComponent => {
	const { t } = useTranslation();
	if (count === 0) return null;
	return (
		<span className="text-xs text-warning-800">
			{t("scheduling.dates.setup.handChangesReplaced", { count })}
		</span>
	);
};
