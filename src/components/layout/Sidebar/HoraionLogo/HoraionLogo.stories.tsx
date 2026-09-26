import type { Meta, StoryObj } from "@storybook/react-vite";
import type { FunctionComponent } from "@/common/types";
import { HoraionLogo } from "@/components/layout/Sidebar/HoraionLogo";

const meta = {
	title: "Layout/Sidebar/HoraionLogo",
	component: HoraionLogo,
	decorators: [
		(Story): NonNullable<FunctionComponent> => (
			<div className="bg-ink-blue-900 p-7">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof HoraionLogo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
