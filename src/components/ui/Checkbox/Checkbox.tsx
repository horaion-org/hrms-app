import { Description, Field, Input, Label } from "@headlessui/react";
import { useId, type InputHTMLAttributes } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";

type CheckboxProps = Omit<
	InputHTMLAttributes<HTMLInputElement>,
	"className" | "id" | "type"
> & {
	label: string;
	/** Keeps the label for assistive technology only, e.g. in a table cell. */
	hideLabel?: boolean;
	/** Shows the mixed state, e.g. for a select-all box over a partial selection. */
	indeterminate?: boolean;
	/** Classes for the wrapper holding the box and its label. */
	className?: string;
	/** Classes for the label's text, e.g. a heavier weight for a group's box. */
	labelClassName?: string;
	/** A line under the label saying what the choice does; also describes the box. */
	description?: string;
};

export const Checkbox = ({
	label,
	hideLabel = false,
	indeterminate = false,
	className,
	labelClassName,
	description,
	...rest
}: CheckboxProps): FunctionComponent => {
	const id = useId();
	const labelElement = (
		<Label
			htmlFor={id}
			className={joinClassNames(
				"text-base leading-6 text-slate-900",
				hideLabel && "sr-only",
				labelClassName
			)}
		>
			{label}
		</Label>
	);

	return (
		<Field
			className={joinClassNames(
				"flex gap-2",
				description === undefined ? "items-center" : "items-start",
				className
			)}
		>
			<Input
				// `indeterminate` exists only as a DOM property, never as an attribute.
				ref={(input: HTMLInputElement | null) => {
					if (input) input.indeterminate = indeterminate;
				}}
				id={id}
				type="checkbox"
				className={joinClassNames(
					"size-4 shrink-0 accent-ink-blue-900 disabled:opacity-50",
					description !== undefined && "mt-1"
				)}
				{...rest}
			/>
			{description === undefined ? (
				labelElement
			) : (
				<div className="flex min-w-0 flex-col gap-2">
					{labelElement}
					<Description className="text-xs text-neutral-800">
						{description}
					</Description>
				</div>
			)}
		</Field>
	);
};
