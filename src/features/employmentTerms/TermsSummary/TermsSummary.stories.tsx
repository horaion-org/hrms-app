import type { Meta, StoryObj } from "@storybook/react-vite";
import i18n from "i18next";
import {
	FIVE_DAY_WEEK,
	REFERENCE,
	SIX_DAY_SHIFT,
} from "@/features/employmentTerms/fixtures";
import { termsFormValuesOf } from "@/features/employmentTerms/termsForm";
import { readBackOf } from "@/features/employmentTerms/termsReadBack";
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
	},
} satisfies Meta<typeof TermsSummary>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FiveDayWeek: Story = {};

export const ShiftWork: Story = {
	args: { readBack: readBackFor(termsFormValuesOf(SIX_DAY_SHIFT)) },
};

export const Unfinished: Story = {
	args: {
		readBack: readBackFor({
			...termsFormValuesOf(FIVE_DAY_WEEK),
			weekHours: "",
		}),
	},
};
