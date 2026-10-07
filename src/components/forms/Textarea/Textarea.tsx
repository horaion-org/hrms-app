import type { ComponentPropsWithRef } from "react";
import type { FunctionComponent } from "@/common/types";
import { joinClassNames } from "@/common/joinClassNames";
import type { InputStatus } from "@/components/forms/Input";

export type TextareaProps = ComponentPropsWithRef<"textarea"> & {
	status?: InputStatus;
};

export const Textarea = ({
	className,
	status,
	"aria-invalid": ariaInvalid,
	...props
}: TextareaProps): FunctionComponent => (
	<textarea
		aria-invalid={ariaInvalid ?? (status === "error" ? true : undefined)}
		className={joinClassNames(
			"min-h-35 w-full resize-y rounded-lg border bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-blue-500 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-500",
			status === "error"
				? "border-error-600"
				: status === "success"
					? "border-success-600"
					: "border-neutral-400",
			className
		)}
		{...props}
	/>
);
