import type { ComponentPropsWithRef, ReactNode } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";

export type AppHeaderProps = Omit<
	ComponentPropsWithRef<"header">,
	"children" | "title"
> & {
	/** Usually the greeting, such as "Welcome, John."; nothing on most pages. */
	title: ReactNode;
	/**
	 * What the page is about, such as the Branch it lists. It sits before the
	 * actions and takes the room they leave on a phone.
	 */
	scope?: ReactNode;
	/** Controls at the right edge, such as the person's Avatar. */
	actions?: ReactNode;
};

/**
 * The bar above the page. A title that does not fit beside the controls
 * wraps above them, so nothing pushes the page sideways on a phone.
 */
export const AppHeader = ({
	title,
	scope,
	actions,
	className,
	...rest
}: AppHeaderProps): FunctionComponent => (
	<header
		className={joinClassNames(
			"flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-neutral-400 bg-white px-4 py-3",
			"sm:min-h-22.5 sm:px-6 sm:py-5 lg:px-10",
			className
		)}
		{...rest}
	>
		{title && (
			<p className="min-w-0 truncate text-2xl text-neutral-900">{title}</p>
		)}
		{(scope || actions) && (
			<div className="flex min-w-0 flex-1 items-center justify-end gap-2">
				{scope && (
					<div className="mr-2 min-w-0 flex-1 sm:mr-4 sm:flex-none">
						{scope}
					</div>
				)}
				{actions}
			</div>
		)}
	</header>
);
