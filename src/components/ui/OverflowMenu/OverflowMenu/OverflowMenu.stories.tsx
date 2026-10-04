import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn, userEvent, within } from "storybook/test";
import { OverflowMenu, OverflowMenuItem } from "@/components/ui/OverflowMenu";

const meta = {
	title: "UI/OverflowMenu/OverflowMenu",
	component: OverflowMenu,
	parameters: { layout: "padded" },
	argTypes: {
		label: { control: "text" },
		disabled: { control: "boolean" },
		children: { control: false },
	},
	args: {
		label: "Actions",
		disabled: false,
		className: "max-w-xs",
		children: [
			<OverflowMenuItem key="edit" onClick={fn()}>
				Edit
			</OverflowMenuItem>,
			<OverflowMenuItem key="duplicate" onClick={fn()}>
				Duplicate
			</OverflowMenuItem>,
			<OverflowMenuItem key="archive" onClick={fn()}>
				Archive
			</OverflowMenuItem>,
		],
	},
} satisfies Meta<typeof OverflowMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const Disabled: Story = { args: { disabled: true } };

export const Open: Story = {
	play: async ({ canvasElement }) => {
		await userEvent.click(within(canvasElement).getByRole("button"));
	},
};

/** The compact trigger used in a table row's actions cell. */
export const Icon: Story = {
	args: { variant: "icon", label: "More actions", className: undefined },
	play: Open.play,
};
