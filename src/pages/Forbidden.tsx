import { useCanGoBack, useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { ArrowLeftIcon } from "@/components/ui/Icon";

/**
 * Where a route sends someone whose roles don't include the page they
 * opened. Inside the app layout, so the rest of the app stays one click
 * away; Go back shows only when there is somewhere in the app to go back to.
 */
export const Forbidden = (): FunctionComponent => {
	const { t } = useTranslation();
	const router = useRouter();
	const canGoBack = useCanGoBack();

	return (
		<>
			<h1 className="text-4xl font-medium text-neutral-900">
				{t("forbidden.title")}
			</h1>
			<p className="mt-3 max-w-xl text-sm text-neutral-800">
				{t("forbidden.explanation")}
			</p>
			<div className="mt-8 flex flex-wrap items-center gap-4">
				{canGoBack && (
					<Button
						leadingIcon={<ArrowLeftIcon />}
						onClick={() => {
							router.history.back();
						}}
					>
						{t("forbidden.back")}
					</Button>
				)}
				<Button to="/" variant={canGoBack ? "secondary" : "primary"}>
					{t("forbidden.home")}
				</Button>
			</div>
		</>
	);
};
