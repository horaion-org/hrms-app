import type { ComponentPropsWithRef, ReactNode } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import {
	AlertIcon,
	InfoIcon,
	TickIcon,
	WarningIcon,
} from "@/components/ui/Icon";

export type CalloutTone = "info" | "neutral" | "success" | "warning" | "error";

export type CalloutProps = Omit<ComponentPropsWithRef<"div">, "children"> & {
	/** The guidance itself; one short sentence reads best. */
	children: ReactNode;
	/** Neutral states a fact with nothing to do yet; success confirms that something holds; warning draws attention to something to fix before acting, without blocking it; error, to something that blocks. */
	tone?: CalloutTone;
};

const toneClasses: Record<CalloutTone, { box: string; icon: string }> = {
	info: {
		box: "border-ink-blue-400 bg-ink-blue-50",
		icon: "text-ink-blue-600",
	},
	neutral: {
		box: "border-neutral-400 bg-neutral-100",
		icon: "text-neutral-700",
	},
	success: {
		box: "border-success-400 bg-success-50",
		icon: "text-success-700",
	},
	warning: {
		box: "border-warning-400 bg-warning-50",
		icon: "text-warning-700",
	},
	error: {
		box: "border-error-400 bg-error-50",
		icon: "text-error-700",
	},
};

const toneIcons: Record<CalloutTone, typeof InfoIcon> = {
	info: InfoIcon,
	neutral: InfoIcon,
	success: TickIcon,
	warning: WarningIcon,
	error: AlertIcon,
};

/** A highlighted note that guides a choice nearby, or names what blocks one in the error tone. */
export const Callout = ({
	children,
	tone = "info",
	className,
	...rest
}: CalloutProps): FunctionComponent => {
	const Icon = toneIcons[tone];
	return (
		<div
			role="note"
			className={joinClassNames(
				"flex min-h-12 items-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold text-neutral-800",
				toneClasses[tone].box,
				className
			)}
			{...rest}
		>
			<Icon
				className={joinClassNames("size-5 shrink-0", toneClasses[tone].icon)}
			/>
			<span className="min-w-0">{children}</span>
		</div>
	);
};
