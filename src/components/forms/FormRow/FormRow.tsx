import type { ComponentPropsWithRef, ReactNode } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { formRowIds } from "@/components/forms/FormRow/FormRow.utils";

export type FormRowProps = Omit<ComponentPropsWithRef<"div">, "children"> & {
	/** The id of the control in this row; the label points at it. */
	htmlFor: string;
	label: ReactNode;
	/** Shown under the control and announced; see `formRowIds` for wiring. */
	error?: string;
	/** The control, sized to fill the field column (e.g. `className="w-full"`). */
	children: ReactNode;
};

/** A label on the left and its field on the right; stacked below `sm`. */
export const FormRow = ({
	htmlFor,
	label,
	error,
	children,
	className,
	...rest
}: FormRowProps): FunctionComponent => {
	const { labelId, errorId } = formRowIds(htmlFor);
	return (
		<div
			className={joinClassNames(
				"flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6",
				className
			)}
			{...rest}
		>
			<label
				className="text-base font-bold text-neutral-800"
				htmlFor={htmlFor}
				id={labelId}
			>
				{label}
			</label>
			<div className="flex w-full min-w-0 flex-col gap-2 sm:w-95 sm:shrink-0">
				{children}
				{error && (
					<p className="text-sm text-error-700" id={errorId} role="alert">
						{error}
					</p>
				)}
			</div>
		</div>
	);
};
