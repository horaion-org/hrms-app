import type { ComponentPropsWithRef } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import type { BadgeTone } from "./Badge.constants";

export type BadgeProps = Omit<ComponentPropsWithRef<"span">, "children"> & {
	children: string;
	tone?: BadgeTone;
	/** For a narrow cell: smaller, and wraps rather than truncating. */
	compact?: boolean;
};

const baseClasses = "inline-block min-w-0 max-w-full font-normal";
const roomyClasses = "truncate rounded-full px-3 text-sm leading-6";
const compactClasses = "rounded-md px-1 py-0.5 text-xs leading-4 wrap-anywhere";

const toneClasses: Record<BadgeTone, string> = {
	success: "bg-success-100 text-success-900",
	warning: "bg-warning-100 text-neutral-900",
	error: "bg-error-100 text-error-900",
	neutral: "bg-neutral-400 text-neutral-800",
};

export const Badge = ({
	children,
	tone = "neutral",
	compact = false,
	title = children,
	className,
	...rest
}: BadgeProps): FunctionComponent => (
	<span
		title={title}
		className={joinClassNames(
			baseClasses,
			compact ? compactClasses : roomyClasses,
			toneClasses[tone],
			className
		)}
		{...rest}
	>
		{children}
	</span>
);
