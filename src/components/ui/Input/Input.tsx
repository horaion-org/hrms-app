import { useId, type InputHTMLAttributes } from "react";
import type { FunctionComponent } from "@/common/types";

type InputProps = Omit<
	InputHTMLAttributes<HTMLInputElement>,
	"className" | "id"
> & {
	label: string;
	error?: string;
	hint?: string;
};

const FIELD =
	"block w-full rounded-md border-0 px-3 py-2 text-sm text-slate-900 " +
	"ring-1 ring-inset placeholder:text-slate-400 focus:ring-2 " +
	"focus:ring-inset focus:ring-slate-900 disabled:bg-slate-50";

export const Input = ({
	label,
	error,
	hint,
	...rest
}: InputProps): FunctionComponent => {
	const id = useId();
	const invalid = error !== undefined;
	const describedBy = invalid ? `${id}-error` : `${id}-hint`;
	const hasDescription = invalid || hint !== undefined;
	const ring = invalid ? "ring-red-500" : "ring-slate-300";

	return (
		<div className="space-y-1">
			<label className="block text-sm font-medium text-slate-900" htmlFor={id}>
				{label}
			</label>
			<input
				aria-describedby={hasDescription ? describedBy : undefined}
				aria-invalid={invalid ? true : undefined}
				className={`${FIELD} ${ring}`}
				id={id}
				{...rest}
			/>
			{invalid ? (
				<p className="text-sm text-red-600" id={`${id}-error`}>
					{error}
				</p>
			) : null}
			{!invalid && hint !== undefined ? (
				<p className="text-sm text-slate-500" id={`${id}-hint`}>
					{hint}
				</p>
			) : null}
		</div>
	);
};
