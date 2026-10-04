import { Fragment, type ComponentPropsWithRef, type ReactNode } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent, Heroicon } from "@/common/types";

export type ActivityItemProps = Omit<
	ComponentPropsWithRef<"div">,
	"children" | "title"
> & {
	icon: Heroicon;
	title: string;
	/** Secondary facts such as the actor and time, shown in order with dot separators. */
	details?: Array<ReactNode>;
};

export const ActivityItem = ({
	icon: Icon,
	title,
	details = [],
	className,
	...rest
}: ActivityItemProps): FunctionComponent => {
	const shown = details.filter(
		(detail) => detail !== null && detail !== undefined && detail !== ""
	);
	return (
		<div
			className={joinClassNames("flex min-w-0 items-center gap-4", className)}
			{...rest}
		>
			<span className="flex size-13 shrink-0 items-center justify-center rounded-sm bg-ink-blue-100">
				<Icon aria-hidden="true" className="size-7 text-ink-blue-900" />
			</span>
			<div className="min-w-0">
				<p className="truncate text-base font-medium text-neutral-900">
					{title}
				</p>
				{shown.length > 0 && (
					<p className="mt-1 text-sm text-neutral-700">
						{shown.map((detail, index) => (
							// Details are positional and never reordered.
							<Fragment key={index}>
								{index > 0 && (
									<span aria-hidden="true" className="mx-2">
										•
									</span>
								)}
								{detail}
							</Fragment>
						))}
					</p>
				)}
			</div>
		</div>
	);
};
