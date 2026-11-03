import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { isWeekday, WEEKDAYS, type Weekday } from "@/common/weekdays";
import { Select, type SelectProps } from "@/components/forms/Select";

/** A multiple-choice Select's props, with days in place of free values. */
export type DaysMultiSelectProps = Omit<
	Extract<SelectProps, { multiple: true }>,
	"options" | "multiple" | "value" | "defaultValue" | "onChange"
> & {
	value?: Array<Weekday>;
	onChange?: (days: Array<Weekday>) => void;
};

/**
 * Days of the week, Monday first, any number of them chosen. The days are
 * reported in week order whatever order they were picked in.
 */
export const DaysMultiSelect = ({
	value,
	onChange,
	...props
}: DaysMultiSelectProps): FunctionComponent => {
	const { t } = useTranslation();
	const options = WEEKDAYS.map((day) => ({
		value: day,
		label: t(`weekdays.${day}`),
	}));
	return (
		<Select
			{...props}
			multiple
			options={options}
			value={value}
			onChange={(days) => onChange?.(days.filter(isWeekday))}
		/>
	);
};
