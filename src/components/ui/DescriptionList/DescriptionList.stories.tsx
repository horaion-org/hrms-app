import type { Meta, StoryObj } from "@storybook/react-vite";
import type { FunctionComponent } from "@/common/types";
import { DescriptionList } from "@/components/ui/DescriptionList";

const meta = {
	title: "UI/DescriptionList",
	component: DescriptionList,
	parameters: { layout: "padded" },
	args: {
		items: [
			{ label: "Employment type", value: "Full-time" },
			{ label: "Hire date", value: "15 Jan 2024" },
			{ label: "Probation end date", value: "—" },
			{ label: "Employment status", value: "Active" },
		],
	},
	argTypes: { items: { control: false } },
	render: (args): NonNullable<FunctionComponent> => (
		<div className="w-120 max-w-full">
			<DescriptionList {...args} />
		</div>
	),
} satisfies Meta<typeof DescriptionList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The proportions of a person's detail cards, matching their form. */
export const ProfileProportions: Story = {
	args: { valueWidth: "sm:w-[52.5%]" },
};

/** A long value wraps in its column rather than widening the row. */
export const LongValue: Story = {
	args: {
		items: [
			{
				label: "Email address",
				value: "aisha.binte.abdul.rahman.mohamed.salleh@company.com",
			},
		],
	},
};
