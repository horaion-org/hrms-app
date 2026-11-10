import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { authTestI18n } from "@/features/auth/testingI18n";
import { BEFORE_DEADLINE } from "@/features/scheduling/coverOffers/fixtures";
import { CellPanelFooter } from "./CellPanelFooter";

const meta = {
	title: "Features/Scheduling/RosterCellPanel/CellPanelFooter",
	component: CellPanelFooter,
	decorators: [
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<div className="max-w-96 p-6">
					<Story />
				</div>
			</I18nextProvider>
		),
	],
	args: {
		applyLabel: "Apply change",
		applyDisabled: false,
		busy: false,
		onApply: fn(),
		onCancel: fn(),
	},
} satisfies Meta<typeof CellPanelFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Ready to apply. */
export const Ready: Story = {};

/** The review still asks for a tick or a remark. */
export const Waiting: Story = { args: { applyDisabled: true } };

/** The change is on its way. */
export const Busy: Story = { args: { busy: true } };

/** On a published roster, a change that adds or moves work asks the member instead. */
export const AsksTheMember: Story = {
	args: {
		offerActions: {
			name: "Ben Ong",
			timeZone: "Asia/Singapore",
			ready: true,
			onSend: fn(),
			onRecord: fn(),
			now: (): Date => BEFORE_DEADLINE,
		},
	},
};
