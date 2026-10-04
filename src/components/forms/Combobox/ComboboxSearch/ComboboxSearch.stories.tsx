import type { Meta, StoryObj } from "@storybook/react-vite";
import type { FunctionComponent } from "@/common/types";
import { ComboboxSearch } from "@/components/forms/Combobox/ComboboxSearch";
const meta = {
	title: "Forms/Combobox/ComboboxSearch",
	component: ComboboxSearch,
	args: {
		"aria-label": "Search people",
		placeholder: "Search people",
		listId: "search-results",
	},
	render: (args): NonNullable<FunctionComponent> => (
		<>
			<ComboboxSearch {...args} />
			<div aria-label="People" id="search-results" role="listbox" />
		</>
	),
} satisfies Meta<typeof ComboboxSearch>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
