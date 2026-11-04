import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { FindingsSummary } from "@/features/scheduling/FindingsSummary";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/FindingsSummary",
	component: FindingsSummary,
	parameters: { layout: "padded" },
	args: {
		counts: { roster: 3, setup: 2 },
		expanded: false,
		panelId: "findings",
		onToggle: fn(),
	},
} satisfies Meta<typeof FindingsSummary>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const RosterNotesOnly: Story = {
	args: { counts: { roster: 1, setup: 0 } },
};

export const Expanded: Story = { args: { expanded: true } };
