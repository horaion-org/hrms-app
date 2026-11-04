import { useContext } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { TickIcon } from "@/components/ui/Icon";
import { StepContext } from "@/components/ui/Stepper/Stepper.context";

export type StepperStepProps = {
	label: string;
	/**
	 * Whether the step's work is done, e.g. from its data. Without it, every
	 * step before the current one counts as completed. The current step never
	 * shows a tick.
	 */
	completed?: boolean;
};

/** The circle's look: filled for the current step, ink once passed, neutral ahead. */
const circleClasses = {
	current: "border-ink-blue-900 bg-ink-blue-900 text-white",
	before: "border-ink-blue-900 text-ink-blue-900",
	after: "border-neutral-300 text-neutral-500",
} as const;

const labelClasses = {
	current: "text-ink-blue-900",
	before: "text-neutral-900",
	after: "text-neutral-500",
} as const;

export const StepperStep = ({
	label,
	completed,
}: StepperStepProps): FunctionComponent => {
	const { t } = useTranslation();
	const step = useContext(StepContext);
	if (!step) throw new Error("StepperStep must be rendered inside Stepper");
	const isCurrent = step.position === "current";
	const isTicked = !isCurrent && (completed ?? step.position === "before");
	const isClickable = step.position === "before" && !!step.onStepClick;
	const isLabelVisibleInNarrow =
		isCurrent || (step.position === "before" && step.isLast);
	const Content = isClickable ? "button" : "span";
	const accessibleName = t(
		isTicked ? "stepper.completedStep" : "stepper.step",
		{
			number: step.index + 1,
			label,
		}
	);

	return (
		<li
			aria-current={isCurrent ? "step" : undefined}
			aria-label={isClickable ? undefined : accessibleName}
			className={joinClassNames(
				"flex items-center @2xl/stepper:min-w-0",
				isLabelVisibleInNarrow && "min-w-0",
				!step.isLast && "flex-auto"
			)}
		>
			<Content
				aria-label={isClickable ? accessibleName : undefined}
				type={isClickable ? "button" : undefined}
				className={joinClassNames(
					"flex min-w-12 items-center gap-2 @2xl/stepper:gap-5",
					isClickable &&
						"group/step cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-blue-500"
				)}
				onClick={
					isClickable ? (): void => step.onStepClick?.(step.index) : undefined
				}
			>
				<span
					aria-hidden="true"
					className={joinClassNames(
						"flex size-12 shrink-0 items-center justify-center rounded-full border text-xl",
						circleClasses[step.position],
						isClickable &&
							"transition-colors group-hover/step:border-ink-blue-500 group-hover/step:text-ink-blue-500 group-active/step:border-ink-blue-300 group-active/step:text-ink-blue-300"
					)}
				>
					{isTicked ? (
						<TickIcon aria-hidden="true" className="size-6" />
					) : (
						step.index + 1
					)}
				</span>
				<span
					aria-hidden="true"
					className={joinClassNames(
						"min-w-0 truncate text-base font-semibold",
						!isLabelVisibleInNarrow && "hidden @2xl/stepper:inline",
						labelClasses[step.position],
						isClickable &&
							"transition-colors group-hover/step:text-ink-blue-500 group-active/step:text-ink-blue-300"
					)}
				>
					{label}
				</span>
			</Content>
			{!step.isLast && (
				<span
					aria-hidden="true"
					className={joinClassNames(
						"mx-1 h-px min-w-px flex-1 @2xl/stepper:mx-3",
						step.position === "before" ? "bg-ink-blue-900" : "bg-neutral-300"
					)}
				/>
			)}
		</li>
	);
};
