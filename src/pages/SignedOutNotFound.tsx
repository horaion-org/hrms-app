import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";

/**
 * An address no route answers outside the signed-in app, laid out as the
 * sign-in pages are, with a way to sign in.
 */
export const SignedOutNotFound = (): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<AuthLayout>
			<h1 className="text-[32px] leading-12 font-medium text-ink-blue-900">
				{t("shell.notFound.title")}
			</h1>
			<p className="mt-3 text-base leading-6 text-neutral-800">
				{t("shell.notFound.explanation")}
			</p>
			<Button className="mt-9 w-full" to="/login">
				{t("shell.notFound.signIn")}
			</Button>
		</AuthLayout>
	);
};
