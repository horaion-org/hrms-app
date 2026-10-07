import type { ComponentPropsWithRef } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import type { BadgeTone } from "./Badge.constants";

export type BadgeProps = Omit<ComponentPropsWithRef<"span">, "children"> & {
	children: string;
	tone?: BadgeTone;
};

const baseClasses =
	"inline-block min-w-0 max-w-full truncate rounded-full px-3 text-sm leading-6 font-normal";

const toneClasses: Record<BadgeTone, string> = {
	success: "bg-success-100 text-success-900",
	warning: "bg-warning-100 text-neutral-900",
	error: "bg-error-100 text-error-900",
	neutral: "bg-neutral-400 text-neutral-800",
};

export const Badge = ({
	children,
	tone = "neutral",
	title = children,
	className,
	...rest
}: BadgeProps): FunctionComponent => (
	<span
		className={joinClassNames(baseClasses, toneClasses[tone], className)}
		title={title}
		{...rest}
	>
		{children}
	</span>
);
