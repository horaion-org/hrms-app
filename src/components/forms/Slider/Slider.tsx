import type { ComponentPropsWithRef, CSSProperties } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";

export type SliderProps = Omit<
	ComponentPropsWithRef<"input">,
	"type" | "value" | "defaultValue" | "onChange" | "min" | "max" | "step"
> & {
	value: number;
	onChange: (value: number) => void;
	min?: number;
	max?: number;
	step?: number;
};

const thumbClasses =
	"[&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-ink-blue-500 disabled:[&::-webkit-slider-thumb]:bg-neutral-400 [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-ink-blue-500 disabled:[&::-moz-range-thumb]:bg-neutral-400";

/**
 * A native range control: its track fills up to the chosen value, and the
 * browser provides the slider role, its value and keyboard operation (arrow
 * keys, Page Up/Down, Home and End). Name it as other controls are, through
 * `aria-label` or a label's `htmlFor`, and set `aria-valuetext` when the
 * number alone doesn't say enough, e.g. "8 out of 10".
 */
export const Slider = ({
	value,
	onChange,
	min = 0,
	max = 100,
	step = 1,
	className,
	style,
	...rest
}: SliderProps): FunctionComponent => {
	const fill = max > min ? ((value - min) / (max - min)) * 100 : 0;
	return (
		<input
			max={max}
			min={min}
			step={step}
			style={{ ...style, "--slider-fill": `${fill}%` } as CSSProperties}
			type="range"
			value={value}
			className={joinClassNames(
				"h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[linear-gradient(to_right,var(--color-ink-blue-500)_var(--slider-fill),var(--color-neutral-200)_var(--slider-fill))] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-blue-500 disabled:cursor-not-allowed disabled:bg-[linear-gradient(to_right,var(--color-neutral-400)_var(--slider-fill),var(--color-neutral-200)_var(--slider-fill))]",
				thumbClasses,
				className
			)}
			onChange={(event) => {
				onChange(Number(event.target.value));
			}}
			{...rest}
		/>
	);
};
