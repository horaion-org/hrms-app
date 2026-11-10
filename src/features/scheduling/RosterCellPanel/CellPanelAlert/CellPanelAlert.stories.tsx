import type { Meta, StoryObj } from "@storybook/react-vite";
import { CellPanelAlert } from "./CellPanelAlert";

const meta = {
	title: "Features/Scheduling/RosterCellPanel/CellPanelAlert",
	component: CellPanelAlert,
	args: {
		children: "Someone changed this roster since you opened it. Reload it.",
	},
} satisfies Meta<typeof CellPanelAlert>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A change or leave move that didn't go through. */
export const Default: Story = {};
