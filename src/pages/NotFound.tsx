import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";

/**
 * An address the app doesn't have, inside the app layout so the menu stays
 * in reach, with a plain way back to the dashboard.
 */
export const NotFound = (): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<>
			<h1 className="text-4xl font-medium text-neutral-900">
				{t("shell.notFound.title")}
			</h1>
			<p className="mt-3 max-w-xl text-sm text-neutral-800">
				{t("shell.notFound.explanation")}
			</p>
			<Button className="mt-8" to="/">
				{t("shell.notFound.dashboard")}
			</Button>
		</>
	);
};
