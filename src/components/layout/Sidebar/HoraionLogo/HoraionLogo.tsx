import { useTranslation } from "react-i18next";
import logo from "@/assets/images/png/horaion-logo-64.png";
import logoDoubleDensity from "@/assets/images/png/horaion-logo-128.png";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";

export type HoraionLogoProps = {
	/** From `lg`, keeps the mark at 48 px to fit the collapsed 80 px rail instead of 64 px. */
	collapsed?: boolean;
};

/** The Horaion mark, drawn from the one logo file pair so a new asset is a swap of these two imports. */
export const HoraionLogo = ({
	collapsed = false,
}: HoraionLogoProps): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<img
			alt={t("shell.logo")}
			className={joinClassNames("size-12", !collapsed && "lg:size-16")}
			src={logo}
			srcSet={`${logoDoubleDensity} 2x`}
		/>
	);
};
