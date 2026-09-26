import { Link, type LinkProps } from "@tanstack/react-router";
import type { ComponentPropsWithRef } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent, Heroicon } from "@/common/types";

export type SidebarItemProps = Omit<
	ComponentPropsWithRef<"a">,
	keyof LinkProps | "children"
> &
	Omit<LinkProps, "children" | "to"> & {
		to: NonNullable<LinkProps["to"]>;
		label: string;
		icon: Heroicon;
		activeIcon: Heroicon;
	};

export const SidebarItem = ({
	label,
	icon: Icon,
	activeIcon: ActiveIcon,
	className,
	...props
}: SidebarItemProps): FunctionComponent => {
	return (
		<Link
			{...props}
			className={joinClassNames(
				"flex h-12 w-56 shrink-0 items-center gap-3 rounded-sm p-4 text-base focus-visible:outline-2 focus-visible:outline-offset-2",
				"bg-transparent text-white not-data-[status=active]:hover:bg-ink-blue-800 data-[status=active]:bg-ink-blue-100 data-[status=active]:text-neutral-900 focus-visible:outline-white",
				className
			)}
		>
			{({ isActive }) => (
				<>
					{isActive ? (
						<ActiveIcon
							aria-hidden="true"
							className="size-5 shrink-0 text-ink-blue-900"
						/>
					) : (
						<Icon aria-hidden="true" className="size-5 shrink-0 text-white" />
					)}
					{label}
				</>
			)}
		</Link>
	);
};
