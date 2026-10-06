import { useEffect, useRef, type ComponentPropsWithRef } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { TickFilledIcon } from "@/components/ui/Icon";

export type ToastProps = Omit<ComponentPropsWithRef<"div">, "children"> & {
	/** What just happened, e.g. "Constraint successfully deleted". */
	children: string;
	/** Called once the toast has been shown for `duration` milliseconds. */
	onDismiss: () => void;
	duration?: number;
};

/**
 * A short confirmation floating at the bottom of the screen. It is announced
 * politely and dismisses itself; render it again with a new `key` to restart.
 */
export const Toast = ({
	children,
	onDismiss,
	duration = 4000,
	className,
	...rest
}: ToastProps): FunctionComponent => {
	// The latest handler, so a parent re-render does not restart the timer.
	const dismiss = useRef(onDismiss);
	useEffect(() => {
		dismiss.current = onDismiss;
	});
	useEffect(() => {
		const timer = setTimeout(() => {
			dismiss.current();
		}, duration);
		return (): void => {
			clearTimeout(timer);
		};
	}, [duration]);

	return (
		<div
			aria-live="polite"
			role="status"
			className={joinClassNames(
				"fixed bottom-11 left-1/2 z-50 flex h-12 max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-full border border-success-200 bg-success-50 px-5 text-base font-medium text-success-900 shadow-sm",
				className
			)}
			{...rest}
		>
			<TickFilledIcon className="size-5 shrink-0 text-success-500" />
			<span className="truncate">{children}</span>
		</div>
	);
};
