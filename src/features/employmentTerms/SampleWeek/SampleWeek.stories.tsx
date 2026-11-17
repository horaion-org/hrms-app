import type { Meta, StoryObj } from "@storybook/react-vite";
import { sampleWeek } from "@/features/employmentTerms/sampleWeek";
import { SampleWeek } from "@/features/employmentTerms/SampleWeek";
import "@/common/i18n";

const meta = {
	title: "Features/EmploymentTerms/SampleWeek",
	component: SampleWeek,
	parameters: { layout: "padded" },
	args: {
		className: "max-w-88",
		week: sampleWeek({
			daysPerWeek: 5,
			weekMinutes: 2640,
			dayMinutes: 528,
			restDay: "SUN",
			partTime: false,
		}),
	},
} satisfies Meta<typeof SampleWeek>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FiveDaysSundayRest: Story = {};

export const FiveAndAHalfDays: Story = {
	args: {
		week: sampleWeek({
			daysPerWeek: 5.5,
			weekMinutes: 2640,
			dayMinutes: 480,
			restDay: "SUN",
			partTime: false,
		}),
	},
};

export const SixDaysRosterPicksTheRestDay: Story = {
	args: {
		week: sampleWeek({
			daysPerWeek: 6,
			weekMinutes: 2640,
			dayMinutes: 440,
			restDay: "ROSTERED",
			partTime: false,
		}),
	},
};

export const PartTimeDaysVary: Story = {
	args: {
		week: sampleWeek({
			daysPerWeek: null,
			weekMinutes: 1200,
			dayMinutes: null,
			restDay: "ROSTERED",
			partTime: true,
		}),
	},
};
