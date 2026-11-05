import type { Meta, StoryObj } from "@storybook/react-vite";
import { EmploymentTermsField } from "@/features/employmentTerms/EmploymentTermsField";
import {
	FIVE_DAY_WEEK,
	SIX_DAY_SHIFT,
	STANDARD_WEEK,
} from "@/features/employmentTerms/fixtures";
import "@/common/i18n";

const meta = {
	title: "Features/EmploymentTerms/EmploymentTermsField",
	component: EmploymentTermsField,
	parameters: { layout: "padded" },
	args: {
		terms: [STANDARD_WEEK, FIVE_DAY_WEEK, SIX_DAY_SHIFT],
		value: STANDARD_WEEK.id,
		onChange: (): void => {},
	},
} satisfies Meta<typeof EmploymentTermsField>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Add employee's row, starting on the Default. */
export const OnDefault: Story = {};

export const FiveDayWeek: Story = {
	args: { value: FIVE_DAY_WEEK.id },
};
