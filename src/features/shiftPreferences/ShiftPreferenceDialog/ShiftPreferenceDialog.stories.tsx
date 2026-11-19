import type { Meta, StoryObj } from "@storybook/react-vite";
import { I18nextProvider } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { authTestI18n } from "@/features/auth/testingI18n";
import { MONDAY_WITH_MORNING } from "@/features/shiftPreferences/fixtures";
import { ShiftPreferenceDialog } from "@/features/shiftPreferences/ShiftPreferenceDialog";

const meta = {
	title: "Features/ShiftPreferences/ShiftPreferenceDialog",
	component: ShiftPreferenceDialog,
	args: {
		day: MONDAY_WITH_MORNING,
		dayLabel: "Mon 23 Nov",
		maxShifts: 5,
		noShiftsNote: "No shift that day needs your job title.",
		saving: false,
		onSave: (): void => {},
		onClose: (): void => {},
	},
	decorators: [
		(Story): NonNullable<FunctionComponent> => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
} satisfies Meta<typeof ShiftPreferenceDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const OneChosen: Story = {};

/** The day's limit is reached, so the shift not chosen cannot be ticked. */
export const AtTheLimit: Story = { args: { maxShifts: 1 } };

export const NoShiftsThatDay: Story = {
	args: { day: { ...MONDAY_WITH_MORNING, shifts: [] } },
};

export const Saving: Story = { args: { saving: true } };

export const Refused: Story = {
	args: { refusal: "This day can no longer be changed." },
};
