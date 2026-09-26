import type { ComponentPropsWithRef } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";

export type CountBadgeProps = Omit<
	ComponentPropsWithRef<"span">,
	"children"
> & {
	count: number | undefined;
	tone: "active" | "inactive" | "disabled";
};

const toneClasses: Record<CountBadgeProps["tone"], string> = {
	active: "bg-ink-blue-900 text-white",
	inactive: "bg-neutral-300 text-neutral-800",
	disabled: "bg-neutral-200 text-neutral-400",
};

export const CountBadge = ({
	count,
	tone,
	className,
	...rest
}: CountBadgeProps): FunctionComponent => {
	if (count === 0 || count === undefined) return null;
	return (
		<span
			className={joinClassNames(
				"inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-xs",
				toneClasses[tone],
				className
			)}
			{...rest}
		>
			{count > 99 ? "99+" : count}
		</span>
	);
};
