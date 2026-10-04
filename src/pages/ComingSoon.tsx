import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";

type Module = "scheduling";

const ComingSoon = ({ module }: { module: Module }): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<>
			<h1 className="text-4xl font-medium text-neutral-900">
				{t(`shell.navigation.${module}`)}
			</h1>
			<p className="mt-3 text-sm text-neutral-800">{t("shell.comingSoon")}</p>
		</>
	);
};

export const Scheduling = (): FunctionComponent => (
	<ComingSoon module="scheduling" />
);
