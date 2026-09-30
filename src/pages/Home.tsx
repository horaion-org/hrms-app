import { useRouteContext } from "@tanstack/react-router";
import { useState } from "react";
import { CompanySelection } from "@/pages/CompanySelection";
import { usableCompanies } from "@/features/auth/currentCompany";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { logOut } from "@/features/auth/session";

export const Home = (): FunctionComponent => {
	const context = useRouteContext({ from: "/_authenticated" });
	const [switching, setSwitching] = useState(false);
	const { t } = useTranslation();
	if (
		!("currentUser" in context) ||
		!context.currentUser ||
		context.currentCompany.kind !== "settled"
	)
		return null;
	if (switching)
		return (
			<CompanySelection
				forceChoose
				onChosen={() => {
					setSwitching(false);
				}}
			/>
		);
	return (
		<div className="flex min-h-dvh flex-col sm:flex-row">
			<Sidebar
				className="min-h-0 w-full sm:min-h-dvh sm:w-70"
				footer={
					<Button className="w-full" onClick={logOut}>
						{t("auth.logOut")}
					</Button>
				}
			>
				{null}
			</Sidebar>
			<main className="min-w-0 flex-1 p-7">
				<h1 className="text-3xl font-medium text-ink-blue-900">
					{t("auth.welcome", { name: context.currentUser.displayName })}
				</h1>
				<p className="mt-6 text-sm text-neutral-700">
					{t("auth.company.current")}
				</p>
				<h2 className="mt-2 text-2xl font-medium text-ink-blue-900">
					{context.currentCompany.company.companyName}
				</h2>
				{usableCompanies(context.currentUser).length > 1 && (
					<Button
						className="mt-6"
						variant="secondary"
						onClick={() => {
							setSwitching(true);
						}}
					>
						{t("auth.company.switch")}
					</Button>
				)}
			</main>
		</div>
	);
};
