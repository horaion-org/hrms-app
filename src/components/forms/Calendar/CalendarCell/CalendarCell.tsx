import type { ComponentPropsWithRef } from "react";
import type { FunctionComponent } from "@/common/types";
import { joinClassNames } from "@/common/joinClassNames";
import type { RangePosition } from "@/components/forms/Calendar/Calendar.constants";

export type CalendarCellProps = Omit<
	ComponentPropsWithRef<"button">,
	"disabled"
> & {
	selected?: boolean;
	rangePosition?: RangePosition;
	rangePreview?: boolean;
	today?: boolean;
	weekend?: boolean;
	outsideMonth?: boolean;
	disabled?: boolean;
};

export const CalendarCell = ({
	selected = false,
	rangePosition,
	rangePreview = false,
	today = false,
	weekend = false,
	outsideMonth = false,
	disabled = false,
	className,
	children,
	onClick,
	...rest
}: CalendarCellProps): FunctionComponent => (
	<button
		{...rest}
		aria-current={today ? "date" : undefined}
		aria-disabled={disabled || undefined}
		aria-selected={selected}
		data-range={rangePosition}
		data-range-preview={rangePreview || undefined}
		role="gridcell"
		type="button"
		className={joinClassNames(
			"h-9 min-w-9 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ink-blue-500",
			rangePosition === "middle"
				? "rounded-none bg-ink-blue-50"
				: rangePosition === "start"
					? "rounded-l"
					: rangePosition === "end"
						? "rounded-r"
						: "rounded",
			disabled
				? "cursor-not-allowed text-neutral-400"
				: "cursor-pointer hover:bg-porcelain-50 hover:text-neutral-900 active:bg-porcelain-500 active:text-white",
			!disabled &&
				(rangePosition !== "middle" && (selected || rangePosition)
					? "bg-ink-blue-900 text-white"
					: outsideMonth
						? "text-neutral-400"
						: weekend
							? "text-ink-blue-500"
							: "text-neutral-900"),
			today &&
				"underline decoration-ink-blue-500 decoration-2 underline-offset-4",
			className
		)}
		onClick={(event) => {
			if (!disabled) onClick?.(event);
		}}
	>
		{children}
	</button>
);
