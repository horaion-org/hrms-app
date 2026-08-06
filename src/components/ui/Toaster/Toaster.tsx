import { XMarkIcon } from "@heroicons/react/20/solid";
import type { FunctionComponent } from "@/common/types";
import { useToastStore, type ToastTone } from "@/store/useToastStore";

const TONES: Record<ToastTone, string> = {
	success: "bg-emerald-600",
	error: "bg-red-600",
};

export const Toaster = (): FunctionComponent => {
	const toasts = useToastStore((state) => state.toasts);
	const dismiss = useToastStore((state) => state.dismiss);

	if (toasts.length === 0) {
		return null;
	}

	return (
		<div
			aria-live="polite"
			className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2"
		>
			{toasts.map((toast) => (
				<div
					key={toast.id}
					className={`flex items-start gap-3 rounded-md p-3 text-sm text-white shadow-lg ${TONES[toast.tone]}`}
				>
					<p className="flex-1">{toast.message}</p>
					<button
						aria-label="Dismiss"
						className="shrink-0 opacity-80 hover:opacity-100"
						type="button"
						onClick={() => {
							dismiss(toast.id);
						}}
					>
						<XMarkIcon aria-hidden="true" className="size-4" />
					</button>
				</div>
			))}
		</div>
	);
};
