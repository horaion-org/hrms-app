import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import type { ProgressBarTone } from "@/components/ui/ProgressBar/ProgressBar.constants";

export type ProgressBarProps = {
	/** Percent complete, 0 to 100; values outside are clamped. */
	value: number;
	/** What is being measured, e.g. "Coverage". */
	label: string;
	tone?: ProgressBarTone;
	/** "white" sits the bar on a tinted surface, such as a Dashboard tile. */
	track?: "neutral" | "white";
	className?: string;
};

const fillClasses: Record<ProgressBarTone, string> = {
	brand: "bg-ink-blue-700",
	accent: "bg-ink-blue-300",
	success: "bg-success-600",
	warning: "bg-warning-600",
	error: "bg-error-600",
};

/** A thin horizontal bar showing how far a figure is towards 100%. */
export const ProgressBar = ({
	value,
	label,
	tone = "brand",
	track = "neutral",
	className,
}: ProgressBarProps): FunctionComponent => {
	const percent = Math.min(100, Math.max(0, value));
	return (
		<div
			aria-label={label}
			aria-valuemax={100}
			aria-valuemin={0}
			aria-valuenow={percent}
			role="progressbar"
			className={joinClassNames(
				"h-1.5 overflow-hidden rounded-full",
				track === "white" ? "bg-white" : "bg-neutral-300",
				className
			)}
		>
			<div
				className={joinClassNames("h-full rounded-full", fillClasses[tone])}
				style={{ width: `${percent}%` }}
			/>
		</div>
	);
};
