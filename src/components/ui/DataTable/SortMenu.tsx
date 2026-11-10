import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import {
	ArrowDownIcon,
	ArrowUpIcon,
	SortIcon,
	TickIcon,
} from "@/components/ui/Icon";
import { compactMenuPanelClasses } from "@/components/ui/OverflowMenu";

/** A sort button's icon: the applied direction, or the neutral sort icon while unsorted. */
export const SortDirectionIcon = ({
	direction,
}: {
	direction: false | "asc" | "desc";
}): FunctionComponent => {
	if (direction === "asc") return <ArrowUpIcon className="text-ink-blue-900" />;
	if (direction === "desc")
		return <ArrowDownIcon className="text-ink-blue-900" />;
	return <SortIcon className="text-neutral-700" />;
};

const sortMenuItemClasses =
	"flex h-11 w-full cursor-pointer items-center justify-between gap-3 bg-white px-4 text-left text-sm font-normal text-neutral-900 outline-none data-focus:bg-neutral-100";

/** One choice in a sort menu: a column and a direction. */
export type SortOption = {
	columnId: string;
	desc: boolean;
	label: string;
	applied: boolean;
};

/** An icon button opening the sort choices; it shows the applied choice's direction and ticks it in the list. */
export const SortMenu = ({
	label,
	options,
	onSort,
}: {
	label: string;
	options: Array<SortOption>;
	onSort: (option: SortOption) => void;
}): FunctionComponent => {
	const applied = options.find((option) => option.applied);
	const direction = applied ? (applied.desc ? "desc" : "asc") : false;
	return (
		<Menu as="div" className="-my-2 -mr-2 inline-flex">
			<MenuButton aria-label={label} as={Button} variant="icon">
				<SortDirectionIcon direction={direction} />
			</MenuButton>
			<MenuItems
				anchor="bottom end"
				className={joinClassNames(compactMenuPanelClasses, "min-w-40")}
			>
				{options.map((option) => (
					// Headless UI fixes the role to `menuitem`, so the applied
					// choice is `aria-current` rather than `aria-checked`.
					<MenuItem
						key={option.label}
						aria-current={option.applied ? "true" : undefined}
						as="button"
						className={sortMenuItemClasses}
						type="button"
						onClick={() => {
							onSort(option);
						}}
					>
						<span>{option.label}</span>
						<span className="size-5 shrink-0">
							{option.applied && (
								<TickIcon className="size-5 text-ink-blue-900" />
							)}
						</span>
					</MenuItem>
				))}
			</MenuItems>
		</Menu>
	);
};
