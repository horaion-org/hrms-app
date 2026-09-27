import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Link } from "@/components/ui/Link";
import { signOut } from "@/features/auth/session";

export const Home = (): FunctionComponent => {
	const { t, i18n } = useTranslation();

	const onTranslateButtonClick = async (): Promise<void> => {
		if (i18n.resolvedLanguage === "en") {
			await i18n.changeLanguage("es");
		} else {
			await i18n.changeLanguage("en");
		}
	};

	return (
		<div className="bg-blue-300 font-bold w-screen h-screen flex flex-col justify-center items-center">
			<p className="text-white text-6xl">{t("home.greeting")}</p>
			<button
				className="hover:cursor-pointer"
				type="submit"
				onClick={onTranslateButtonClick}
			>
				translate
			</button>
			<Link className="mt-4" to="/example">
				View example demo
			</Link>
			<Link className="mt-4" to="/settings/security">
				{t("auth.security.open")}
			</Link>
			<Button
				className="mt-4"
				variant="secondary"
				onClick={() => {
					void signOut();
				}}
			>
				{t("auth.signOut")}
			</Button>
		</div>
	);
};
