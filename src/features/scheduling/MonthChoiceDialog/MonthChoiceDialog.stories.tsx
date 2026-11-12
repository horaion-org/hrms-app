import type { Meta, StoryObj } from "@storybook/react-vite";
import { I18nextProvider } from "react-i18next";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	COMPANY_CONSTRAINT_FIXTURES,
	CONSTRAINT_FIXTURES,
} from "@/features/scheduling/constraints/fixtures";
import { MonthChoiceDialog } from "@/features/scheduling/MonthChoiceDialog";
import { SHIFT_FIXTURES } from "@/features/scheduling/shifts/fixtures";
import { allOf } from "@/features/scheduling/weekChoice";

const CONSTRAINTS = [...COMPANY_CONSTRAINT_FIXTURES, ...CONSTRAINT_FIXTURES];
const EVERYTHING = allOf(SHIFT_FIXTURES, CONSTRAINTS);
const WEEKS = [
	{ periodStart: "2026-11-02", label: "Nov 2 – 8" },
	{ periodStart: "2026-11-09", label: "Nov 9 – 15" },
	{ periodStart: "2026-11-16", label: "Nov 16 – 22" },
	{ periodStart: "2026-11-23", label: "Nov 23 – 29" },
	{ periodStart: "2026-11-30", label: "Nov 30 – Dec 6" },
];
const allTicked = Object.fromEntries(
	WEEKS.map((week) => [week.periodStart, EVERYTHING])
);

const meta = {
	title: "Features/Scheduling/MonthChoiceDialog",
	component: MonthChoiceDialog,
	args: {
		monthName: "November",
		weeks: WEEKS,
		shifts: SHIFT_FIXTURES,
		constraints: CONSTRAINTS,
		value: allTicked,
		onApply: fn(),
		onClose: fn(),
	},
	decorators: [
		(Story): NonNullable<FunctionComponent> => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
} satisfies Meta<typeof MonthChoiceDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FiveWeeksAllTicked: Story = {};
export const OneWeekLeavesTwoOut: Story = {
	args: {
		value: {
			...allTicked,
			"2026-11-09": {
				...EVERYTHING,
				shiftIds: EVERYTHING.shiftIds.slice(1),
				constraintIds: EVERYTHING.constraintIds.slice(1),
			},
		},
	},
};
export const AWeekRostersNobody: Story = {
	args: {
		value: {
			...allTicked,
			"2026-11-16": { shiftIds: [], constraintIds: [] },
		},
	},
};
