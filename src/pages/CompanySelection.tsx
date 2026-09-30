import { Outlet, useRouteContext, useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";
import { CompanyPicker } from "@/features/auth/CompanyPicker";
import { usableCompanies } from "@/features/auth/currentCompany";
import { logOut } from "@/features/auth/session";
import { NoCompanyAccess } from "@/pages/NoCompanyAccess";

export const CompanySelection = ({
	forceChoose = false,
	onChosen,
}: {
	forceChoose?: boolean;
	onChosen?: () => void;
}): FunctionComponent => {
	const context = useRouteContext({ from: "/_authenticated" });
	const router = useRouter();
	const { t } = useTranslation();
	if (!("currentCompany" in context)) return null;
	const result = context.currentCompany;
	switch (result.kind) {
		case "none":
			return <NoCompanyAccess />;
		case "settled":
			if (!forceChoose) return <Outlet />;
			break;
		case "choose":
			break;
		default: {
			const exhaustive: never = result;
			return exhaustive;
		}
	}
	const companies =
		result.kind === "choose"
			? result.companies
			: context.currentUser
				? usableCompanies(context.currentUser)
				: [];
	return (
		<AuthLayout variant="centered">
			<CompanyPicker
				companies={companies}
				onChoose={(companyId) => {
					context.queryClient.setQueryDefaults(["current-company-choice"], {
						gcTime: Infinity,
					});
					context.queryClient.setQueryData(
						["current-company-choice"],
						companyId
					);
					void router.invalidate().then(() => {
						onChosen?.();
					});
				}}
			/>
			<Button className="mt-7" variant="textlink" onClick={logOut}>
				{t("auth.logOut")}
			</Button>
		</AuthLayout>
	);
};
