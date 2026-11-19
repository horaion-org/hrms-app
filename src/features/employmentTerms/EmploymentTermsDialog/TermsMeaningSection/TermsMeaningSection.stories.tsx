import type { Meta, StoryObj } from "@storybook/react-vite";
import {
	FIVE_DAY_WEEK,
	PART_TIME_20,
	REFERENCE,
} from "@/features/employmentTerms/fixtures";
import { termsFormValuesOf } from "@/features/employmentTerms/termsForm";
import { TermsMeaningSection } from "./TermsMeaningSection";
import "@/common/i18n";

const meta = {
	title: "Features/EmploymentTerms/EmploymentTermsDialog/TermsMeaningSection",
	component: TermsMeaningSection,
	parameters: { layout: "padded" },
	args: {
		className: "max-w-88",
		partTime: false,
		reference: REFERENCE,
		values: termsFormValuesOf(FIVE_DAY_WEEK),
	},
} satisfies Meta<typeof TermsMeaningSection>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Five days, 44 h, rest day Sunday. */
export const FiveDayWeek: Story = {};

/** A part-time week: no rest day, hours that vary. */
export const PartTime: Story = {
	args: { partTime: true, values: termsFormValuesOf(PART_TIME_20) },
};
