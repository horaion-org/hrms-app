import { useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";

export const Unreachable = (): FunctionComponent => {
	const router = useRouter();
	const { t } = useTranslation();
	return (
		<AuthLayout>
			<h1 className="text-[32px] leading-12 font-medium text-ink-blue-900">
				{t("auth.unreachable.title")}
			</h1>
			<p className="mt-3 text-base leading-6 text-neutral-800">
				{t("auth.unreachable.explanation")}
			</p>
			<Button className="mt-9 w-full" onClick={() => router.invalidate()}>
				{t("auth.unreachable.tryAgain")}
			</Button>
		</AuthLayout>
	);
};
