import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { MinusIcon, PlusIcon } from "@/components/ui/Icon";

export type NumberStepperProps = {
	/** What is being counted, e.g. "Prep Cook"; names the group and its buttons. */
	label: string;
	value: number;
	onChange: (value: number) => void;
	min?: number;
	max?: number;
	disabled?: boolean;
	className?: string;
};

const buttonClasses =
	"flex size-10 items-center justify-center bg-white text-neutral-900 not-disabled:cursor-pointer not-disabled:hover:bg-neutral-100 focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink-blue-500 disabled:text-neutral-400 [&_svg]:size-4";

/** A whole number changed one step at a time with minus and plus buttons. */
export const NumberStepper = ({
	label,
	value,
	onChange,
	min = 0,
	max = Number.POSITIVE_INFINITY,
	disabled = false,
	className,
}: NumberStepperProps): FunctionComponent => {
	const { t } = useTranslation();

	return (
		<div
			aria-label={label}
			role="group"
			className={joinClassNames(
				"inline-flex h-10 shrink-0 divide-x divide-neutral-400 overflow-hidden rounded-lg border border-neutral-400 bg-white",
				className
			)}
		>
			<button
				aria-label={t("numberStepper.decrease", { label })}
				className={buttonClasses}
				disabled={disabled || value <= min}
				type="button"
				onClick={() => {
					onChange(Math.max(min, value - 1));
				}}
			>
				<MinusIcon />
			</button>
			<output
				aria-live="polite"
				className="flex w-10 items-center justify-center text-sm font-bold text-neutral-900"
			>
				{value}
			</output>
			<button
				aria-label={t("numberStepper.increase", { label })}
				className={buttonClasses}
				disabled={disabled || value >= max}
				type="button"
				onClick={() => {
					onChange(Math.min(max, value + 1));
				}}
			>
				<PlusIcon />
			</button>
		</div>
	);
};
