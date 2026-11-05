import { MenuItem } from "@headlessui/react";
import { Link, type LinkProps } from "@tanstack/react-router";
import type { MouseEventHandler } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";

/** `danger` colours the label red, for an action that destroys something. */
export type OverflowMenuItemTone = "default" | "danger";

export type OverflowMenuItemProps = {
	children: string;
	disabled?: boolean;
	tone?: OverflowMenuItemTone;
} & (
	| { onClick?: MouseEventHandler<HTMLButtonElement>; to?: never }
	| {
			/** Makes the item a link to this page instead of an action. */
			to: NonNullable<LinkProps["to"]>;
			onClick?: never;
	  }
);

const itemClasses =
	"h-11 w-full cursor-pointer bg-white px-4 text-left text-sm font-normal outline-none data-disabled:cursor-not-allowed data-disabled:text-neutral-500 data-focus:not-data-disabled:bg-neutral-100";

const toneClasses: Record<OverflowMenuItemTone, string> = {
	default: "text-neutral-900",
	danger: "text-error-700",
};

export const OverflowMenuItem = ({
	children,
	onClick,
	to,
	disabled,
	tone = "default",
}: OverflowMenuItemProps): FunctionComponent => {
	if (to !== undefined)
		return (
			<MenuItem disabled={disabled}>
				<Link
					to={to}
					className={joinClassNames(
						"flex items-center",
						itemClasses,
						toneClasses[tone]
					)}
				>
					{children}
				</Link>
			</MenuItem>
		);
	return (
		<MenuItem
			as="button"
			className={joinClassNames("block", itemClasses, toneClasses[tone])}
			disabled={disabled}
			type="button"
			onClick={onClick}
		>
			{children}
		</MenuItem>
	);
};
