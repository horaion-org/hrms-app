import type { Meta, StoryObj } from "@storybook/react-vite";
import { RulePreview } from "@/features/scheduling/RulePreview";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/RulePreview",
	component: RulePreview,
	parameters: { layout: "padded" },
	args: { className: "max-w-138", values: { requirement: "must" } },
} satisfies Meta<typeof RulePreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Incomplete: Story = {};

export const Complete: Story = {
	args: {
		values: {
			requirement: "must",
			condition: "at least",
			headcount: "2",
			roles: "Front Desk Staff, Front Desk Lead",
			shifts: "Front Desk AM",
		},
	},
};
