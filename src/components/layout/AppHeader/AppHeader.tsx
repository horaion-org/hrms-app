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
 * The bar above the page from `lg`, its title wrapping above the controls
 * when they do not fit. Below `lg` it is only its scope and actions, which
 * `AppShell` places in the navigation bar's row; the page shows the title.
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
			"flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-3",
			// From `lg` a white bar above the page; below it the controls sit in the navigation bar's row (`AppShell`).
			"max-lg:w-full lg:min-h-22.5 lg:border-b lg:border-neutral-400 lg:bg-white lg:px-10 lg:py-5",
			className
		)}
		{...rest}
	>
		{/* The title needs the room of a whole bar: below `lg` the page shows it instead. */}
		{title && (
			<p className="min-w-0 truncate text-2xl text-neutral-900 max-lg:hidden">
				{title}
			</p>
		)}
		{(scope || actions) && (
			// Below `lg` the scope takes the room the bar's icons leave, so the gaps tighten there first.
			<div className="flex min-w-0 flex-1 items-center justify-end gap-2 max-lg:gap-1">
				{scope && (
					<div className="mr-2 min-w-0 flex-1 max-lg:mr-0 sm:mr-4 sm:flex-none">
						{scope}
					</div>
				)}
				{actions}
			</div>
		)}
	</header>
);
