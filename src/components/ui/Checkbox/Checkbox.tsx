import { Field, Input, Label } from "@headlessui/react";
import { useId, type InputHTMLAttributes } from "react";
import type { FunctionComponent } from "@/common/types";

type CheckboxProps = Omit<
	InputHTMLAttributes<HTMLInputElement>,
	"className" | "id" | "type"
> & {
	label: string;
};

export const Checkbox = ({
	label,
	...rest
}: CheckboxProps): FunctionComponent => {
	const id = useId();

	return (
		<Field className="flex items-center gap-2">
			<Input
				className="size-4 shrink-0 accent-ink-blue-900 disabled:opacity-50"
				id={id}
				type="checkbox"
				{...rest}
			/>
			<Label className="text-base leading-6 text-slate-900" htmlFor={id}>
				{label}
			</Label>
		</Field>
	);
};
