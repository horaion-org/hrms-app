import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";

/** How many rows a list shows before it offers the rest. */
export const COLLAPSED_ROW_COUNT = 5;

export type ExpandableListProps<Item> = {
	items: ReadonlyArray<Item>;
	/** A stable key for each row. */
	keyOf: (item: Item) => string;
	/** One row's content, placed inside its list item. */
	renderItem: (item: Item) => ReactNode;
	/** The list's own classes, such as a divided column. */
	listClassName?: string;
	/** The classes of each row. */
	itemClassName?: string;
	/** Where a full page exists, a link to it replaces the toggle. */
	seeAll?: ReactNode;
};

/**
 * A list that shows its first rows and then a "Show all" / "Show fewer"
 * toggle, or a link to the full page, so no card grows past a glance.
 */
export const ExpandableList = <Item,>({
	items,
	keyOf,
	renderItem,
	listClassName,
	itemClassName,
	seeAll,
}: ExpandableListProps<Item>): FunctionComponent => {
	const { t } = useTranslation();
	const [expanded, setExpanded] = useState(false);
	const overflowing = items.length > COLLAPSED_ROW_COUNT;
	const shown =
		expanded || !overflowing ? items : items.slice(0, COLLAPSED_ROW_COUNT);
	return (
		<div className="flex flex-col gap-3">
			<ul className={listClassName}>
				{shown.map((item) => (
					<li key={keyOf(item)} className={itemClassName}>
						{renderItem(item)}
					</li>
				))}
			</ul>
			{overflowing &&
				(seeAll ?? (
					<Button
						aria-expanded={expanded}
						className="self-start"
						variant="hyperlink"
						onClick={() => {
							setExpanded((open) => !open);
						}}
					>
						{expanded
							? t("expandableList.showFewer")
							: t("expandableList.showAll", { count: items.length })}
					</Button>
				))}
		</div>
	);
};
