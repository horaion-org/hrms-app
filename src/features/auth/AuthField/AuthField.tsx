import type { FunctionComponent } from "@/common/types";
import { Input, type InputProps } from "@/components/forms/Input";
import {
	PasswordInput,
	type PasswordInputProps,
} from "@/components/forms/PasswordInput";

export type AuthFieldProps = InputProps & {
	id: string;
	label: string;
	hint?: string;
	error?: string;
	hideLabel?: boolean;
	toggleLabels?: PasswordInputProps["toggleLabels"];
};
export const AuthField = ({
	id,
	label,
	hint,
	error,
	hideLabel = false,
	type,
	toggleLabels,
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
		{type === "password" ? (
			<PasswordInput
				id={id}
				status={error ? "error" : undefined}
				toggleLabels={toggleLabels}
				aria-describedby={
					error ? `${id}-error` : hint ? `${id}-hint` : undefined
				}
				{...props}
			/>
		) : (
			<Input
				id={id}
				status={error ? "error" : undefined}
				type={type}
				aria-describedby={
					error ? `${id}-error` : hint ? `${id}-hint` : undefined
				}
				{...props}
			/>
		)}
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
