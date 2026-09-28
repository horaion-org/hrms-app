import type { FunctionComponent } from "@/common/types";
import { Input, type InputProps } from "@/components/forms/Input";

type AuthFieldProps = InputProps & {
	id: string;
	label: string;
	hint?: string;
	error?: string;
	hideLabel?: boolean;
};
export const AuthField = ({
	id,
	label,
	hint,
	error,
	hideLabel = false,
	...props
}: AuthFieldProps): FunctionComponent => (
	<div className={hideLabel ? undefined : "space-y-3"}>
		<label
			htmlFor={id}
			className={
				hideLabel ? "sr-only" : "block text-base leading-5 text-neutral-800"
			}
		>
			{label}
		</label>
		<Input
			aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
			id={id}
			status={error ? "error" : undefined}
			{...props}
		/>
		{error && (
			<p className="text-sm text-error-700" id={`${id}-error`} role="alert">
				{error}
			</p>
		)}
		{!error && hint && (
			<p className="text-sm text-slate-500" id={`${id}-hint`}>
				{hint}
			</p>
		)}
	</div>
);
