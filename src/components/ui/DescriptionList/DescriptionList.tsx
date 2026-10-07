import type { ReactNode } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";

/** One labelled value; the label also keys the row, so labels are unique. */
export type DescriptionListItem = { label: string; value: ReactNode };

export type DescriptionListProps = {
	items: ReadonlyArray<DescriptionListItem>;
	/**
	 * The value column's width from `sm` up, matching a `FormRow`'s
	 * `fieldWidth` so a read-only card lines up with its form.
	 */
	valueWidth?: string;
	className?: string;
};

/**
 * Read-only labelled values, such as a person's details in a Card: label
 * beside value from `sm` up, label above value below it.
 */
export const DescriptionList = ({
	items,
	valueWidth = "sm:w-1/2",
	className,
}: DescriptionListProps): FunctionComponent => (
	<dl className={joinClassNames("flex flex-col gap-4", className)}>
		{items.map(({ label, value }) => (
			<div
				key={label}
				className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-6"
			>
				<dt className="min-w-0 flex-1 text-base text-neutral-800">{label}</dt>
				<dd
					className={joinClassNames(
						"min-w-0 text-base font-medium break-words text-neutral-900 sm:shrink-0",
						valueWidth
					)}
				>
					{value}
				</dd>
			</div>
		))}
	</dl>
);
