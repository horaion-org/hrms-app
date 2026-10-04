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
	caption: string;
	/** Usually a "View All" link, placed at the top right. */
	action?: ReactNode;
};

export const StatCard = ({
	title,
	value,
	caption,
	action,
	className,
	...rest
}: StatCardProps): FunctionComponent => {
	const titleId = useId();
	return (
		<section
			aria-labelledby={titleId}
			className={joinClassNames(
				"flex min-w-0 flex-col rounded-lg border border-neutral-400 bg-neutral-100 p-6",
				className
			)}
			{...rest}
		>
			<div className="flex items-start justify-between gap-4">
				<h2
					className="min-w-0 truncate text-xl font-medium text-neutral-900"
					id={titleId}
				>
					{title}
				</h2>
				{action}
			</div>
			<p className="mt-8 text-4xl text-ink-blue-900">{value}</p>
			<p className="mt-4 text-sm text-neutral-700">{caption}</p>
		</section>
	);
};
