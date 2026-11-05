import { useEffect, useRef, useState, type ComponentPropsWithRef } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { TickFilledIcon } from "@/components/ui/Icon";

/** One thing the person may do about what just happened, e.g. "Undo". */
export type ToastAction = { label: string; onClick: () => void };

export type ToastProps = Omit<ComponentPropsWithRef<"div">, "children"> & {
	/** What just happened, e.g. "Constraint successfully deleted". */
	children: string;
	/** Called once the toast has been shown for `duration` milliseconds. */
	onDismiss: () => void;
	duration?: number;
	/**
	 * A button beside the message. While the toast holds focus (someone
	 * tabbed to the button) it stays up, and its time starts again once
	 * focus leaves.
	 */
	action?: ToastAction;
};

/**
 * A short confirmation floating at the bottom of the screen. It is announced
 * politely and dismisses itself; render it again with a new `key` to restart.
 */
export const Toast = ({
	children,
	onDismiss,
	duration = 4000,
	action,
	className,
	...rest
}: ToastProps): FunctionComponent => {
	const [focused, setFocused] = useState(false);
	// The latest handler, so a parent re-render does not restart the timer.
	const dismiss = useRef(onDismiss);
	useEffect(() => {
		dismiss.current = onDismiss;
	});
	useEffect(() => {
		if (focused) return undefined;
		const timer = setTimeout(() => {
			dismiss.current();
		}, duration);
		return (): void => {
			clearTimeout(timer);
		};
	}, [duration, focused]);

	return (
		<div
			aria-live="polite"
			role="status"
			className={joinClassNames(
				"fixed bottom-11 left-1/2 z-50 flex h-12 max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-full border border-success-200 bg-success-50 px-5 text-base font-medium text-success-900 shadow-sm",
				className
			)}
			onBlur={() => {
				setFocused(false);
			}}
			onFocus={() => {
				setFocused(true);
			}}
			{...rest}
		>
			<TickFilledIcon className="size-5 shrink-0 text-success-500" />
			<span className="truncate">{children}</span>
			{action && (
				<Button
					className="shrink-0"
					variant="textlink"
					onClick={action.onClick}
				>
					{action.label}
				</Button>
			)}
		</div>
	);
};
