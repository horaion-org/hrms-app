import { MenuItem } from "@headlessui/react";
import type { MouseEventHandler } from "react";
import type { FunctionComponent } from "@/common/types";

export type OverflowMenuItemProps = {
	children: string;
	onClick?: MouseEventHandler<HTMLButtonElement>;
	disabled?: boolean;
};

export const OverflowMenuItem = ({
	children,
	onClick,
	disabled,
}: OverflowMenuItemProps): FunctionComponent => (
	<MenuItem
		as="button"
		className="block h-11 w-full bg-white px-4 text-left text-sm font-normal text-neutral-900 outline-none data-disabled:cursor-not-allowed data-disabled:text-neutral-500 data-focus:not-data-disabled:bg-neutral-100"
		disabled={disabled}
		type="button"
		onClick={onClick}
	>
		{children}
	</MenuItem>
);
