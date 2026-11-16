import type { Meta, StoryObj } from "@storybook/react-vite";
import { I18nextProvider } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { authTestI18n } from "@/features/auth/testingI18n";
import { PreferredShiftsCell } from "@/features/shiftPreferences/PreferredShiftsCell";

const meta = {
	title: "Features/ShiftPreferences/PreferredShiftsCell",
	component: PreferredShiftsCell,
	parameters: { layout: "centered" },
	args: { names: ["Morning", "Late"] },
	decorators: [
		(Story): NonNullable<FunctionComponent> => (
			<I18nextProvider i18n={authTestI18n}>
				<div className="w-28">
					<Story />
				</div>
			</I18nextProvider>
		),
	],
} satisfies Meta<typeof PreferredShiftsCell>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Read-only, as the team list shows a member's day. */
export const TwoShifts: Story = {};

export const NoPreference: Story = { args: { names: [] } };

/** The caller's own open day: the whole cell is one button. */
export const Editable: Story = {
	args: {
		onEdit: (): void => {},
		editLabel: "Choose shifts for Mon 23 Nov",
	},
};
