import type { UseFormRegisterReturn } from "react-hook-form";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Input } from "@/components/forms/Input";

export type UnitNameFieldProps = {
	id: string;
	label: string;
	placeholder: string;
	/** The allowed length and characters. */
	hint: string;
	/** The visual "n/100" count. */
	counter: string;
	error?: string;
	disabled?: boolean;
	/** Takes initial focus when the Dialog opens. */
	autoFocus?: boolean;
	registration: UseFormRegisterReturn;
};

/** A required, stacked name field limited to 100 characters. */
export const UnitNameField = ({
	id,
	label,
	placeholder,
	hint,
	counter,
	error,
	disabled = false,
	autoFocus = false,
	registration,
}: UnitNameFieldProps): FunctionComponent => {
	const ids = formRowIds(id);
	return (
		<FormRow
			required
			counter={counter}
			error={error}
			hint={hint}
			htmlFor={id}
			label={label}
			layout="stacked"
		>
			<Input
				required
				aria-describedby={error ? ids.errorId : ids.hintId}
				aria-invalid={Boolean(error)}
				aria-label={label}
				className="w-full"
				data-autofocus={autoFocus || undefined}
				disabled={disabled}
				id={id}
				maxLength={100}
				placeholder={placeholder}
				status={error ? "error" : undefined}
				{...registration}
			/>
		</FormRow>
	);
};
