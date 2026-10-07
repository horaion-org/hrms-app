import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProficiencyMeter } from "@/features/people/ProficiencyMeter";
import "@/common/i18n";

const meta = {
	title: "Features/People/ProficiencyMeter",
	component: ProficiencyMeter,
	parameters: { layout: "padded" },
	args: { name: "Baking", value: 8, className: "w-64" },
	argTypes: { value: { control: { type: "range", min: 1, max: 10 } } },
} satisfies Meta<typeof ProficiencyMeter>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Beginner: Story = { args: { value: 1 } };

export const Expert: Story = { args: { value: 10 } };
