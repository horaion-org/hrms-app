import { useId, type ComponentPropsWithRef } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";

export type CheckboxProps = Omit<ComponentPropsWithRef<"input">, "type"> & {
	label: string;
};

/** A native checkbox with its visible label; `className` styles the row. */
export const Checkbox = ({
	label,
	className,
	id,
	...rest
}: CheckboxProps): FunctionComponent => {
	const generatedId = useId();
	const inputId = id ?? generatedId;

	return (
		<div className={joinClassNames("flex items-center gap-2", className)}>
			<input
				className="size-4 shrink-0 cursor-pointer accent-ink-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
				id={inputId}
				type="checkbox"
				{...rest}
			/>
			<label
				className="cursor-pointer text-sm text-neutral-900"
				htmlFor={inputId}
			>
				{label}
			</label>
		</div>
	);
};
