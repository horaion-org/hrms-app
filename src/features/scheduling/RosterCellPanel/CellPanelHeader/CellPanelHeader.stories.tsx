import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { authTestI18n } from "@/features/auth/testingI18n";
import { CellPanelHeader } from "./CellPanelHeader";

const meta = {
	title: "Features/Scheduling/RosterCellPanel/CellPanelHeader",
	component: CellPanelHeader,
	decorators: [
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<div className="max-w-96 rounded-lg border border-neutral-400">
					<Story />
				</div>
			</I18nextProvider>
		),
	],
	args: {
		titleId: "cell-panel-title",
		title: "Aisha Rahman · Mon 12 Oct",
		focusKey: "a-1",
		onClose: fn(),
	},
} satisfies Meta<typeof CellPanelHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The chosen day's title, with the close button. */
export const Default: Story = {};
