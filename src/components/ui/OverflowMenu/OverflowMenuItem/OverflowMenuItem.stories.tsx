import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn, userEvent, within } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import { OverflowMenu, OverflowMenuItem } from "@/components/ui/OverflowMenu";

const meta = {
	title: "UI/OverflowMenu/OverflowMenuItem",
	component: OverflowMenuItem,
	parameters: { layout: "padded" },
	argTypes: { children: { control: "text" }, disabled: { control: "boolean" } },
	args: { children: "Edit", onClick: fn() },
	render: (args): NonNullable<FunctionComponent> => (
		<OverflowMenu className="max-w-xs" label="Actions">
			<OverflowMenuItem onClick={fn()}>View</OverflowMenuItem>
			<OverflowMenuItem {...args} />
			<OverflowMenuItem onClick={fn()}>Archive</OverflowMenuItem>
		</OverflowMenu>
	),
} satisfies Meta<typeof OverflowMenuItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvasElement }) => {
		await userEvent.click(within(canvasElement).getByRole("button"));
	},
};

export const Disabled: Story = {
	args: { disabled: true },
	play: Default.play,
};
