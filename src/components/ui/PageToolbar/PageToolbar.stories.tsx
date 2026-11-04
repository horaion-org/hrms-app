import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/ui/Button";
import { FilterChips } from "@/components/ui/FilterChips";
import { FiltersPopover } from "@/components/ui/FiltersPopover";
import { PlusIcon, SearchIcon } from "@/components/ui/Icon";
import { PageToolbar } from "@/components/ui/PageToolbar";
import "@/common/i18n";

const meta = {
	title: "UI/PageToolbar",
	component: PageToolbar,
	parameters: { layout: "padded" },
	args: {
		label: "People list controls",
		filters: (
			<>
				<Input
					aria-label="Search employee"
					className="w-full min-w-0 sm:w-72 lg:w-auto lg:min-w-60 lg:flex-1"
					inputSize="lg"
					leadingIcon={<SearchIcon />}
					placeholder="Search employee"
					type="search"
				/>
				<FiltersPopover count={0}>
					<p>Filter fields</p>
				</FiltersPopover>
			</>
		),
		actions: <Button leadingIcon={<PlusIcon />}>Add employee</Button>,
	},
} satisfies Meta<typeof PageToolbar>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Nothing set: one row. */
export const Default: Story = {};

/** Filters set: their chips beneath. */
export const WithChips: Story = {
	args: {
		chips: (
			<FilterChips
				chips={[{ key: "status", label: "Showing: Active", onRemove: fn() }]}
				onClearAll={fn()}
			/>
		),
	},
};

export const ActionsOnly: Story = { args: { filters: undefined } };
