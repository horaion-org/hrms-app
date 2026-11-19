import type { Meta, StoryObj } from "@storybook/react-vite";
import i18n from "i18next";
import {
	FIVE_DAY_WEEK,
	REFERENCE,
	PART_TIME_20,
} from "@/features/employmentTerms/fixtures";
import { sampleWeek } from "@/features/employmentTerms/sampleWeek";
import { termsFormValuesOf } from "@/features/employmentTerms/termsForm";
import {
	readBackOf,
	termsEffects,
	termsExample,
} from "@/features/employmentTerms/termsReadBack";
import { TermsSummary } from "@/features/employmentTerms/TermsSummary";
import "@/common/i18n";

const t = i18n.getFixedT("en");

/** The read-back of fixture terms, as the form builds it. */
const readBackFor = (
	values: ReturnType<typeof termsFormValuesOf>
): ReturnType<typeof readBackOf> => readBackOf(values, REFERENCE, t, "en");

const meta = {
	title: "Features/EmploymentTerms/TermsSummary",
	component: TermsSummary,
	parameters: { layout: "padded" },
	args: {
		className: "max-w-138 px-4",
		readBack: readBackFor(termsFormValuesOf(FIVE_DAY_WEEK)),
		sampleWeek: sampleWeek({
			daysPerWeek: 5,
			weekMinutes: 2640,
			dayMinutes: 528,
			restDay: "SUN",
			partTime: false,
		}),
		example: termsExample(FIVE_DAY_WEEK, REFERENCE, t),
		effects: termsEffects(FIVE_DAY_WEEK, REFERENCE, t),
	},
} satisfies Meta<typeof TermsSummary>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FiveDayWeek: Story = {};

export const PartTime: Story = {
	args: {
		readBack: readBackFor(termsFormValuesOf(PART_TIME_20)),
		sampleWeek: sampleWeek({
			daysPerWeek: null,
			weekMinutes: 1200,
			dayMinutes: null,
			restDay: "ROSTERED",
			partTime: true,
		}),
		example: termsExample(PART_TIME_20, REFERENCE, t),
		effects: termsEffects(PART_TIME_20, REFERENCE, t),
	},
};

export const Unfinished: Story = {
	args: {
		readBack: readBackFor({
			...termsFormValuesOf(FIVE_DAY_WEEK),
			weekHours: "",
		}),
	},
};
