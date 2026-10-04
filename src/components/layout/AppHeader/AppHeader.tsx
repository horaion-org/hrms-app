import type { ComponentPropsWithRef, ReactNode } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";

export type AppHeaderProps = Omit<
	ComponentPropsWithRef<"header">,
	"children" | "title"
> & {
	/** Usually the greeting, such as "Welcome, John." */
	title: ReactNode;
	/** Controls at the right edge, such as the person's Avatar. */
	actions?: ReactNode;
};

export const AppHeader = ({
	title,
	actions,
	className,
	...rest
}: AppHeaderProps): FunctionComponent => (
	<header
		className={joinClassNames(
			"flex min-h-22.5 shrink-0 items-center justify-between gap-6 border-b border-neutral-400 bg-white px-4 py-5 sm:px-10",
			className
		)}
		{...rest}
	>
		<p className="min-w-0 truncate text-2xl text-neutral-900">{title}</p>
		{actions && (
			<div className="flex shrink-0 items-center gap-4">{actions}</div>
		)}
	</header>
);
