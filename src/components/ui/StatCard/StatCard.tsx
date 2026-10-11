import { useId, type ComponentPropsWithRef, type ReactNode } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";

export type StatCardProps = Omit<
	ComponentPropsWithRef<"section">,
	"children" | "title"
> & {
	title: string;
	/** The figure, already formatted; pass a placeholder such as "—" while unknown. */
	value: ReactNode;
	/** Under the figure; a tile may leave it out. */
	caption?: string;
	/** "card" is outlined; "tile" is the Dashboard's tinted tile with a small uppercase title. */
	variant?: "card" | "tile";
	/** "lg" shows a tile's figure at headline size, for the page's lead figure. */
	size?: "md" | "lg";
	/** Usually a "View All" link, placed at the top right. */
	action?: ReactNode;
	/** Extra detail under the caption, such as a breakdown or progress bar. */
	children?: ReactNode;
};

export const StatCard = ({
	title,
	value,
	caption,
	variant = "card",
	size = "md",
	action,
	children,
	className,
	...rest
}: StatCardProps): FunctionComponent => {
	const titleId = useId();
	const tile = variant === "tile";
	return (
		<section
			aria-labelledby={titleId}
			className={joinClassNames(
				"flex min-w-0 flex-col p-6",
				tile
					? "rounded-xl bg-ink-blue-50"
					: "rounded-lg border border-neutral-400 bg-neutral-100",
				className
			)}
			{...rest}
		>
			<div className="flex items-start justify-between gap-4">
				<h2
					id={titleId}
					className={joinClassNames(
						"min-w-0 truncate",
						tile
							? "text-base font-semibold text-ink-blue-600 uppercase"
							: "text-xl font-medium text-neutral-900"
					)}
				>
					{title}
				</h2>
				{action}
			</div>
			<p
				className={joinClassNames(
					tile
						? "font-medium text-neutral-900"
						: "mt-8 text-4xl text-ink-blue-900",
					tile && size === "lg" && "mt-3 text-[5rem] leading-23",
					tile && size === "md" && "mt-4 text-[2rem] leading-10"
				)}
			>
				{value}
			</p>
			{caption !== undefined && (
				<p
					className={joinClassNames(
						"text-sm",
						tile ? "mt-2 text-neutral-800" : "mt-4 text-neutral-700"
					)}
				>
					{caption}
				</p>
			)}
			{children}
		</section>
	);
};
