import { useRouteContext } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";

/** The Dashboard Module; for now it names the company the person is working in. */
export const Home = (): FunctionComponent => {
	const context = useRouteContext({ from: "/_authenticated" });
	const { t } = useTranslation();
	if (
		!("currentCompany" in context) ||
		context.currentCompany.kind !== "settled"
	)
		return null;
	return (
		<>
			<h1 className="text-4xl font-medium text-neutral-900">
				{t("shell.navigation.dashboard")}
			</h1>
			<p className="mt-6 text-sm text-neutral-700">
				{t("auth.company.current")}
			</p>
			<h2 className="mt-2 text-2xl font-medium text-ink-blue-900">
				{context.currentCompany.company.companyName}
			</h2>
		</>
	);
};
