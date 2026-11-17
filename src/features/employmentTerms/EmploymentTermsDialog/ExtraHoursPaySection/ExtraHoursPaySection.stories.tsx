import type { Meta, StoryObj } from "@storybook/react-vite";
import { useForm, useWatch } from "react-hook-form";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import type { TermsOverviewItem } from "@/features/employmentTerms/api";
import {
	FIVE_DAY_WEEK,
	PART_TIME_20,
	PART_TIME_BELOW_MINUTES,
	TERMS_PRESETS,
} from "@/features/employmentTerms/fixtures";
import {
	termsFormValuesOf,
	typedWeekOf,
	type TermsFormValues,
} from "@/features/employmentTerms/termsForm";
import { ExtraHoursPaySection } from "./ExtraHoursPaySection";
import "@/common/i18n";

/** The section on its own form, holding the given terms. */
const SectionOn = ({
	terms,
}: {
	terms: TermsOverviewItem;
}): FunctionComponent => {
	const form = useForm<TermsFormValues>({
		defaultValues: termsFormValuesOf(terms),
	});
	const values = useWatch({ control: form.control }) as TermsFormValues;
	return (
		<div className="max-w-150">
			<ExtraHoursPaySection
				disabled={false}
				form={form}
				idOf={(field) => `terms-${field}`}
				presets={TERMS_PRESETS}
				values={values}
				week={typedWeekOf(values, PART_TIME_BELOW_MINUTES)}
				onAnswer={fn()}
			/>
		</div>
	);
};

const meta = {
	title: "Features/EmploymentTerms/EmploymentTermsDialog/ExtraHoursPaySection",
	component: SectionOn,
	parameters: { layout: "padded" },
	args: { terms: FIVE_DAY_WEEK },
} satisfies Meta<typeof SectionOn>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Under the Act's hour rules: the legal minimum and the rest-day rate. */
export const Covered: Story = {};

/** Outside the Act, paid at a rate: the choice, then the rates. */
export const NotCoveredPaidAtRate: Story = {
	args: {
		terms: { ...FIVE_DAY_WEEK, hoursLimitsApply: false, extraHoursPaidAs: "RATE" },
	},
};

/** A part-time week: no rest-day rate, the part-time overtime rule said. */
export const PartTime: Story = { args: { terms: PART_TIME_20 } };
