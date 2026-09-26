import type { ComponentPropsWithRef, ReactNode } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import type { InputStatus } from "@/components/forms/Input/Input.constants";

export type InputProps = ComponentPropsWithRef<"input"> & {
	leadingIcon?: ReactNode;
	trailingIcon?: ReactNode;
	status?: InputStatus;
};

const baseClasses =
	"flex h-11 items-center gap-3 rounded-lg border bg-white px-4 text-sm text-neutral-900 [&>:not(input)]:shrink-0 [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:text-neutral-900";

/* A status keeps its border on focus, so focus is shown by a ring instead. */
const statusFocusClasses =
	"focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink-blue-500";

const statusClasses: Record<InputStatus, string> = {
	success: `border-success-600 ${statusFocusClasses}`,
	error: `border-error-600 ${statusFocusClasses}`,
};

const neutralClasses = "border-neutral-400 focus-within:border-ink-blue-900";

/*
 * Follows the native input's disabled state, so a disabled fieldset counts as
 * well as the `disabled` prop. `:has()` outranks the status and focus-within
 * rules, which keeps disabled above status above focus.
 */
const disabledClasses =
	"has-[>input:disabled]:cursor-not-allowed has-[>input:disabled]:border-neutral-400 has-[>input:disabled]:bg-neutral-200 has-[>input:disabled]:text-neutral-500 has-[>input:disabled]:outline-none has-[>input:disabled]:[&_svg]:text-neutral-500";

export const Input = ({
	"aria-invalid": ariaInvalid,
	className,
	leadingIcon,
	trailingIcon,
	status,
	...rest
}: InputProps): FunctionComponent => (
	<div
		className={joinClassNames(
			baseClasses,
			status ? statusClasses[status] : neutralClasses,
			disabledClasses,
			className
		)}
	>
		{leadingIcon}
		<input
			aria-invalid={ariaInvalid ?? (status === "error" ? true : undefined)}
			className="min-w-0 flex-1 border-0 bg-transparent outline-hidden placeholder:text-neutral-500 disabled:cursor-not-allowed"
			{...rest}
		/>
		{trailingIcon}
	</div>
);
