import type { ComponentPropsWithRef, ReactNode } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { InfoIcon } from "@/components/ui/Icon";

export type CalloutProps = Omit<ComponentPropsWithRef<"div">, "children"> & {
	/** The guidance itself; one short sentence reads best. */
	children: ReactNode;
};

/** A highlighted note that guides a choice nearby; it is never an error. */
export const Callout = ({
	children,
	className,
	...rest
}: CalloutProps): FunctionComponent => (
	<div
		role="note"
		className={joinClassNames(
			"flex min-h-12 items-center gap-3 rounded-lg border border-ink-blue-400 bg-ink-blue-50 px-4 py-3 text-sm font-semibold text-neutral-800",
			className
		)}
		{...rest}
	>
		<InfoIcon className="size-5 shrink-0 text-ink-blue-600" />
		<span className="min-w-0">{children}</span>
	</div>
);
