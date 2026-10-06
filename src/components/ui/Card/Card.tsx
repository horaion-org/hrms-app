import { useId, type ComponentPropsWithRef, type ReactNode } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent, Heroicon } from "@/common/types";

export type CardProps = Omit<ComponentPropsWithRef<"section">, "title"> & {
	title: string;
	/** Decorative; drawn beside the title at the design's size. */
	icon: Heroicon;
	/** Usually a hyperlink Button such as "Add note", placed at the top right. */
	action?: ReactNode;
	/** Cards sit under the page's h1 by default; use 3 under another h2. */
	headingLevel?: 2 | 3;
};

/** A titled, bordered section of a page, such as a person's contact details. */
export const Card = ({
	title,
	icon: Icon,
	action,
	headingLevel = 2,
	className,
	children,
	...rest
}: CardProps): FunctionComponent => {
	const titleId = useId();
	const Heading = headingLevel === 2 ? "h2" : "h3";
	return (
		<section
			aria-labelledby={titleId}
			className={joinClassNames(
				"flex min-w-0 flex-col gap-6 rounded-xl border border-neutral-400 bg-white p-6",
				className
			)}
			{...rest}
		>
			<div className="flex items-center justify-between gap-4">
				<div className="flex min-w-0 items-center gap-2 text-neutral-900">
					<Icon aria-hidden="true" className="size-5 shrink-0" />
					<Heading className="min-w-0 text-base font-semibold" id={titleId}>
						{title}
					</Heading>
				</div>
				{action}
			</div>
			{children}
		</section>
	);
};
