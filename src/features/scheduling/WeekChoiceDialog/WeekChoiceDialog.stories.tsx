import type { Meta, StoryObj } from "@storybook/react-vite";
import { I18nextProvider } from "react-i18next";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	COMPANY_CONSTRAINT_FIXTURES,
	CONSTRAINT_FIXTURES,
} from "@/features/scheduling/constraints/fixtures";
import { SHIFT_FIXTURES } from "@/features/scheduling/shifts/fixtures";
import { WeekChoiceDialog } from "@/features/scheduling/WeekChoiceDialog";
import { allOf } from "@/features/scheduling/weekChoice";

const CONSTRAINTS = [...COMPANY_CONSTRAINT_FIXTURES, ...CONSTRAINT_FIXTURES];

const meta = {
	title: "Features/Scheduling/WeekChoiceDialog",
	component: WeekChoiceDialog,
	args: {
		periodLabel: "Nov 16 – 22, 2026",
		departmentName: "Front Office",
		shifts: SHIFT_FIXTURES,
		constraints: CONSTRAINTS,
		value: allOf(SHIFT_FIXTURES, CONSTRAINTS),
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
} satisfies Meta<typeof WeekChoiceDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const EverythingChosen: Story = {};

export const ShiftsLeftOut: Story = {
	args: {
		value: {
			shiftIds: ["front-desk-am", "lunch-rush"],
			constraintIds: ["company-rest", "lunch-stand-ins", "rest-between-shifts"],
		},
	},
};

export const Generated: Story = { args: { readOnly: true } };
