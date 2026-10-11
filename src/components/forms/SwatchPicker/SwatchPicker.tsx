import { useId, type KeyboardEvent } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import type { InputStatus } from "@/components/forms/Input";

export type SwatchOption = {
	/** The colour, as it is reported, e.g. `#D4683F`. */
	value: string;
	/** The colour's name, for assistive technology. */
	label: string;
};

export type SwatchPickerProps = {
	options: Array<SwatchOption>;
	/** The chosen colour; undefined or unknown leaves nothing chosen. */
	value?: string;
	onChange?: (value: string) => void;
	name?: string;
	status?: InputStatus;
	disabled?: boolean;
	id?: string;
	className?: string;
	"aria-label"?: string;
	"aria-labelledby"?: string;
	"aria-describedby"?: string;
};

const statusRingClasses: Record<InputStatus, string> = {
	success: "ring-success-600",
	error: "ring-error-600",
};

/**
 * One colour from a fixed set, shown as swatches. A radio group: Tab reaches
 * the chosen swatch (or the first), the arrow keys move and choose.
 */
export const SwatchPicker = ({
	options,
	value,
	onChange,
	name,
	status,
	disabled = false,
	id,
	className,
	"aria-label": ariaLabel,
	"aria-labelledby": ariaLabelledby,
	"aria-describedby": ariaDescribedby,
}: SwatchPickerProps): FunctionComponent => {
	const generatedId = useId();
	const groupId = id ?? generatedId;
	const chosen = options.findIndex((option) => option.value === value);
	const focusable = chosen === -1 ? 0 : chosen;
	const choose = (index: number): void => {
		const option = options[index];
		if (option) onChange?.(option.value);
	};
	const onKeyDown = (
		event: KeyboardEvent<HTMLButtonElement>,
		index: number
	): void => {
		const step =
			event.key === "ArrowRight" || event.key === "ArrowDown"
				? 1
				: event.key === "ArrowLeft" || event.key === "ArrowUp"
					? -1
					: 0;
		if (step === 0 || options.length === 0) return;
		event.preventDefault();
		const next = (index + step + options.length) % options.length;
		choose(next);
		event.currentTarget.parentElement
			?.querySelectorAll<HTMLButtonElement>("[role=radio]")
			[next]?.focus();
	};

	return (
		<div
			aria-describedby={ariaDescribedby}
			aria-disabled={disabled || undefined}
			aria-label={ariaLabel}
			aria-labelledby={ariaLabelledby}
			id={groupId}
			role="radiogroup"
			className={joinClassNames(
				"flex flex-wrap gap-3 rounded-lg",
				status && `ring-1 ring-offset-4 ${statusRingClasses[status]}`,
				className
			)}
		>
			{name && value !== undefined && (
				<input name={name} type="hidden" value={value} />
			)}
			{options.map((option, index) => {
				const selected = index === chosen;
				return (
					<button
						key={option.value}
						aria-checked={selected}
						aria-label={option.label}
						disabled={disabled}
						role="radio"
						style={{ backgroundColor: option.value }}
						tabIndex={index === focusable ? 0 : -1}
						type="button"
						className={joinClassNames(
							"size-14 rounded-lg transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-blue-500 disabled:cursor-not-allowed disabled:opacity-50",
							selected && "ring-2 ring-neutral-900 ring-offset-2"
						)}
						onClick={() => {
							choose(index);
						}}
						onKeyDown={(event) => {
							onKeyDown(event, index);
						}}
					/>
				);
			})}
		</div>
	);
};
