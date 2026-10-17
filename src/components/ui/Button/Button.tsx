import { Link, type LinkProps } from "@tanstack/react-router";
import type { ComponentPropsWithRef, ReactNode } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import type {
	ButtonSize,
	ButtonVariant,
} from "@/components/ui/Button/Button.constants";

type LabelledButtonProps = {
	variant?: "primary" | "secondary";
	loading?: boolean;
	/** Only applies to the pill variants (`primary` and `secondary`). */
	size?: ButtonSize;
	leadingIcon?: ReactNode;
	trailingIcon?: ReactNode;
};

type IdleLabelledButtonProps = Omit<
	LabelledButtonProps,
	"variant" | "loading"
> & {
	variant?: Exclude<ButtonVariant, "icon">;
	loading?: never;
};

type IconButtonProps = {
	variant: "icon";
	loading?: never;
	size?: never;
	leadingIcon?: never;
	trailingIcon?: never;
} & ({ "aria-label": string } | { "aria-labelledby": string });

type ButtonElementProps = ComponentPropsWithRef<"button"> & { to?: never };

/** Given `to`, the Button renders as a router link styled the same way. */
type LinkElementProps = Omit<
	ComponentPropsWithRef<"a">,
	keyof LinkProps | "children"
> &
	Omit<LinkProps, "children" | "to" | "disabled"> & {
		to: NonNullable<LinkProps["to"]>;
		children?: ReactNode;
		disabled?: never;
		type?: never;
	};

export type ButtonProps = (ButtonElementProps | LinkElementProps) &
	(LabelledButtonProps | IdleLabelledButtonProps | IconButtonProps);

const baseClasses =
	"inline-flex cursor-pointer items-center justify-center font-medium whitespace-nowrap transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-blue-500 disabled:cursor-not-allowed";

const pillClasses = "rounded-full px-6 [&_svg]:shrink-0";

const variantClasses: Record<ButtonVariant, string> = {
	primary:
		"bg-ink-blue-700 text-white not-disabled:hover:bg-ink-blue-500 not-disabled:active:bg-ink-blue-300 disabled:bg-neutral-400 disabled:text-neutral-500",
	secondary:
		"border border-neutral-500 bg-white text-neutral-900 not-disabled:hover:text-ink-blue-700 not-disabled:active:text-ink-blue-500 disabled:text-neutral-300",
	textlink:
		"gap-2 text-sm text-ink-blue-700 not-disabled:hover:text-ink-blue-500 not-disabled:active:text-ink-blue-300 disabled:text-neutral-400 [&_svg]:size-4 [&_svg]:shrink-0",
	hyperlink:
		"gap-2 text-base text-ink-blue-700 underline underline-offset-4 not-disabled:hover:text-ink-blue-500 not-disabled:active:text-ink-blue-300 disabled:text-neutral-400 [&_svg]:size-4 [&_svg]:shrink-0",
	icon: "size-9 shrink-0 rounded bg-transparent text-neutral-900 not-disabled:hover:text-ink-blue-700 not-disabled:active:text-ink-blue-500 disabled:text-neutral-400 [&_svg]:size-4 [&_svg]:shrink-0",
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
	loading = false,
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
		loading ? "relative" : undefined,
		className
	);

	const spinner = (
		<span
			aria-hidden="true"
			className="absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin"
		/>
	);

	const content = (
		<>
			{loading ? (
				leadingIcon ? (
					<span className="relative inline-flex shrink-0">
						<span aria-hidden="true" className="invisible inline-flex">
							{leadingIcon}
						</span>
						{spinner}
					</span>
				) : (
					<span className="relative inline-flex size-5.5 shrink-0">
						{spinner}
					</span>
				)
			) : (
				leadingIcon
			)}
			{children}
			{trailingIcon}
		</>
	);

	if (rest.to !== undefined)
		return (
			<Link
				{...rest}
				aria-busy={loading || rest["aria-busy"]}
				aria-disabled={loading || rest["aria-disabled"]}
				className={classes}
				disabled={loading}
				onClick={loading ? undefined : rest.onClick}
			>
				{content}
			</Link>
		);

	return (
		<button
			{...rest}
			aria-busy={loading || rest["aria-busy"]}
			aria-disabled={loading || rest["aria-disabled"]}
			className={classes}
			disabled={loading || rest.disabled}
			type={type}
		>
			{content}
		</button>
	);
};
