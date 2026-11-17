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
import { WorkingWeekSection } from "./WorkingWeekSection";
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
			<WorkingWeekSection
				disabled={false}
				form={form}
				idOf={(field) => `terms-${field}`}
				partTimeBelowMinutes={PART_TIME_BELOW_MINUTES}
				values={values}
				week={typedWeekOf(values, PART_TIME_BELOW_MINUTES)}
				startFrom={{
					presets: TERMS_PRESETS.presets,
					failed: false,
					startedFrom: undefined,
					onStartFrom: fn(),
				}}
				onAnswer={fn()}
				onNameTyped={fn()}
			/>
		</div>
	);
};

const meta = {
	title: "Features/EmploymentTerms/EmploymentTermsDialog/WorkingWeekSection",
	component: SectionOn,
	parameters: { layout: "padded" },
	args: { terms: FIVE_DAY_WEEK },
} satisfies Meta<typeof SectionOn>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Five days of 44 h, rest day Sunday. */
export const FiveDayWeek: Story = {};

/** A part-time week: no rest day is asked. */
export const PartTime: Story = { args: { terms: PART_TIME_20 } };
