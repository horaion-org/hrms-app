import type { FunctionComponent } from "@/common/types";
import { timeSteps } from "@/common/timeOfDay";
import {
	Select,
	type SelectOption,
	type SelectProps,
} from "@/components/forms/Select";

/** A single-choice Select's props, less the options it fills in itself. */
export type TimeSelectProps = Omit<
	Extract<SelectProps, { multiple?: false }>,
	"options" | "multiple"
>;

const TIME_OPTIONS: Array<SelectOption> = timeSteps().map((time) => ({
	value: time,
	label: time,
}));

/**
 * A time of day chosen from every half hour, "00:00" to "23:30", as shifts
 * and availability take them. Its value is the "HH:mm" time.
 */
export const TimeSelect = (props: TimeSelectProps): FunctionComponent => (
	<Select {...props} options={TIME_OPTIONS} />
);
