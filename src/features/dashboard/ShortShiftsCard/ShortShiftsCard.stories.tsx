import type { Meta, StoryObj } from "@storybook/react-vite";
import { withMemoryRouter } from "@/components/utils/MemoryRouterHarness";
import {
	shortageFixture,
	staffingRuleFixture,
} from "@/features/dashboard/fixtures";
import { ShortShiftsCard } from "@/features/dashboard/ShortShiftsCard";
import "@/common/i18n";

const meta = {
	title: "Features/Dashboard/ShortShiftsCard",
	component: ShortShiftsCard,
	decorators: [withMemoryRouter],
	args: {
		className: "max-w-xl",
		shortShifts: {
			status: "ready",
			data: {
				unstaffable: [{ rule: staffingRuleFixture(), shortShifts: 14 }],
				gaps: [
					shortageFixture(),
					shortageFixture({
						shiftId: "fs-pm",
						shiftName: "Evening",
						startTime: "15:00",
						endTime: "23:00",
						day: "2026-11-19",
						shortBy: 2,
					}),
				],
			},
		},
	},
} satisfies Meta<typeof ShortShiftsCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Failed: Story = { args: { shortShifts: { status: "error" } } };
