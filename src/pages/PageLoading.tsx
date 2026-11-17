import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";

/** How long a page may load before it says it is taking longer than usual. */
export const SLOW_LOADING_AFTER_MS = 3_000;

/**
 * What a page shows while its route still loads: the app's plain loading
 * line and, after `SLOW_LOADING_AFTER_MS`, one line saying it is slow and
 * the likely reason, without claiming a cause it cannot know.
 */
export const PageLoading = (): FunctionComponent => {
	const { t } = useTranslation();
	const [slow, setSlow] = useState(false);
	useEffect(() => {
		const timer = setTimeout(() => {
			setSlow(true);
		}, SLOW_LOADING_AFTER_MS);
		return (): void => {
			clearTimeout(timer);
		};
	}, []);
	return (
		<div role="status">
			<p className="text-sm text-neutral-700">{t("shell.loading")}</p>
			{slow && (
				<p className="mt-2 text-sm text-neutral-700">
					{t("shell.loadingSlow")}
				</p>
			)}
		</div>
	);
};
