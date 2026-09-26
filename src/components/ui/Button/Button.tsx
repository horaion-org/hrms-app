import type { ComponentPropsWithRef, ReactNode } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import type { ButtonSize, ButtonVariant } from "./Button.constants";

export type ButtonProps = ComponentPropsWithRef<"button"> & {
	variant?: ButtonVariant;
	/** Only applies to the pill variants (`primary` and `secondary`). */
	size?: ButtonSize;
	leadingIcon?: ReactNode;
	trailingIcon?: ReactNode;
};

const baseClasses =
	"inline-flex items-center justify-center font-medium whitespace-nowrap transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-blue-500 disabled:cursor-not-allowed";

const pillClasses = "rounded-full px-6 [&_svg]:shrink-0";

const variantClasses: Record<ButtonVariant, string> = {
	primary:
		"bg-ink-blue-700 text-white enabled:hover:bg-ink-blue-500 enabled:active:bg-ink-blue-300 disabled:bg-neutral-400 disabled:text-neutral-500",
	secondary:
		"border border-neutral-500 bg-white text-neutral-900 enabled:hover:text-ink-blue-700 enabled:active:text-ink-blue-500 disabled:text-neutral-300",
	textlink:
		"gap-2 text-sm text-ink-blue-700 enabled:hover:text-ink-blue-500 enabled:active:text-ink-blue-300 disabled:text-neutral-400 [&_svg]:size-4 [&_svg]:shrink-0",
	hyperlink:
		"gap-2 text-base text-ink-blue-700 underline underline-offset-4 enabled:hover:text-ink-blue-500 enabled:active:text-ink-blue-300 disabled:text-neutral-400 [&_svg]:size-4 [&_svg]:shrink-0",
};

const sizeClasses: Record<ButtonSize, string> = {
	lg: "h-14 gap-3 text-base [&_svg]:size-5.5",
	sm: "h-12 gap-3 text-sm [&_svg]:size-5.5",
};

const isPill = (variant: ButtonVariant): boolean =>
	variant === "primary" || variant === "secondary";

export const Button = ({
	variant = "primary",
	size = "lg",
	leadingIcon,
	trailingIcon,
	className,
	type = "button",
	children,
	...rest
}: ButtonProps): FunctionComponent => {
	const classes = joinClassNames(
		baseClasses,
		variantClasses[variant],
		isPill(variant) ? `${pillClasses} ${sizeClasses[size]}` : undefined,
		className
	);

	return (
		<button className={classes} type={type} {...rest}>
			{leadingIcon}
			{children}
			{trailingIcon}
		</button>
	);
};
