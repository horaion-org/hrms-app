import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";
import { logOut } from "@/features/auth/session";

export const NoCompanyAccess = (): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<AuthLayout variant="centered">
			<h1 className="text-[32px] leading-12 font-medium text-ink-blue-900">
				{t("auth.company.noneTitle")}
			</h1>
			<p className="mt-3 text-base leading-6 text-neutral-800">
				{t("auth.company.noneDescription")}
			</p>
			<Button className="mt-9 w-full" onClick={logOut}>
				{t("auth.logOut")}
			</Button>
		</AuthLayout>
	);
};
