import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { FunctionComponent } from "@/common/types";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "small" | "medium";

type ButtonProps = Omit<
	ButtonHTMLAttributes<HTMLButtonElement>,
	"className"
> & {
	variant?: ButtonVariant;
	size?: ButtonSize;
	loading?: boolean;
	/** Stretches the button to its container, as forms want. */
	fullWidth?: boolean;
	children: ReactNode;
};

const BASE =
	"inline-flex items-center justify-center gap-2 rounded-md font-medium " +
	"transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 " +
	"focus-visible:outline-slate-900 disabled:cursor-not-allowed " +
	"disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
	primary: "bg-slate-900 text-white hover:bg-slate-700",
	secondary:
		"bg-white text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50",
	danger: "bg-red-600 text-white hover:bg-red-500",
	ghost: "text-slate-700 hover:bg-slate-100",
};

const SIZES: Record<ButtonSize, string> = {
	small: "px-2.5 py-1.5 text-xs",
	medium: "px-3 py-2 text-sm",
};

export const Button = ({
	variant = "primary",
	size = "medium",
	loading = false,
	fullWidth = false,
	disabled = false,
	type = "button",
	children,
	...rest
}: ButtonProps): FunctionComponent => {
	return (
		<button
			disabled={disabled || loading}
			type={type}
			className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${
				fullWidth ? "w-full" : ""
			}`}
			{...rest}
		>
			{loading ? (
				<span
					aria-hidden="true"
					className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
				/>
			) : null}
			{children}
		</button>
	);
};
