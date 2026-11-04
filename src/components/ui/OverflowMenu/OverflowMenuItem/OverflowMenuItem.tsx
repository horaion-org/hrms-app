import { MenuItem } from "@headlessui/react";
import type { MouseEventHandler } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";

/** `danger` colours the label red, for an action that destroys something. */
export type OverflowMenuItemTone = "default" | "danger";

export type OverflowMenuItemProps = {
	children: string;
	onClick?: MouseEventHandler<HTMLButtonElement>;
	disabled?: boolean;
	tone?: OverflowMenuItemTone;
};

const toneClasses: Record<OverflowMenuItemTone, string> = {
	default: "text-neutral-900",
	danger: "text-error-700",
};

export const OverflowMenuItem = ({
	children,
	onClick,
	disabled,
	tone = "default",
}: OverflowMenuItemProps): FunctionComponent => (
	<MenuItem
		as="button"
		disabled={disabled}
		type="button"
		className={joinClassNames(
			"block h-11 w-full bg-white px-4 text-left text-sm font-normal outline-none data-disabled:cursor-not-allowed data-disabled:text-neutral-500 data-focus:not-data-disabled:bg-neutral-100",
			toneClasses[tone]
		)}
		onClick={onClick}
	>
		{children}
	</MenuItem>
);
