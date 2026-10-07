import type { ComponentPropsWithRef, ReactNode } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { formRowIds } from "@/components/forms/FormRow/FormRow.utils";
import { WarningIcon } from "@/components/ui/Icon";

export type FormRowProps = Omit<ComponentPropsWithRef<"div">, "children"> & {
	/** The id of the control in this row; the label points at it. */
	htmlFor: string;
	label: ReactNode;
	/** Inline keeps the existing responsive settings layout. */
	layout?: "inline" | "stacked";
	/** Decorative marker; also set required / aria-required on the control. */
	required?: boolean;
	/** Shown under the control and announced; see `formRowIds` for wiring. */
	error?: string;
	/** Shown beneath the control; use `formRowIds(...).hintId` for described-by. */
	hint?: ReactNode;
	/** Visual count only; convey its limit in the hint and on the control. */
	counter?: ReactNode;
	/** The control, sized to fill the field column (e.g. `className="w-full"`). */
	children: ReactNode;
	/**
	 * The inline field column's width from `sm` up, e.g. `sm:w-1/2` so labels
	 * fit beside fields in a half-width card; 380px when left out.
	 */
	fieldWidth?: string;
};

/** A labelled field with optional supporting text; inline by default. */
export const FormRow = ({
	htmlFor,
	label,
	layout = "inline",
	required = false,
	error,
	hint,
	counter,
	children,
	fieldWidth = "sm:w-95",
	className,
	...rest
}: FormRowProps): FunctionComponent => {
	const { labelId, hintId, errorId } = formRowIds(htmlFor);
	return (
		<div
			className={joinClassNames(
				"flex flex-col gap-2",
				layout === "inline" &&
					"sm:flex-row sm:items-center sm:justify-between sm:gap-6",
				className
			)}
			{...rest}
		>
			<label
				htmlFor={htmlFor}
				id={labelId}
				className={joinClassNames(
					"font-bold text-neutral-800",
					layout === "stacked" ? "text-sm" : "text-base"
				)}
			>
				{label}
				{required && (
					<span aria-hidden="true" className="ml-1 text-error-700">
						*
					</span>
				)}
			</label>
			<div
				className={joinClassNames(
					"flex w-full min-w-0 flex-col gap-2",
					layout === "inline" && `${fieldWidth} sm:shrink-0`
				)}
			>
				{children}
				{(error || hint != null || counter != null) && (
					<div
						className={joinClassNames(
							"flex items-start justify-between gap-4",
							layout === "stacked" ? "text-xs" : "text-sm"
						)}
					>
						{!error && hint != null && (
							<div className="min-w-0 text-neutral-600" id={hintId}>
								{hint}
							</div>
						)}
						{error && (
							<p
								className="flex min-w-0 items-start gap-1.5 text-error-700"
								id={errorId}
								role="alert"
							>
								<WarningIcon
									className={joinClassNames(
										"size-4 shrink-0",
										layout === "inline" && "mt-0.5"
									)}
								/>
								<span>{error}</span>
							</p>
						)}
						{counter != null && (
							<span
								aria-hidden="true"
								className="ml-auto shrink-0 text-neutral-500"
							>
								{counter}
							</span>
						)}
					</div>
				)}
			</div>
		</div>
	);
};
