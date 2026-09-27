import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import { CalendarHeader } from "@/components/forms/Calendar/CalendarHeader";

const meta = {
	title: "Forms/Calendar/CalendarHeader",
	component: CalendarHeader,
	args: {
		title: "June 2026",
		previousLabel: "Previous month",
		nextLabel: "Next month",
		titleLabel: "Show months",
		onTitleClick: fn(),
		onPrevious: fn(),
		onNext: fn(),
	},
	decorators: [
		(Story): NonNullable<FunctionComponent> => (
			<div className="w-72">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof CalendarHeader>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Months: Story = {
	args: {
		title: "2026",
		titleLabel: "Show years",
		previousLabel: "Previous year",
		nextLabel: "Next year",
	},
};
export const Years: Story = {
	args: {
		title: "2015 - 2026",
		titleLabel: undefined,
		onTitleClick: undefined,
		previousLabel: "Previous 12 years",
		nextLabel: "Next 12 years",
	},
};
