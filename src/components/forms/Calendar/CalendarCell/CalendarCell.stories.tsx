import type { Meta, StoryObj } from "@storybook/react-vite";
import { userEvent } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import { CalendarCell } from "@/components/forms/Calendar/CalendarCell";

const meta = {
	title: "Forms/Calendar/CalendarCell",
	component: CalendarCell,
	args: { children: "10", "aria-label": "Wednesday, 10 June 2026" },
	decorators: [
		(Story): NonNullable<FunctionComponent> => (
			<div role="grid">
				<div role="row">
					<Story />
				</div>
			</div>
		),
	],
} satisfies Meta<typeof CalendarCell>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Weekend: Story = {
	args: {
		weekend: true,
		children: "13",
		"aria-label": "Saturday, 13 June 2026",
	},
};
export const OutsideMonth: Story = {
	args: {
		outsideMonth: true,
		children: "1",
		"aria-label": "Wednesday, 1 July 2026",
	},
};
export const Disabled: Story = { args: { disabled: true } };
export const Selected: Story = { args: { selected: true } };
export const Today: Story = { args: { today: true } };
export const SelectedToday: Story = { args: { selected: true, today: true } };
export const RangeStart: Story = {
	args: {
		selected: true,
		rangePosition: "start",
		"aria-description": "Range start",
	},
};
export const RangeMiddle: Story = {
	args: {
		selected: true,
		rangePosition: "middle",
		"aria-description": "Within range",
	},
};
export const RangeEnd: Story = {
	args: {
		selected: true,
		rangePosition: "end",
		"aria-description": "Range end",
	},
};
export const OneDayRange: Story = {
	args: {
		selected: true,
		rangePosition: "start-end",
		"aria-description": "Range start and end",
	},
};
export const Hover: Story = {
	play: async ({ canvas }) => {
		await userEvent.hover(canvas.getByRole("gridcell"));
	},
};
export const Pressed: Story = {
	play: async ({ canvas }) => {
		await userEvent.pointer({
			target: canvas.getByRole("gridcell"),
			keys: "[MouseLeft>]",
		});
	},
};
