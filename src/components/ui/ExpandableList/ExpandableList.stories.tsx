import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";
import { ExpandableList } from "@/components/ui/ExpandableList";
import "@/common/i18n";

const rowsOf = (count: number): Array<string> =>
	Array.from({ length: count }, (_, index) => `Row ${index + 1}`);

type RowListProps = { rowCount: number; withSeeAll?: boolean };

/** The list over plain text rows, since a story's args cannot carry its type parameter. */
const RowList = ({
	rowCount,
	withSeeAll = false,
}: RowListProps): ReactElement => (
	<ExpandableList
		itemClassName="py-2"
		items={rowsOf(rowCount)}
		keyOf={(row) => row}
		listClassName="flex flex-col divide-y divide-neutral-300"
		renderItem={(row) => row}
		seeAll={withSeeAll ? <a href="#all">See all {rowCount}</a> : undefined}
	/>
);

const meta = {
	title: "UI/ExpandableList",
	component: RowList,
	parameters: { layout: "padded" },
	args: { rowCount: 12 },
} satisfies Meta<typeof RowList>;

export default meta;

type Story = StoryObj<typeof meta>;

/** More rows than the list shows at first: "Show all" opens the rest, "Show fewer" closes them. */
export const Overflowing: Story = {};

/** Few enough rows that every one shows, so there is no toggle. */
export const EveryRowShown: Story = { args: { rowCount: 3 } };

/** Where a full page exists, a link to it stands in for the toggle. */
export const WithSeeAllLink: Story = { args: { withSeeAll: true } };
