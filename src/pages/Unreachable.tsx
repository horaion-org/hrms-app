import { useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { isDecisionEngineStale } from "@/common/problem";
import type { FunctionComponent } from "@/common/types";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";

/**
 * Where a signed-in page lands when it could not load. A read refused while
 * access is updated after a recent change says so (the connection is fine);
 * anything else reads as the API being out of reach. Try again reloads.
 */
export const Unreachable = ({
	error,
}: Partial<Pick<ErrorComponentProps, "error">>): FunctionComponent => {
	const router = useRouter();
	const { t } = useTranslation();
	const copy = isDecisionEngineStale(error)
		? "shell.accessUpdating"
		: "auth.unreachable";
	return (
		<AuthLayout>
			<h1 className="text-[32px] leading-12 font-medium text-ink-blue-900">
				{t(`${copy}.title`)}
			</h1>
			<p className="mt-3 text-base leading-6 text-neutral-800">
				{t(`${copy}.explanation`)}
			</p>
			<Button className="mt-9 w-full" onClick={() => router.invalidate()}>
				{t(`${copy}.tryAgain`)}
			</Button>
		</AuthLayout>
	);
};
