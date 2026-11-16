import { useTranslation } from "react-i18next";
import logo from "@/assets/images/png/horaion-logo-40.png";
import logoDoubleDensity from "@/assets/images/png/horaion-logo-80.png";
import type { FunctionComponent } from "@/common/types";

/** The Horaion mark, drawn from the one logo file pair so a new asset is a swap of these two imports. */
export const HoraionLogo = (): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<img
			alt={t("shell.logo")}
			className="size-10"
			src={logo}
			srcSet={`${logoDoubleDensity} 2x`}
		/>
	);
};
