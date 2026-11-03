import { useId } from "react";
import { Controller, type Control } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { DaysMultiSelect } from "@/components/forms/DaysMultiSelect";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { TimeSelect } from "@/components/forms/TimeSelect";
import { Button } from "@/components/ui/Button";
import { DeleteIcon } from "@/components/ui/Icon";
import type { AvailabilityFormValues } from "@/features/availability/AvailabilityDialog/schema";

export type WindowRowProps = {
	control: Control<AvailabilityFormValues>;
	/** The row's place in the form, from 0. */
	index: number;
	/** Why the row can't be saved, shown under it. */
	error?: string;
	disabled?: boolean;
	onRemove: () => void;
};

const key = "availability.dialog";

/**
 * One window of the availability editor: the days it applies to, when it
 * starts and when it ends, each time on the half hour, and a button to
 * remove it. An end at or before the start runs past midnight.
 */
export const WindowRow = ({
	control,
	index,
	error,
	disabled = false,
	onRemove,
}: WindowRowProps): FunctionComponent => {
	const { t } = useTranslation();
	const rowId = useId();
	const errorId = `${rowId}-error`;
	const fieldId = (name: string): string => `${rowId}-${name}`;
	const number = index + 1;
	const shared = {
		"aria-describedby": error ? errorId : undefined,
		"aria-invalid": error ? true : undefined,
		className: "w-full",
		disabled,
		placeholder: t(`${key}.pleaseSelect`),
		status: error ? ("error" as const) : undefined,
	};
	return (
		<fieldset className="flex flex-col gap-2">
			<legend className="sr-only">{t(`${key}.window`, { number })}</legend>
			<div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_8rem_auto] sm:items-end">
				<FormRow
					htmlFor={fieldId("days")}
					label={t(`${key}.days`)}
					layout="stacked"
				>
					<Controller
						control={control}
						name={`rows.${index}.days`}
						render={({ field }) => (
							<DaysMultiSelect
								ref={field.ref}
								{...shared}
								aria-labelledby={formRowIds(fieldId("days")).labelId}
								name={field.name}
								selectAllLabel={t(`${key}.selectAll`)}
								value={field.value}
								onChange={field.onChange}
							/>
						)}
					/>
				</FormRow>
				{(["startTime", "endTime"] as const).map((name) => (
					<FormRow
						key={name}
						htmlFor={fieldId(name)}
						label={t(`${key}.${name}`)}
						layout="stacked"
					>
						<Controller
							control={control}
							name={`rows.${index}.${name}`}
							render={({ field }) => (
								<TimeSelect
									ref={field.ref}
									{...shared}
									aria-labelledby={formRowIds(fieldId(name)).labelId}
									name={field.name}
									value={field.value}
									onChange={field.onChange}
								/>
							)}
						/>
					</FormRow>
				))}
				<Button
					aria-label={t(`${key}.remove`, { number })}
					disabled={disabled}
					variant="icon"
					onClick={onRemove}
				>
					<DeleteIcon className="text-error-600" />
				</Button>
			</div>
			{error && (
				<p className="text-sm text-error-700" id={errorId}>
					{error}
				</p>
			)}
		</fieldset>
	);
};
