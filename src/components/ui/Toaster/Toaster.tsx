import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { CloseIcon } from "@/components/ui/Icon";
import { useToastStore, type ToastTone } from "@/store/useToastStore";

const toneClasses: Record<ToastTone, string> = {
	success: "bg-success-600",
	error: "bg-error-600",
};

/**
 * Shows the queued toasts in the bottom-right corner and announces each one
 * politely. Render it once, at the root.
 */
export const Toaster = (): FunctionComponent => {
	const { t } = useTranslation();
	const toasts = useToastStore((state) => state.toasts);
	const dismiss = useToastStore((state) => state.dismiss);

	return (
		<div
			aria-live="polite"
			className="fixed right-4 bottom-4 z-50 flex w-full max-w-sm flex-col gap-2"
		>
			{toasts.map((toast) => (
				<div
					key={toast.id}
					className={`flex items-start gap-3 rounded-lg p-3 text-sm text-white shadow-lg ${toneClasses[toast.tone]}`}
					role={toast.tone === "error" ? "alert" : "status"}
				>
					<p className="flex-1 self-center">{toast.message}</p>
					<Button
						aria-label={t("toaster.dismiss")}
						className="size-6 text-white enabled:hover:text-white/80 enabled:active:text-white/60"
						variant="icon"
						onClick={() => {
							dismiss(toast.id);
						}}
					>
						<CloseIcon />
					</Button>
				</div>
			))}
		</div>
	);
};
