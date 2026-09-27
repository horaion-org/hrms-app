import { useId, type ReactNode } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";

/** What a FormField hands its control so the label, hint and error reach it. */
export type FormFieldControlProps = {
	id: string;
	"aria-describedby": string | undefined;
	status: "error" | undefined;
};

export type FormFieldProps = {
	label: string;
	/** Guidance shown under the control until there is an error to show. */
	hint?: string;
	/** Replaces the hint and marks the control as invalid. */
	error?: string;
	className?: string;
	children: (control: FormFieldControlProps) => ReactNode;
};

/**
 * Stacks a visible label, the control, and a hint or error message, and wires
 * them together by id. The control is a render prop so any control that takes
 * `id`, `aria-describedby` and `status` (such as Input) fits.
 */
export const FormField = ({
	label,
	hint,
	error,
	className,
	children,
}: FormFieldProps): FunctionComponent => {
	const id = useId();
	const messageId = `${id}-message`;
	const hasError = error !== undefined && error !== "";
	const message = hasError ? error : hint;

	return (
		<div className={joinClassNames("flex flex-col gap-1.5", className)}>
			<label className="text-sm font-medium text-neutral-900" htmlFor={id}>
				{label}
			</label>
			{children({
				id,
				"aria-describedby": message === undefined ? undefined : messageId,
				status: hasError ? "error" : undefined,
			})}
			{message === undefined ? null : (
				<p
					id={messageId}
					className={joinClassNames(
						"text-sm",
						hasError ? "text-error-600" : "text-neutral-700"
					)}
				>
					{message}
				</p>
			)}
		</div>
	);
};
