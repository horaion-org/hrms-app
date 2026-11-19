import type { Meta, StoryObj } from "@storybook/react-vite";
import { timeOffBalanceFixture } from "@/features/employmentTerms/fixtures";
import { TimeOffEarnedRow } from "@/features/employmentTerms/TimeOffEarnedRow";
import "@/common/i18n";

const meta = {
	title: "Features/EmploymentTerms/TimeOffEarnedRow",
	component: TimeOffEarnedRow,
	parameters: { layout: "padded" },
	args: { balance: timeOffBalanceFixture(), displayName: "Mei Tan" },
} satisfies Meta<typeof TimeOffEarnedRow>;

export default meta;

type Story = StoryObj<typeof meta>;

/** 4 h left: 8 h earned the week of 16 Nov, a half day of Off in lieu taken; History lists both. */
export const WithBalance: Story = {};

/** Time off terms with nothing earned yet: the balance, without History. */
export const NothingYet: Story = {
	args: { balance: timeOffBalanceFixture({ balanceMinutes: 0, entries: [] }) },
};
