import type { Meta, StoryObj } from "@storybook/react-vite";
import {
	FIVE_DAY_WEEK,
	PART_TIME_20,
	REFERENCE,
	SIX_DAY_SHIFT,
} from "@/features/employmentTerms/fixtures";
import { TermsSummary } from "@/features/employmentTerms/TermsSummary";
import "@/common/i18n";

const meta = {
	title: "Features/EmploymentTerms/TermsSummary",
	component: TermsSummary,
	parameters: { layout: "padded" },
	args: {
		className: "max-w-138",
		fields: FIVE_DAY_WEEK,
		reference: REFERENCE,
	},
} satisfies Meta<typeof TermsSummary>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FiveDayWeek: Story = {};

export const ShiftWork: Story = { args: { fields: SIX_DAY_SHIFT } };

export const PartTime: Story = { args: { fields: PART_TIME_20 } };

export const WithMostHoursAWeek: Story = {
	args: { fields: { ...SIX_DAY_SHIFT, mostWeekMinutes: 4320 } },
};

export const Incomplete: Story = { args: { fields: undefined } };
