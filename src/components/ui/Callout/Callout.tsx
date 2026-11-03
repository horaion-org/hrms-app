import type { ComponentPropsWithRef, ReactNode } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { InfoIcon, WarningIcon } from "@/components/ui/Icon";

export type CalloutTone = "info" | "warning";

export type CalloutProps = Omit<ComponentPropsWithRef<"div">, "children"> & {
	/** The guidance itself; one short sentence reads best. */
	children: ReactNode;
	/** Warning draws attention to something to fix before acting, without blocking it. */
	tone?: CalloutTone;
};

const toneClasses: Record<CalloutTone, { box: string; icon: string }> = {
	info: {
		box: "border-ink-blue-400 bg-ink-blue-50",
		icon: "text-ink-blue-600",
	},
	warning: {
		box: "border-warning-400 bg-warning-50",
		icon: "text-warning-700",
	},
};

/** A highlighted note that guides a choice nearby; it is never an error. */
export const Callout = ({
	children,
	tone = "info",
	className,
	...rest
}: CalloutProps): FunctionComponent => {
	const Icon = tone === "warning" ? WarningIcon : InfoIcon;
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
