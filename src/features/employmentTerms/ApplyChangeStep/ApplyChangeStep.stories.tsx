import type { Meta, StoryObj } from "@storybook/react-vite";
import { ApplyChangeStep } from "@/features/employmentTerms/ApplyChangeStep";
import { SIX_DAY_SHIFT } from "@/features/employmentTerms/fixtures";
import "@/common/i18n";

const meta = {
	title: "Features/EmploymentTerms/ApplyChangeStep",
	component: ApplyChangeStep,
	args: {
		currentName: SIX_DAY_SHIFT.name,
		peopleCount: 43,
		next: { ...SIX_DAY_SHIFT, weekMinutes: 2520 },
		saving: false,
		onBack: (): void => {},
		onApply: (): void => {},
		onClose: (): void => {},
	},
} satisfies Meta<typeof ApplyChangeStep>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Opened from Save changes: "Correct it for everyone" is chosen. */
export const Correct: Story = {};

/** Opened from the row's "Change from a date…". */
export const FromDate: Story = { args: { preferFromDate: true } };
