import type { ComponentPropsWithRef, ReactNode } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import type {
	ButtonSize,
	ButtonVariant,
} from "@/components/ui/Button/Button.constants";

type LabelledButtonProps = {
	variant?: Exclude<ButtonVariant, "icon">;
	/** Only applies to the pill variants (`primary` and `secondary`). */
	size?: ButtonSize;
	leadingIcon?: ReactNode;
	trailingIcon?: ReactNode;
	/**
	 * Shows a spinner in place of the leading icon and blocks presses while an
	 * action runs. The button stays in the tab order's disabled state and
	 * reports `aria-busy`.
	 */
	loading?: boolean;
};

type IconButtonProps = {
	variant: "icon";
	size?: never;
	leadingIcon?: never;
	trailingIcon?: never;
	loading?: never;
} & ({ "aria-label": string } | { "aria-labelledby": string });

export type ButtonProps = ComponentPropsWithRef<"button"> &
	(LabelledButtonProps | IconButtonProps);

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
	icon: "size-9 shrink-0 rounded bg-transparent text-neutral-900 enabled:hover:text-ink-blue-700 enabled:active:text-ink-blue-500 disabled:text-neutral-400 [&_svg]:size-4 [&_svg]:shrink-0",
};

const sizeClasses: Record<ButtonSize, string> = {
	lg: "h-14 gap-3 text-base [&_svg]:size-5.5",
	sm: "h-12 gap-3 text-sm [&_svg]:size-5.5",
};

const Spinner = (): FunctionComponent => (
	<svg
		aria-hidden="true"
		className="animate-spin"
		data-testid="button-spinner"
		fill="none"
		viewBox="0 0 24 24"
	>
		<circle
			className="opacity-25"
			cx="12"
			cy="12"
			r="10"
			stroke="currentColor"
			strokeWidth="3"
		/>
		<path
			className="opacity-75"
			d="M22 12a10 10 0 0 0-10-10"
			stroke="currentColor"
			strokeLinecap="round"
			strokeWidth="3"
		/>
	</svg>
);

const isPill = (variant: ButtonVariant): boolean =>
	variant === "primary" || variant === "secondary";

export const Button = ({
	variant = "primary",
	size = "lg",
	leadingIcon,
	trailingIcon,
	loading = false,
	className,
	type = "button",
	disabled,
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
		<button
			aria-busy={loading || undefined}
			className={classes}
			disabled={disabled ?? loading}
			type={type}
			{...rest}
		>
			{loading ? <Spinner /> : leadingIcon}
			{children}
			{trailingIcon}
		</button>
	);
};
