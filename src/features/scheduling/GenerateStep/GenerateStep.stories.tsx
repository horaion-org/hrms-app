import type { Meta, StoryObj } from "@storybook/react-vite";
import { GenerateStep } from "@/features/scheduling/GenerateStep";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/GenerateStep",
	component: GenerateStep,
	parameters: { layout: "padded" },
	args: { summary: { shifts: 4, roles: 11, coverage: 91 } },
} satisfies Meta<typeof GenerateStep>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const PartialCoverage: Story = {
	args: { summary: { shifts: 2, roles: 4, coverage: 75 } },
};

/** What the week uses of its department, above where everyone starts. */
export const WithWhatTheWeekUses: Story = {
	args: {
		uses: (
			<p className="text-sm text-neutral-800">
				Uses 2 of 3 shifts and 4 of 5 constraints of Front Office.
			</p>
		),
	},
};
