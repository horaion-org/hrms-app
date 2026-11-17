import type { UseFormRegisterReturn } from "react-hook-form";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Input } from "@/components/forms/Input";

export type RateFieldProps = {
	/** The input's id; the label, hint, error and unit ids are made from it. */
	id: string;
	/** The start of the sentence, such as "An overtime hour is paid at". */
	label: string;
	/** The end of the sentence, such as "times a normal hour". */
	unit: string;
	hint?: string;
	error?: string;
	disabled?: boolean;
	/** The field's react-hook-form registration. */
	registration: UseFormRegisterReturn;
};

/**
 * A rate read as a sentence: the label, then the figure in a short box with
 * its unit as plain text beside it. The unit sits outside the box so it never
 * squeezes the figure, and it is part of the input's name for a screen reader.
 */
export const RateField = ({
	id,
	label,
	unit,
	hint,
	error,
	disabled = false,
	registration,
}: RateFieldProps): FunctionComponent => {
	const { labelId, hintId, errorId } = formRowIds(id);
	const unitId = `${id}-unit`;
	return (
		<FormRow
			error={error}
			hint={hint}
			htmlFor={id}
			label={label}
			layout="stacked"
		>
			<div className="flex items-center gap-3">
				<Input
					aria-describedby={error ? errorId : hint ? hintId : undefined}
					aria-invalid={Boolean(error)}
					aria-labelledby={`${labelId} ${unitId}`}
					className="w-24 shrink-0"
					disabled={disabled}
					id={id}
					inputMode="decimal"
					status={error ? "error" : undefined}
					{...registration}
				/>
				<span className="text-sm text-neutral-800" id={unitId}>
					{unit}
				</span>
			</div>
		</FormRow>
	);
};
